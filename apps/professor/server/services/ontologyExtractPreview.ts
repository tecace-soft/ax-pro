import {
  ONTOLOGY_SOURCE_TYPES,
  type OntologyExtractPreviewRequest,
  type OntologySourceType,
} from '../types/ontology.ts';

const MAX_GROUP_ID_LEN = 256;
const MAX_CREATED_BY_LEN = 512;
const MAX_SOURCE_TEXT_LEN = 100_000;

export type ExtractPreviewValidationResult =
  | { ok: true; value: OntologyExtractPreviewRequest }
  | { ok: false; errors: string[] };

function isAllowedSourceType(v: string): v is OntologySourceType {
  return (ONTOLOGY_SOURCE_TYPES as readonly string[]).includes(v);
}

/**
 * Parse and validate POST /api/ontology/extract-preview body.
 */
export function validateOntologyExtractPreviewBody(body: unknown): ExtractPreviewValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Body must be a JSON object'] };
  }

  const o = body as Record<string, unknown>;

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

  const source_text = typeof o.source_text === 'string' ? o.source_text : '';
  if (!source_text.trim()) errors.push('source_text is required (non-empty string)');
  else if (source_text.length > MAX_SOURCE_TEXT_LEN) {
    errors.push(`source_text must be at most ${MAX_SOURCE_TEXT_LEN} characters`);
  }

  const created_by = typeof o.created_by === 'string' ? o.created_by.trim() : '';
  if (!created_by) errors.push('created_by is required (non-empty string)');
  else if (created_by.length > MAX_CREATED_BY_LEN) {
    errors.push(`created_by must be at most ${MAX_CREATED_BY_LEN} characters`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      group_id,
      source_type: source_type as OntologySourceType,
      source_text: source_text.trim(),
      created_by,
    },
  };
}