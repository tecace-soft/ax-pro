/**
 * Types for HR AX Pro admin-feedback → ontology ingestion.
 * TODO(runtime-resolver): extend with resolver-facing snapshot / version ids when chat integrates.
 */

export interface AdminFeedbackOntologyContext {
  feedbackId?: string;
  messageId?: string;
  groupId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

/** Allowed values for POST /api/ontology/extract-preview */
export const ONTOLOGY_SOURCE_TYPES = [
  'admin_feedback',
  'document',
  'manual',
  'manual_entry',
  'chat_transcript',
] as const;

export type OntologySourceType = (typeof ONTOLOGY_SOURCE_TYPES)[number];

/**
 * POST /api/ontology/extract-preview — no persistence.
 */
export interface OntologyExtractPreviewRequest {
  group_id: string;
  source_type: OntologySourceType;
  source_text: string;
  created_by: string;
}

/** Lowercase ontology entity classification (normalization target). */
export const ONTOLOGY_ENTITY_TYPES = [
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

export type OntologyEntityType = (typeof ONTOLOGY_ENTITY_TYPES)[number];

/** Lowercase snake_case relation labels (normalization target). */
export const ONTOLOGY_RELATION_TYPES = [
  'provided_by',
  'uses_system',
  'managed_by',
  'requires_form',
  'part_of',
  'related_to',
  'occurs_on',
  'has_contact',
] as const;

export type OntologyRelationType = (typeof ONTOLOGY_RELATION_TYPES)[number];

export interface OntologyPreviewEntity {
  id: string;
  label: string;
  entity_type: OntologyEntityType;
  description?: string;
}

export interface OntologyPreviewAlias {
  entity_id: string;
  alias: string;
  /** 0–1 when from model; mock may omit */
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

/** Alias: same shape after graph normalization (extraction or save). */
export type NormalizedOntologyEntity = OntologyPreviewEntity;
export type NormalizedOntologyAlias = OntologyPreviewAlias;
export type NormalizedOntologyRelationship = OntologyPreviewRelationship;
export type NormalizedOntologyProperty = OntologyPreviewProperty;

/**
 * Structured preview returned to the client (OpenAI extraction + normalization).
 */
export interface OntologyExtractPreviewResponse {
  source_text: string;
  entities: OntologyPreviewEntity[];
  aliases: OntologyPreviewAlias[];
  relationships: OntologyPreviewRelationship[];
  properties: OntologyPreviewProperty[];
  warnings: string[];
  /** Echo / audit fields (safe, non-secret) */
  meta: {
    group_id: string;
    source_type: string;
    created_by: string;
    extraction_mode: 'openai';
  };
}

export interface OntologyConcept {
  id: string;
  label: string;
  description?: string;
  synonyms?: string[];
}

export interface OntologyRelation {
  fromConceptId: string;
  toConceptId: string;
  relationType: string;
  notes?: string;
}

export interface OntologyDraft {
  concepts: OntologyConcept[];
  relations: OntologyRelation[];
  sourceSummary?: string;
}

export interface ValidateOntologyDraftResult {
  valid: boolean;
  errors: string[];
  normalized: OntologyDraft | null;
}

export interface ApproveAndSaveRequestBody {
  group_id: string;
  source_type: OntologySourceType;
  source_text: string;
  created_by: string;
  entities: unknown[];
  aliases?: unknown[];
  relationships?: unknown[];
  properties?: unknown[];
  warnings?: string[];
  external_feedback_id?: string;
  metadata?: Record<string, unknown>;
}

export interface ApproveAndSaveValidatedPayload {
  group_id: string;
  source_type: OntologySourceType;
  source_text: string;
  created_by: string;
  entities: NormalizedOntologyEntity[];
  aliases: NormalizedOntologyAlias[];
  relationships: NormalizedOntologyRelationship[];
  properties: NormalizedOntologyProperty[];
  warnings: string[];
  external_feedback_id?: string;
  metadata: Record<string, unknown>;
}

export interface ApproveAndSavePersistenceResult {
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

export interface OntologyExtractionResult {
  raw: unknown;
  draft: OntologyDraft;
  model: string;
}

/** POST /api/ontology/resolve-query (n8n / runtime) */
export interface OntologyResolveQueryRequestBody {
  group_id: string;
  user_message: string;
}

/**
 * JSON bundle for LLM / workflow consumption (plain serializable objects).
 */
export interface OntologyResolverPayload {
  schema_version: 1;
  group_id: string;
  entities: Record<string, unknown>[];
  aliases: Record<string, unknown>[];
  properties: Record<string, unknown>[];
  relationships: Record<string, unknown>[];
}

export interface OntologyResolveQueryResponse {
  group_id: string;
  has_relevant_ontology: boolean;
  matched_entities: Record<string, unknown>[];
  matched_aliases: Record<string, unknown>[];
  related_properties: Record<string, unknown>[];
  related_relationships: Record<string, unknown>[];
  ontology_payload: OntologyResolverPayload;
}
