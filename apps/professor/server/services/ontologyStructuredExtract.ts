/**
 * OpenAI structured extraction for HR admin-feedback ontology (server-only).
 * Prompt and JSON schema are exported for documentation and tests.
 */

import { getOntologyServerEnv } from '../config/ontologyEnv.ts';
import {
  ONTOLOGY_ENTITY_TYPES,
  ONTOLOGY_RELATION_TYPES,
  type OntologyExtractPreviewRequest,
  type OntologyExtractPreviewResponse,
} from '../types/ontology.ts';
import { normalizeOntologyGraphBundle } from '../utils/ontologyGraphNormalize.ts';

/** System instructions — HR admin feedback → ontology (no fabrication). */
export const ONTOLOGY_HR_ADMIN_FEEDBACK_SYSTEM_PROMPT = `You are an ontology extraction assistant for HR AX Pro. Administrators submit feedback text about the assistant, products, policies, or internal HR concepts.

Your job is to extract a structured ontology graph that will be reviewed by humans before any save.

STRICT RULES (safety and accuracy):
1. ONLY include entities, relationships, properties, and aliases that are EXPLICITLY stated in the source_text or are direct, unambiguous paraphrases of what is stated. Do NOT invent benefits, vendors, policy details, deadlines, systems, forms, departments, or contacts that are not grounded in the text.
2. If something is vague, speculative, or only guessed, OMIT that item entirely and add a short explanation to model_warnings (e.g. "Omitted possible vendor X — not explicitly named in feedback").
3. Prefer fewer, correct items over completeness. Empty arrays are valid when the text has no extractable structure.
4. Use ONLY these entity_type values (lowercase, exactly): ${ONTOLOGY_ENTITY_TYPES.join(', ')}.
5. Use ONLY these relation_type values (snake_case, exactly): ${ONTOLOGY_RELATION_TYPES.join(', ')}.
6. entity id: stable kebab-case slug unique in this response (e.g. "pto-policy-q1", "hris-workday"). Must match across relationships, aliases, and properties.
7. Labels should be short human-readable titles derived from the text, not generic placeholders.
8. For properties: only attach facts clearly tied to an entity in the text. Use value_type "string" unless the value is clearly numeric, boolean, or a date.
9. For aliases: extract explicit abbreviations/acronyms and expansions. If text says patterns like "X stands for Y", "Y (X)", or "X = Y", create an alias record so X and Y are connected to the same entity. Prefer the long-form phrase as entity label and short-form acronym as alias when both exist.
10. For relationships: subject_entity_id and object_entity_id MUST be ids of entities you output in entities[]. relation_type must express a link that the text supports (e.g. benefit provided_by provider).
11. model_warnings: list any caveats, omissions due to uncertainty, or truncation notes. If nothing to warn, use an empty array.

Output MUST conform to the provided JSON schema only. No markdown, no commentary outside JSON.`;

/**
 * OpenAI Chat Completions `response_format.json_schema` payload (strict structured outputs).
 * Enum lists are fixed to match {@link ONTOLOGY_ENTITY_TYPES} and {@link ONTOLOGY_RELATION_TYPES}.
 */
export function buildOntologyExtractionJsonSchema(): {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
} {
  return {
    name: 'hr_admin_feedback_ontology',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        model_warnings: {
          type: 'array',
          description: 'Omissions, uncertainty, or safety notes — never invent facts.',
          items: { type: 'string' },
        },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique kebab-case id in this extraction.' },
              label: { type: 'string' },
              entity_type: { type: 'string', enum: [...ONTOLOGY_ENTITY_TYPES] },
              description: {
                type: 'string',
                description: 'Short phrase grounded in source; use empty string if none.',
              },
            },
            required: ['id', 'label', 'entity_type', 'description'],
            additionalProperties: false,
          },
        },
        aliases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity_id: { type: 'string' },
              alias: { type: 'string' },
              confidence: {
                type: 'number',
                description: '0–1; lower when paraphrase is weaker.',
              },
            },
            required: ['entity_id', 'alias', 'confidence'],
            additionalProperties: false,
          },
        },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              subject_entity_id: { type: 'string' },
              relation_type: { type: 'string', enum: [...ONTOLOGY_RELATION_TYPES] },
              object_entity_id: { type: 'string' },
              notes: { type: 'string', description: 'Evidence snippet or empty string.' },
            },
            required: ['id', 'subject_entity_id', 'relation_type', 'object_entity_id', 'notes'],
            additionalProperties: false,
          },
        },
        properties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              entity_id: { type: 'string' },
              key: { type: 'string', description: 'Snake_case or natural; server normalizes to snake_case.' },
              value: { type: 'string' },
              value_type: {
                type: 'string',
                enum: ['string', 'number', 'boolean', 'date'],
              },
            },
            required: ['entity_id', 'key', 'value', 'value_type'],
            additionalProperties: false,
          },
        },
      },
      required: ['model_warnings', 'entities', 'aliases', 'relationships', 'properties'],
      additionalProperties: false,
    },
  };
}

