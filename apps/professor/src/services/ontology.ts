export interface OntologyExtractPreviewRequest {
  group_id: string;
  source_type:
    | 'admin_feedback'
    | 'document'
    | 'manual'
    | 'manual_entry'
    | 'chat_transcript';
  source_text: string;
  created_by: string;
}

export interface OntologyPreviewEntity {
  id: string;
  label: string;
  entity_type: string;
  description?: string;
}

export interface OntologyPreviewAlias {
  entity_id: string;
  alias: string;
  confidence?: number;
}

export interface OntologyPreviewRelationship {
  id: string;
  subject_entity_id: string;
  relation_type: string;
  object_entity_id: string;
  notes?: string;
}

export interface OntologyPreviewProperty {
  entity_id: string;
  key: string;
  value: string;
  value_type?: 'string' | 'number' | 'boolean' | 'date';
}

export interface OntologyExtractPreviewResponse {
  source_text: string;
  entities: OntologyPreviewEntity[];
  aliases: OntologyPreviewAlias[];
  relationships: OntologyPreviewRelationship[];
  properties: OntologyPreviewProperty[];
  warnings: string[];
  meta: {
    group_id: string;
    source_type: string;
    created_by: string;
    extraction_mode: 'openai';
  };
}

export interface OntologyApproveAndSaveRequest {
  group_id: string;
  source_type: OntologyExtractPreviewRequest['source_type'];
  source_text: string;
  created_by: string;
  entities: OntologyPreviewEntity[];
  aliases: OntologyPreviewAlias[];
  relationships: OntologyPreviewRelationship[];
  properties: OntologyPreviewProperty[];
  warnings?: string[];
}

export interface OntologyApproveAndSaveResponse {
  source_id: string;
  created: {
    entities: Array<{ client_entity_id: string; entity_id: string }>;
    aliases: string[];
    relationships: Array<{ client_relationship_id?: string; relationship_id: string }>;
    properties: string[];
  };
  linked_existing: {
    entities: Array<{ client_entity_id: string; entity_id: string; canonical_name: string }>;
  };
  skipped_duplicate: {
    aliases: Array<{ alias: string; entity_id: string }>;
    relationships: Array<{ subject_entity_id: string; relation_type: string; object_entity_id: string }>;
    properties: Array<{ entity_id: string; key: string; value: string }>;
  };
  conflict: {
    entities: Array<{ client_entity_id: string; canonical_name: string; reason: string }>;
    aliases: Array<{ alias: string; requested_entity_id: string; existing_entity_id: string }>;
    properties: Array<{ entity_id: string; key: string; existing_value: string; requested_value: string }>;
  };
  warnings: string[];
}

export interface OntologyRequestAuthContext {
  userId?: string;
  userEmail?: string;
  groupRole?: 'admin' | 'user' | null;
  groupId?: string;
}

export class OntologyApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'OntologyApiError';
  }
}

function formatOntologyFailureMessage(
  status: number,
  data: unknown,
  fallback: string
): string {
  if (!data || typeof data !== 'object') return fallback;
  const d = data as Record<string, unknown>;
  const err = typeof d.error === 'string' ? d.error : fallback;
  const missing = d.missingEnv;
  if (
    status === 503 &&
    Array.isArray(missing) &&
    missing.length > 0 &&
    missing.every((x) => typeof x === 'string')
  ) {
    return `${err} — add to apps/professor/.env and restart the server: ${missing.join(', ')}`;
  }
  return err;
}

function ontologyHeaders(authContext?: OntologyRequestAuthContext): Record<string, string> {
  const extraHeaders: Record<string, string> = {};
  if (authContext?.groupRole) extraHeaders['x-ax-group-role'] = authContext.groupRole;
  if (authContext?.userId) extraHeaders['x-ax-user-id'] = authContext.userId;
  if (authContext?.userEmail) extraHeaders['x-ax-user-email'] = authContext.userEmail;
  if (authContext?.groupId) extraHeaders['x-ax-group-id'] = authContext.groupId;
  return extraHeaders;
}

/** Mirrors server enums for saved-ontology filters. */
export const ONTOLOGY_ENTITY_TYPES_OPTIONS = [
  'benefit',
  'provider',
  'policy',
  'event',
  'system',
  'department',
  'form',
  'term',
  'person',
] as const;

export const ONTOLOGY_RELATION_TYPES_OPTIONS = [
  'provided_by',
  'uses_system',
  'managed_by',
  'requires_form',
  'part_of',
  'related_to',
  'occurs_on',
  'has_contact',
] as const;

export interface OntologyListResponse {
  group_id: string;
  include_deprecated: boolean;
  items: Record<string, unknown>[];
  count: number;
}

/** List row `id` may be uuid string or int8 serialized as number (PostgREST / JSON). */
export function normalizeOntologyId(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const s = raw.trim();
    return s ? s : null;
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(Math.trunc(raw));
  }
  if (typeof raw === 'bigint') {
    return raw.toString();
  }
  return null;
}

