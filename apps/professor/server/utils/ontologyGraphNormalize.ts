import {
  ONTOLOGY_ENTITY_TYPES,
  ONTOLOGY_RELATION_TYPES,
  type OntologyEntityType,
  type OntologyPreviewAlias,
  type OntologyPreviewEntity,
  type OntologyPreviewProperty,
  type OntologyPreviewRelationship,
} from '../types/ontology.ts';

const ENTITY_TYPE_SET = new Set<string>(ONTOLOGY_ENTITY_TYPES);
const RELATION_TYPE_SET = new Set<string>(ONTOLOGY_RELATION_TYPES);

const MAX_RELATION_TYPE_LEN = 256;

const DEFAULT_ENTITY_TYPE: OntologyEntityType = 'term';

const VALUE_TYPES = new Set(['string', 'number', 'boolean', 'date']);

export interface OntologyGraphNormalizeRejected {
  component: 'entity' | 'alias' | 'relationship' | 'property';
  index: number;
  reason: string;
}

export interface NormalizeOntologyEntityResult {
  accepted: boolean;
  value?: OntologyPreviewEntity;
  warnings: string[];
  rejectReason?: string;
}

export interface NormalizeOntologyAliasResult {
  accepted: boolean;
  value?: OntologyPreviewAlias;
  warnings: string[];
  rejectReason?: string;
}

export interface NormalizeOntologyRelationshipResult {
  accepted: boolean;
  value?: OntologyPreviewRelationship;
  warnings: string[];
  rejectReason?: string;
}

export interface NormalizeOntologyPropertyResult {
  accepted: boolean;
  value?: OntologyPreviewProperty;
  warnings: string[];
  rejectReason?: string;
}

export interface NormalizeOntologyGraphBundleInput {
  entities: unknown[];
  aliases?: unknown[];
  relationships?: unknown[];
  properties?: unknown[];
}

export interface NormalizeOntologyGraphBundleResult {
  entities: OntologyPreviewEntity[];
  aliases: OntologyPreviewAlias[];
  relationships: OntologyPreviewRelationship[];
  properties: OntologyPreviewProperty[];
  warnings: string[];
  rejected: OntologyGraphNormalizeRejected[];
}

/** Trim outer whitespace only (internal spaces preserved for labels/values). */
export function trimOntologyString(s: string): string {
  return s.trim();
}

/**
 * Lowercase snake_case: non-alphanumeric runs → single underscore, trimmed.
 */
export function toSnakeCaseLower(input: string): string {
  const t = input.trim().toLowerCase();
  if (!t) return '';
  return t
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Maps input to an allowed entity_type, or null if unknown.
 */
export function normalizeEntityType(raw: string | undefined | null): OntologyEntityType | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = toSnakeCaseLower(raw);
  if (!s) return null;
  return ENTITY_TYPE_SET.has(s) ? (s as OntologyEntityType) : null;
}

/**
 * Maps input to a known snake_case relation_type, or null if not in the canonical enum.
 * Free-form strings are accepted in {@link normalizeOntologyRelationship} without requiring this.
 */
export function normalizeRelationType(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = toSnakeCaseLower(raw);
  if (!s) return null;
  return RELATION_TYPE_SET.has(s) ? s : null;
}

/**
 * Normalizes a property key to snake_case; returns null if empty or invalid identifier.
 */
export function normalizePropertyKey(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const s = toSnakeCaseLower(raw);
  if (!s) return null;
  if (!/^[a-z][a-z0-9_]*$/.test(s)) return null;
  return s;
}

function readStringField(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string') {
      const t = trimOntologyString(v);
      if (t) return t;
    }
  }
  return undefined;
}

function readOptionalTrimmedString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string') {
      const t = trimOntologyString(v);
      return t || undefined;
    }
  }
  return undefined;
}

/**
 * Validates and normalizes one entity record (extraction or save payloads).
 */