interface LlmOntologyPayload {
  model_warnings: string[];
  entities: unknown[];
  aliases: unknown[];
  relationships: unknown[];
  properties: unknown[];
}

function parseJsonFromAssistantContent(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Assistant did not return valid JSON');
  }
}

/** Coerces loose json_object responses; json_schema path should already be well-formed. */
function coerceLlmOntologyPayload(raw: unknown): LlmOntologyPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const mw = Array.isArray(o.model_warnings)
    ? o.model_warnings.filter((w): w is string => typeof w === 'string')
    : [];
  return {
    model_warnings: mw,
    entities: Array.isArray(o.entities) ? o.entities : [],
    aliases: Array.isArray(o.aliases) ? o.aliases : [],
    relationships: Array.isArray(o.relationships) ? o.relationships : [],
    properties: Array.isArray(o.properties) ? o.properties : [],
  };
}

async function openAiChatCompletionsJson(
  apiKey: string,
  model: string,
  body: Record<string, unknown>
): Promise<{ content: string; rawStatus: number }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    const errMsg =
      (data.error as { message?: string } | undefined)?.message ||
      `OpenAI HTTP ${res.status}`;
    throw new Error(errMsg);
  }

  console.log('[ontology/extract] OpenAI full JSON response:\n', JSON.stringify(data, null, 2));

  const choices = data.choices as Array<{ message?: { content?: string | null } }> | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('OpenAI response missing message content');
  }

  return { content, rawStatus: res.status };
}

/**
 * Calls OpenAI with structured JSON schema, then validates/normalizes via {@link normalizeOntologyGraphBundle}.
 */
export async function extractOntologyPreviewWithOpenAI(
  input: OntologyExtractPreviewRequest
): Promise<OntologyExtractPreviewResponse> {
  const { openaiApiKey: apiKey, openaiModel: model } = getOntologyServerEnv();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const userPayload = {
    group_id: input.group_id,
    source_type: input.source_type,
    created_by: input.created_by,
    source_text: input.source_text,
  };

  const jsonSchema = buildOntologyExtractionJsonSchema();

  const requestBody = {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system', content: ONTOLOGY_HR_ADMIN_FEEDBACK_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Extract the ontology from this admin feedback JSON:\n${JSON.stringify(userPayload)}`,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: jsonSchema,
    },
  };

  let content: string;
  let usedJsonObjectFallback = false;
  try {
    const out = await openAiChatCompletionsJson(apiKey, model, requestBody);
    content = out.content;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const maybeSchema =
      /json_schema|response_format|structured/i.test(msg) ||
      msg.includes('Invalid schema');
    if (!maybeSchema) throw e;

    usedJsonObjectFallback = true;
    const fallbackBody = {
      model,
      temperature: 0.1,
      messages: [
        ...requestBody.messages,
        {
          role: 'user',
          content:
            'Return a single JSON object with keys model_warnings (string array), entities, aliases, relationships, properties as defined in the system instructions. Make sure acronym/abbreviation mappings (e.g., "BLG stands for business leading group") appear in aliases. No markdown.',
        },
      ],
      response_format: { type: 'json_object' },
    };
    const out = await openAiChatCompletionsJson(apiKey, model, fallbackBody);
    content = out.content;
  }

  const parsed = parseJsonFromAssistantContent(content);
  const payload = coerceLlmOntologyPayload(parsed);
  if (!payload) {
    throw new Error('OpenAI JSON root must be an object');
  }

  const modelWarnings = payload.model_warnings.map((w) => w.trim()).filter(Boolean);

  const bundle = normalizeOntologyGraphBundle({
    entities: payload.entities,
    aliases: payload.aliases,
    relationships: payload.relationships,
    properties: payload.properties,
  });

  const rejectedWarnings = bundle.rejected.map(
    (r) => `Dropped ${r.component}[${r.index}]: ${r.reason}`
  );

  const warnings = [
    ...(usedJsonObjectFallback
      ? ['OpenAI json_schema response_format was unavailable; used json_object fallback.']
      : []),
    ...modelWarnings,
    ...bundle.warnings,
    ...rejectedWarnings,
  ];

  return {
    source_text: input.source_text,
    entities: bundle.entities,
    aliases: bundle.aliases,
    relationships: bundle.relationships,
    properties: bundle.properties,
    warnings,
    meta: {
      group_id: input.group_id,
      source_type: input.source_type,
      created_by: input.created_by,
      extraction_mode: 'openai',
    },
  };
}
