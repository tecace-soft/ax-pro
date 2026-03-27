import type {
  ApproveAndSaveRequestBody,
  ApproveAndSaveValidatedPayload,
  OntologySourceType,
} from '../types/ontology.ts';
import { ONTOLOGY_SOURCE_TYPES } from '../types/ontology.ts';
import { normalizeOntologyGraphBundle } from '../utils/ontologyGraphNormalize.ts';

const MAX_GROUP_ID_LEN = 256;
const MAX_CREATED_BY_LEN = 512;
const MAX_SOURCE_TEXT_LEN = 100_000;
const MAX_EXTERNAL_FEEDBACK_ID_LEN = 512;

export type ApproveAndSaveValidationResult =
  | { ok: true; value: ApproveAndSaveValidatedPayload }
  | { ok: false; errors: string[] };

function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isAllowedSourceType(v: string): v is OntologySourceType {
  return (ONTOLOGY_SOURCE_TYPES as readonly string[]).includes(v);
}

/**
 * Validate and normalize reviewed ontology payload before persistence.
 * Business logic intentionally lives in service layer (not route handlers).
 */
export function validateApproveAndSaveBody(body: unknown): ApproveAndSaveValidationResult {
  if (!isObject(body)) return { ok: false, errors: ['Body must be a JSON object'] };

  const o = body as ApproveAndSaveRequestBody & Record<string, unknown>;
  const errors: string[] = [];

  const group_id = typeof o.group_id === 'string' ? o.group_id.trim() : '';
  if (!group_id) errors.push('group_id is required (non-empty string)');
  else if (group_id.length > MAX_GROUP_ID_LEN) {
    errors.push(`group_id must be at most ${MAX_GROUP_ID_LEN} characters`);
  }

  const source_type = typeof o.source_type === 'string' ? o.source_type.trim() : '';
  if (!source_type) errors.push('source_type is required (non-empty string)');
  else if (!isAllowedSourceType(source_type)) {
    errors.push(
      `source_type must be one of: ${ONTOLOGY_SOURCE_TYPES.join(', ')} (received "${source_type}")`
    );
  }

  const source_text = typeof o.source_text === 'string' ? o.source_text.trim() : '';
  if (!source_text) errors.push('source_text is required (non-empty string)');
  else if (source_text.length > MAX_SOURCE_TEXT_LEN) {
    errors.push(`source_text must be at most ${MAX_SOURCE_TEXT_LEN} characters`);
  }

  const created_by = typeof o.created_by === 'string' ? o.created_by.trim() : '';
  if (!created_by) errors.push('created_by is required (non-empty string)');
  else if (created_by.length > MAX_CREATED_BY_LEN) {
    errors.push(`created_by must be at most ${MAX_CREATED_BY_LEN} characters`);
  }

  const external_feedback_id =
    typeof o.external_feedback_id === 'string' ? o.external_feedback_id.trim() : undefined;
  if (external_feedback_id && external_feedback_id.length > MAX_EXTERNAL_FEEDBACK_ID_LEN) {
    errors.push(`external_feedback_id must be at most ${MAX_EXTERNAL_FEEDBACK_ID_LEN} characters`);
  }

  if (!Array.isArray(o.entities)) {
    errors.push('entities is required (array)');
  }

  if (errors.length > 0) return { ok: false, errors };

  const bundle = normalizeOntologyGraphBundle({
    entities: Array.isArray(o.entities) ? o.entities : [],
    aliases: Array.isArray(o.aliases) ? o.aliases : [],
    relationships: Array.isArray(o.relationships) ? o.relationships : [],
    properties: Array.isArray(o.properties) ? o.properties : [],
  });

  const rejectedWarnings = bundle.rejected.map(
    (r) => `Dropped ${r.component}[${r.index}]: ${r.reason}`
  );
  const incomingWarnings =
    Array.isArray(o.warnings) && o.warnings.every((w) => typeof w === "string")
      ? o.warnings.map((w) => w.trim()).filter(Boolean)
      : [];

  const metadata = isObject(o.metadata) ? o.metadata : {};

  return {
    ok: true,
    value: {
      group_id,
      source_type: source_type as OntologySourceType,
      source_text,
      created_by,
      entities: bundle.entities,
      aliases: bundle.aliases,
      relationships: bundle.relationships,
      properties: bundle.properties,
      warnings: [...incomingWarnings, ...bundle.warnings, ...rejectedWarnings],
      ...(external_feedback_id ? { external_feedback_id } : {}),
      metadata,
    },
  };
}