async function ontologyGet(pathWithQuery: string, authContext?: OntologyRequestAuthContext): Promise<OntologyListResponse> {
  const res = await fetch(pathWithQuery, {
    method: 'GET',
    credentials: 'include',
    headers: ontologyHeaders(authContext),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = formatOntologyFailureMessage(res.status, data, 'Request failed');
    throw new OntologyApiError(res.status, message, data);
  }
  return data as OntologyListResponse;
}

export async function fetchOntologyEntitiesList(
  params: { group_id: string; q?: string; entity_type?: string; include_deprecated?: boolean },
  authContext?: OntologyRequestAuthContext
): Promise<OntologyListResponse> {
  const sp = new URLSearchParams({ group_id: params.group_id });
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.entity_type?.trim()) sp.set('entity_type', params.entity_type.trim());
  if (params.include_deprecated) sp.set('include_deprecated', 'true');
  return ontologyGet(`/api/ontology/entities?${sp.toString()}`, authContext);
}

export async function fetchOntologyAliasesList(
  params: { group_id: string; q?: string; include_deprecated?: boolean },
  authContext?: OntologyRequestAuthContext
): Promise<OntologyListResponse> {
  const sp = new URLSearchParams({ group_id: params.group_id });
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.include_deprecated) sp.set('include_deprecated', 'true');
  return ontologyGet(`/api/ontology/aliases?${sp.toString()}`, authContext);
}

export async function fetchOntologyRelationshipsList(
  params: { group_id: string; relation_type?: string; include_deprecated?: boolean },
  authContext?: OntologyRequestAuthContext
): Promise<OntologyListResponse> {
  const sp = new URLSearchParams({ group_id: params.group_id });
  if (params.relation_type?.trim()) sp.set('relation_type', params.relation_type.trim());
  if (params.include_deprecated) sp.set('include_deprecated', 'true');
  return ontologyGet(`/api/ontology/relationships?${sp.toString()}`, authContext);
}

export async function fetchOntologyPropertiesList(
  params: { group_id: string; q?: string; include_deprecated?: boolean },
  authContext?: OntologyRequestAuthContext
): Promise<OntologyListResponse> {
  const sp = new URLSearchParams({ group_id: params.group_id });
  if (params.q?.trim()) sp.set('q', params.q.trim());
  if (params.include_deprecated) sp.set('include_deprecated', 'true');
  return ontologyGet(`/api/ontology/properties?${sp.toString()}`, authContext);
}

export interface EntityDeleteImpactResponse {
  group_id: string;
  entity_id: string;
  cascade: {
    aliases: number;
    relationships: number;
    properties: number;
  };
}

export async function fetchEntityDeleteImpact(
  params: { group_id: string; entity_id: string },
  authContext?: OntologyRequestAuthContext
): Promise<EntityDeleteImpactResponse> {
  const sp = new URLSearchParams({ group_id: params.group_id, entity_id: params.entity_id });
  const res = await fetch(`/api/ontology/entity-delete-impact?${sp.toString()}`, {
    method: 'GET',
    credentials: 'include',
    headers: ontologyHeaders(authContext),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = formatOntologyFailureMessage(res.status, data, 'Failed to load delete impact');
    throw new OntologyApiError(res.status, message, data);
  }
  return data as EntityDeleteImpactResponse;
}

export type OntologyDeleteResource = 'entity' | 'alias' | 'relationship' | 'property';

export async function deleteOntologySavedRow(
  payload: { resource: OntologyDeleteResource; group_id: string; id: unknown },
  authContext?: OntologyRequestAuthContext
): Promise<{ deleted: true }> {
  const id = normalizeOntologyId(payload.id);
  if (!id) {
    throw new OntologyApiError(400, 'Invalid or missing id', undefined);
  }
  const res = await fetch('/api/ontology/delete', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...ontologyHeaders(authContext) },
    body: JSON.stringify({ resource: payload.resource, group_id: payload.group_id, id }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = formatOntologyFailureMessage(res.status, data, 'Delete failed');
    throw new OntologyApiError(res.status, message, data);
  }
  return data as { deleted: true };
}

/**
 * POST /api/ontology/extract-preview
 */
export async function extractOntologyPreview(
  payload: OntologyExtractPreviewRequest,
  authContext?: OntologyRequestAuthContext
): Promise<OntologyExtractPreviewResponse> {
  const res = await fetch('/api/ontology/extract-preview', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...ontologyHeaders(authContext) },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = formatOntologyFailureMessage(res.status, data, 'Extract preview request failed');
    throw new OntologyApiError(res.status, message, data);
  }

  return data as OntologyExtractPreviewResponse;
}

/**
 * POST /api/ontology/approve-and-save
 */
export async function approveAndSaveOntology(
  payload: OntologyApproveAndSaveRequest,
  authContext?: OntologyRequestAuthContext
): Promise<OntologyApproveAndSaveResponse> {
  const res = await fetch('/api/ontology/approve-and-save', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...ontologyHeaders(authContext) },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = formatOntologyFailureMessage(res.status, data, 'Approve and save failed');
    throw new OntologyApiError(res.status, message, data);
  }

  return data as OntologyApproveAndSaveResponse;
}