export function normalizeOntologyEntity(raw: unknown, index: number): NormalizeOntologyEntityResult {
  const warnings: string[] = [];
  const prefix = `entities[${index}]`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix} must be a non-array object`,
    };
  }

  const o = raw as Record<string, unknown>;
  const id = readStringField(o, ['id']);
  const label = readStringField(o, ['label']);

  if (!id) {
    return { accepted: false, warnings, rejectReason: `${prefix}.id is required` };
  }
  if (!label) {
    return { accepted: false, warnings, rejectReason: `${prefix}.label is required` };
  }
  if (id.length > 512) {
    return { accepted: false, warnings, rejectReason: `${prefix}.id exceeds max length` };
  }
  if (label.length > 2000) {
    warnings.push(`${prefix}.label is unusually long (${label.length} chars)`);
  }

  const typeRaw =
    readOptionalTrimmedString(o, ['entity_type', 'entityType', 'kind', 'type']) ?? undefined;
  let entity_type: OntologyEntityType;
  if (!typeRaw) {
    entity_type = DEFAULT_ENTITY_TYPE;
    warnings.push(`${prefix}: entity_type missing; defaulted to "${DEFAULT_ENTITY_TYPE}"`);
  } else {
    const mapped = normalizeEntityType(typeRaw);
    if (!mapped) {
      return {
        accepted: false,
        warnings,
        rejectReason: `${prefix}.entity_type "${typeRaw}" is not an allowed value`,
      };
    }
    entity_type = mapped;
    if (typeRaw !== entity_type && toSnakeCaseLower(typeRaw) === entity_type) {
      warnings.push(`${prefix}: entity_type normalized from "${typeRaw}" to "${entity_type}"`);
    }
  }

  const description = readOptionalTrimmedString(o, ['description', 'desc']);

  return {
    accepted: true,
    value: {
      id,
      label,
      entity_type,
      ...(description !== undefined ? { description } : {}),
    },
    warnings,
  };
}

/**
 * Validates and normalizes one alias record. Unknown entity_id rejects when knownIds is provided.
 */
export function normalizeOntologyAlias(
  raw: unknown,
  index: number,
  knownEntityIds: ReadonlySet<string>
): NormalizeOntologyAliasResult {
  const warnings: string[] = [];
  const prefix = `aliases[${index}]`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix} must be a non-array object`,
    };
  }

  const o = raw as Record<string, unknown>;
  const entity_id = readStringField(o, ['entity_id', 'entityId']);
  const alias = readStringField(o, ['alias', 'name', 'text']);

  if (!entity_id) {
    return { accepted: false, warnings, rejectReason: `${prefix}.entity_id is required` };
  }
  if (!alias) {
    return { accepted: false, warnings, rejectReason: `${prefix}.alias is required` };
  }
  if (alias.length > 500) {
    warnings.push(`${prefix}.alias is unusually long`);
  }

  if (knownEntityIds.size > 0 && !knownEntityIds.has(entity_id)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}: entity_id "${entity_id}" is not a known entity`,
    };
  }

  let confidence: number | undefined;
  if (o.confidence !== undefined && o.confidence !== null) {
    if (typeof o.confidence !== 'number' || Number.isNaN(o.confidence)) {
      warnings.push(`${prefix}: confidence is not a number; omitted`);
    } else if (o.confidence < 0 || o.confidence > 1) {
      warnings.push(`${prefix}: confidence ${o.confidence} outside [0,1]; omitted`);
    } else {
      confidence = o.confidence;
    }
  }

  return {
    accepted: true,
    value: {
      entity_id,
      alias,
      ...(confidence !== undefined ? { confidence } : {}),
    },
    warnings,
  };
}

function readRelationTypeRaw(o: Record<string, unknown>): string | undefined {
  return readOptionalTrimmedString(o, ['relation_type', 'relationType', 'predicate', 'type']);
}

/**
 * Validates and normalizes one relationship record.
 */
export function normalizeOntologyRelationship(
  raw: unknown,
  index: number,
  knownEntityIds: ReadonlySet<string>
): NormalizeOntologyRelationshipResult {
  const warnings: string[] = [];
  const prefix = `relationships[${index}]`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix} must be a non-array object`,
    };
  }

  const o = raw as Record<string, unknown>;
  let id = readStringField(o, ['id']);
  if (!id) {
    id = `synthetic-rel-${index}`;
    warnings.push(`${prefix}: id missing; using "${id}"`);
  }

  const subject_entity_id = readStringField(o, [
    'subject_entity_id',
    'subjectEntityId',
    'from_entity_id',
    'fromEntityId',
    'source_entity_id',
  ]);
  const object_entity_id = readStringField(o, [
    'object_entity_id',
    'objectEntityId',
    'to_entity_id',
    'toEntityId',
    'target_entity_id',
  ]);

  const typeRaw = readRelationTypeRaw(o);
  if (!typeRaw) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.relation_type (or predicate) is required`,
    };
  }

  const relation_type = trimOntologyString(typeRaw);
  if (!relation_type) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.relation_type (or predicate) cannot be empty`,
    };
  }
  if (relation_type.length > MAX_RELATION_TYPE_LEN) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.relation_type must be at most ${MAX_RELATION_TYPE_LEN} characters`,
    };
  }

  if (!subject_entity_id) {
    return { accepted: false, warnings, rejectReason: `${prefix}.subject_entity_id is required` };
  }
  if (!object_entity_id) {
    return { accepted: false, warnings, rejectReason: `${prefix}.object_entity_id is required` };
  }

  if (knownEntityIds.size > 0) {
    if (!knownEntityIds.has(subject_entity_id)) {
      return {
        accepted: false,
        warnings,
        rejectReason: `${prefix}: subject_entity_id "${subject_entity_id}" is not a known entity`,
      };
    }
    if (!knownEntityIds.has(object_entity_id)) {
      return {
        accepted: false,
        warnings,
        rejectReason: `${prefix}: object_entity_id "${object_entity_id}" is not a known entity`,
      };
    }
  }

  const notes = readOptionalTrimmedString(o, ['notes', 'note']);

  return {
    accepted: true,
    value: {
      id,
      subject_entity_id,
      relation_type,
      object_entity_id,
      ...(notes !== undefined ? { notes } : {}),
    },
    warnings,
  };
}

/**
 * Validates and normalizes one property record.
 */
export function normalizeOntologyProperty(
  raw: unknown,
  index: number,
  knownEntityIds: ReadonlySet<string>
): NormalizeOntologyPropertyResult {
  const warnings: string[] = [];
  const prefix = `properties[${index}]`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix} must be a non-array object`,
    };
  }

  const o = raw as Record<string, unknown>;
  const entity_id = readStringField(o, ['entity_id', 'entityId']);
  const keyRaw =
    readOptionalTrimmedString(o, ['key', 'property_key', 'propertyKey', 'name']) ?? undefined;
  const valueRaw = o.value;

  if (!entity_id) {
    return { accepted: false, warnings, rejectReason: `${prefix}.entity_id is required` };
  }
  if (!keyRaw) {
    return { accepted: false, warnings, rejectReason: `${prefix}.key (or property_key) is required` };
  }

  const key = normalizePropertyKey(keyRaw);
  if (!key) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.key "${keyRaw}" could not be normalized to a valid snake_case key`,
    };
  }
  if (keyRaw !== key) {
    warnings.push(`${prefix}: property key normalized from "${keyRaw}" to "${key}"`);
  }

  let value: string;
  if (typeof valueRaw === 'string') {
    value = trimOntologyString(valueRaw);
  } else if (typeof valueRaw === 'number' && !Number.isNaN(valueRaw)) {
    value = String(valueRaw);
    warnings.push(`${prefix}: value was numeric; coerced to string`);
  } else if (typeof valueRaw === 'boolean') {
    value = valueRaw ? 'true' : 'false';
    warnings.push(`${prefix}: value was boolean; coerced to string`);
  } else {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.value must be a string (or coercible number/boolean)`,
    };
  }

  if (!value) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}.value is empty after trim`,
    };
  }

  if (knownEntityIds.size > 0 && !knownEntityIds.has(entity_id)) {
    return {
      accepted: false,
      warnings,
      rejectReason: `${prefix}: entity_id "${entity_id}" is not a known entity`,
    };
  }

  let value_type: OntologyPreviewProperty['value_type'];
  const vt = o.value_type ?? o.valueType;
  if (vt !== undefined && vt !== null) {
    if (typeof vt !== 'string' || !VALUE_TYPES.has(vt)) {
      warnings.push(`${prefix}: invalid value_type "${String(vt)}"; omitted`);
    } else {
      value_type = vt as OntologyPreviewProperty['value_type'];
    }
  }

  return {
    accepted: true,
    value: {
      entity_id,
      key,
      value,
      ...(value_type !== undefined ? { value_type } : {}),
    },
    warnings,
  };
}

/**
 * Normalizes a full extraction/save bundle: entities first, then dependent rows against accepted entity ids.
 */
export function normalizeOntologyGraphBundle(
  input: NormalizeOntologyGraphBundleInput
): NormalizeOntologyGraphBundleResult {
  const warnings: string[] = [];
  const rejected: OntologyGraphNormalizeRejected[] = [];
  const entities: OntologyPreviewEntity[] = [];
  const seenIds = new Set<string>();

  const entityList = Array.isArray(input.entities) ? input.entities : [];
  if (!Array.isArray(input.entities)) {
    warnings.push('entities was not an array; treated as empty');
  }

  for (let i = 0; i < entityList.length; i++) {
    const r = normalizeOntologyEntity(entityList[i], i);
    warnings.push(...r.warnings);
    if (!r.accepted || !r.value) {
      if (r.rejectReason) rejected.push({ component: 'entity', index: i, reason: r.rejectReason });
      continue;
    }
    if (seenIds.has(r.value.id)) {
      rejected.push({
        component: 'entity',
        index: i,
        reason: `entities[${i}].id "${r.value.id}" duplicates an earlier entity`,
      });
      continue;
    }
    seenIds.add(r.value.id);
    entities.push(r.value);
  }

  const knownIds = new Set(seenIds);

  const aliases: OntologyPreviewAlias[] = [];
  const aliasList = Array.isArray(input.aliases) ? input.aliases : [];
  if (input.aliases !== undefined && !Array.isArray(input.aliases)) {
    warnings.push('aliases was not an array; treated as empty');
  }
  for (let i = 0; i < aliasList.length; i++) {
    const r = normalizeOntologyAlias(aliasList[i], i, knownIds);
    warnings.push(...r.warnings);
    if (!r.accepted || !r.value) {
      if (r.rejectReason) rejected.push({ component: 'alias', index: i, reason: r.rejectReason });
      continue;
    }
    aliases.push(r.value);
  }

  const relationships: OntologyPreviewRelationship[] = [];
  const relList = Array.isArray(input.relationships) ? input.relationships : [];
  if (input.relationships !== undefined && !Array.isArray(input.relationships)) {
    warnings.push('relationships was not an array; treated as empty');
  }
  for (let i = 0; i < relList.length; i++) {
    const r = normalizeOntologyRelationship(relList[i], i, knownIds);
    warnings.push(...r.warnings);
    if (!r.accepted || !r.value) {
      if (r.rejectReason) {
        rejected.push({ component: 'relationship', index: i, reason: r.rejectReason });
      }
      continue;
    }
    relationships.push(r.value);
  }

  const properties: OntologyPreviewProperty[] = [];
  const propList = Array.isArray(input.properties) ? input.properties : [];
  if (input.properties !== undefined && !Array.isArray(input.properties)) {
    warnings.push('properties was not an array; treated as empty');
  }
  for (let i = 0; i < propList.length; i++) {
    const r = normalizeOntologyProperty(propList[i], i, knownIds);
    warnings.push(...r.warnings);
    if (!r.accepted || !r.value) {
      if (r.rejectReason) {
        rejected.push({ component: 'property', index: i, reason: r.rejectReason });
      }
      continue;
    }
    properties.push(r.value);
  }

  return { entities, aliases, relationships, properties, warnings, rejected };
}
