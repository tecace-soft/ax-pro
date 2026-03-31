import { getOntologySupabaseClient } from './ontologySupabase.ts';
import { parseOntologyId } from './ontologyDelete.ts';
import { ONTOLOGY_ENTITY_TYPES, type OntologyEntityType } from '../types/ontology.ts';

const MAX_RELATION_TYPE_LEN = 256;

const ONTOLOGY_PROPERTY_VALUE_TYPES = ['string', 'number', 'boolean', 'date'] as const;
const ONTOLOGY_ROW_STATUSES = ['active', 'deprecated'] as const;

export class OntologyCreateError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'OntologyCreateError';
    this.code = code;
    this.details = details;
  }
}

function canonicalFromDisplay(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function insertManualSource(
  group_id: string,
  created_by: string,
  source_text: string
): Promise<string> {
  const client = getOntologySupabaseClient()!;
  const { data, error } = await client
    .from('ontology_sources')
    .insert({
      group_id,
      source_type: 'manual_entry',
      source_text: source_text.slice(0, 50_000),
      created_by,
    })
    .select('id')
    .single();
  if (error) {
    throw new OntologyCreateError(error.message || 'Failed to insert ontology_sources', 'source_insert_failed', error);
  }
  const id = data && typeof data === 'object' ? parseOntologyId((data as { id?: unknown }).id) : null;
  if (!id) {
    throw new OntologyCreateError('Missing ontology_sources.id after insert', 'source_insert_missing_id');
  }
  return id;
}

async function assertEntityInGroup(group_id: string, entity_id: string): Promise<void> {
  const client = getOntologySupabaseClient()!;
  const { data, error } = await client
    .from('ontology_entities')
    .select('id')
    .eq('group_id', group_id)
    .eq('id', entity_id)
    .maybeSingle();
  if (error) {
    throw new OntologyCreateError(error.message || 'Entity lookup failed', 'entity_lookup_failed', error);
  }
  if (!data) {
    throw new OntologyCreateError('Entity not found for this group', 'entity_not_found');
  }
}

export type OntologyCreateResource = 'entity' | 'alias' | 'relationship' | 'property';

export async function applyOntologyCreate(
  resource: OntologyCreateResource,
  group_id: string,
  created_by: string,
  payload: Record<string, unknown>
): Promise<{ created: true; id: string }> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyCreateError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const source_label =
    resource === 'entity'
      ? 'Manual create: entity'
      : resource === 'alias'
        ? 'Manual create: alias'
        : resource === 'relationship'
          ? 'Manual create: relationship'
          : 'Manual create: property';
  const source_id = await insertManualSource(group_id, created_by, source_label);

  if (resource === 'entity') {
    const display_name = typeof payload.display_name === 'string' ? payload.display_name.trim() : '';
    if (!display_name) {
      throw new OntologyCreateError('display_name is required', 'invalid_payload');
    }
    const canonical = canonicalFromDisplay(display_name);
    if (!canonical) {
      throw new OntologyCreateError(
        'Display name must yield a non-empty canonical name (include letters or digits)',
        'invalid_payload'
      );
    }
    const entity_type = payload.entity_type;
    if (typeof entity_type !== 'string' || !(ONTOLOGY_ENTITY_TYPES as readonly string[]).includes(entity_type)) {
      throw new OntologyCreateError('Invalid or missing entity_type', 'invalid_payload');
    }
    let status: (typeof ONTOLOGY_ROW_STATUSES)[number] = 'active';
    if (payload.status != null) {
      if (typeof payload.status !== 'string' || !(ONTOLOGY_ROW_STATUSES as readonly string[]).includes(payload.status)) {
        throw new OntologyCreateError('Invalid status', 'invalid_payload');
      }
      status = payload.status as (typeof ONTOLOGY_ROW_STATUSES)[number];
    }
    let description: string | null = null;
    if (payload.description != null) {
      if (typeof payload.description !== 'string') {
        throw new OntologyCreateError('description must be a string', 'invalid_payload');
      }
      const d = payload.description.trim();
      description = d ? d : null;
    }

    const row = {
      group_id,
      source_id,
      canonical_name: canonical,
      display_name,
      entity_type: entity_type as OntologyEntityType,
      description,
      status,
    };
    const { data, error } = await client.from('ontology_entities').insert(row).select('id').single();
    if (error) {
      throw new OntologyCreateError(error.message || 'Failed to create entity', 'entity_insert_failed', error);
    }
    const id = data && typeof data === 'object' ? parseOntologyId((data as { id?: unknown }).id) : null;
    if (!id) {
      throw new OntologyCreateError('Missing id after entity insert', 'entity_insert_missing_id');
    }
    return { created: true, id };
  }

  if (resource === 'alias') {
    const entity_id = parseOntologyId(payload.entity_id);
    if (!entity_id) {
      throw new OntologyCreateError('entity_id is required', 'invalid_payload');
    }
    await assertEntityInGroup(group_id, entity_id);
    const alias_text = typeof payload.alias_text === 'string' ? payload.alias_text.trim() : '';
    if (!alias_text) {
      throw new OntologyCreateError('alias_text is required', 'invalid_payload');
    }
    let alias_language: string | null = null;
    if (payload.alias_language != null) {
      if (typeof payload.alias_language !== 'string') {
        throw new OntologyCreateError('alias_language must be a string', 'invalid_payload');
      }
      const a = payload.alias_language.trim();
      alias_language = a ? a : null;
    }
    let alias_type: string | null = null;
    if (payload.alias_type != null) {
      if (typeof payload.alias_type !== 'string') {
        throw new OntologyCreateError('alias_type must be a string', 'invalid_payload');
      }
      const t = payload.alias_type.trim();
      alias_type = t ? t : null;
    }

    const row = {
      group_id,
      source_id,
      entity_id,
      alias_text,
      alias_language,
      alias_type,
    };
    const { data, error } = await client.from('ontology_aliases').insert(row).select('id').single();
    if (error) {
      throw new OntologyCreateError(error.message || 'Failed to create alias', 'alias_insert_failed', error);
    }
    const id = data && typeof data === 'object' ? parseOntologyId((data as { id?: unknown }).id) : null;
    if (!id) {
      throw new OntologyCreateError('Missing id after alias insert', 'alias_insert_missing_id');
    }
    return { created: true, id };
  }

  if (resource === 'relationship') {
    const from_entity_id = parseOntologyId(payload.from_entity_id);
    const to_entity_id = parseOntologyId(payload.to_entity_id);
    if (!from_entity_id || !to_entity_id) {
      throw new OntologyCreateError('from_entity_id and to_entity_id are required', 'invalid_payload');
    }
    await assertEntityInGroup(group_id, from_entity_id);
    await assertEntityInGroup(group_id, to_entity_id);
    const relation_typeRaw = payload.relation_type;
    if (typeof relation_typeRaw !== 'string') {
      throw new OntologyCreateError('relation_type is required', 'invalid_payload');
    }
    const relation_type = relation_typeRaw.trim();
    if (!relation_type) {
      throw new OntologyCreateError('relation_type cannot be empty', 'invalid_payload');
    }
    if (relation_type.length > MAX_RELATION_TYPE_LEN) {
      throw new OntologyCreateError(
        `relation_type must be at most ${MAX_RELATION_TYPE_LEN} characters`,
        'invalid_payload'
      );
    }
    let status: (typeof ONTOLOGY_ROW_STATUSES)[number] = 'active';
    if (payload.status != null) {
      if (typeof payload.status !== 'string' || !(ONTOLOGY_ROW_STATUSES as readonly string[]).includes(payload.status)) {
        throw new OntologyCreateError('Invalid status', 'invalid_payload');
      }
      status = payload.status as (typeof ONTOLOGY_ROW_STATUSES)[number];
    }

    const row = {
      group_id,
      source_id,
      from_entity_id,
      to_entity_id,
      relation_type,
      status,
    };
    const { data, error } = await client.from('ontology_relationships').insert(row).select('id').single();
    if (error) {
      throw new OntologyCreateError(
        error.message || 'Failed to create relationship',
        'relationship_insert_failed',
        error
      );
    }
    const id = data && typeof data === 'object' ? parseOntologyId((data as { id?: unknown }).id) : null;
    if (!id) {
      throw new OntologyCreateError('Missing id after relationship insert', 'relationship_insert_missing_id');
    }
    return { created: true, id };
  }

  const entity_id = parseOntologyId(payload.entity_id);
  if (!entity_id) {
    throw new OntologyCreateError('entity_id is required', 'invalid_payload');
  }
  await assertEntityInGroup(group_id, entity_id);
  const property_key = typeof payload.property_key === 'string' ? payload.property_key.trim() : '';
  if (!property_key) {
    throw new OntologyCreateError('property_key is required', 'invalid_payload');
  }
  if (typeof payload.property_value_text !== 'string') {
    throw new OntologyCreateError('property_value_text is required', 'invalid_payload');
  }
  const property_value_text = payload.property_value_text;
  const value_type = payload.value_type;
  if (
    typeof value_type !== 'string' ||
    !(ONTOLOGY_PROPERTY_VALUE_TYPES as readonly string[]).includes(value_type)
  ) {
    throw new OntologyCreateError('Invalid or missing value_type', 'invalid_payload');
  }
  let status: (typeof ONTOLOGY_ROW_STATUSES)[number] = 'active';
  if (payload.status != null) {
    if (typeof payload.status !== 'string' || !(ONTOLOGY_ROW_STATUSES as readonly string[]).includes(payload.status)) {
      throw new OntologyCreateError('Invalid status', 'invalid_payload');
    }
    status = payload.status as (typeof ONTOLOGY_ROW_STATUSES)[number];
  }

  const row = {
    group_id,
    source_id,
    entity_id,
    property_key,
    property_value_text,
    value_type,
    status,
  };
  const { data, error } = await client.from('ontology_properties').insert(row).select('id').single();
  if (error) {
    throw new OntologyCreateError(error.message || 'Failed to create property', 'property_insert_failed', error);
  }
  const id = data && typeof data === 'object' ? parseOntologyId((data as { id?: unknown }).id) : null;
  if (!id) {
    throw new OntologyCreateError('Missing id after property insert', 'property_insert_missing_id');
  }
  return { created: true, id };
}
