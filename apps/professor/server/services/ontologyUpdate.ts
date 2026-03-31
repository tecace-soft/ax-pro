import { getOntologySupabaseClient } from './ontologySupabase.ts';
import { parseOntologyId } from './ontologyDelete.ts';
import { ONTOLOGY_ENTITY_TYPES, type OntologyEntityType } from '../types/ontology.ts';

const MAX_RELATION_TYPE_LEN = 256;

const ONTOLOGY_PROPERTY_VALUE_TYPES = ['string', 'number', 'boolean', 'date'] as const;
const ONTOLOGY_ROW_STATUSES = ['active', 'deprecated'] as const;

export class OntologyUpdateError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'OntologyUpdateError';
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

async function assertRowOwned(
  table: 'ontology_entities' | 'ontology_aliases' | 'ontology_relationships' | 'ontology_properties',
  group_id: string,
  id: string
): Promise<void> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyUpdateError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }
  const { data, error } = await client.from(table).select('id').eq('group_id', group_id).eq('id', id).maybeSingle();
  if (error) {
    throw new OntologyUpdateError(error.message || 'Lookup failed', 'lookup_failed', error);
  }
  if (!data) {
    throw new OntologyUpdateError('Row not found for this group', 'not_found');
  }
}

async function updateEntityDisplayById(group_id: string, entity_id: string, display_name: string): Promise<void> {
  const dn = display_name.trim();
  if (!dn) {
    throw new OntologyUpdateError('display_name cannot be empty', 'invalid_patch');
  }
  const client = getOntologySupabaseClient()!;
  const { error } = await client
    .from('ontology_entities')
    .update({
      display_name: dn,
      canonical_name: canonicalFromDisplay(dn),
    })
    .eq('group_id', group_id)
    .eq('id', entity_id);
  if (error) {
    throw new OntologyUpdateError(error.message || 'Failed to update entity', 'entity_update_failed', error);
  }
}

export async function updateOntologyEntity(
  group_id: string,
  id: string,
  patch: Record<string, unknown>
): Promise<{ updated: true }> {
  await assertRowOwned('ontology_entities', group_id, id);
  const client = getOntologySupabaseClient()!;

  const row: Record<string, unknown> = {};
  if ('display_name' in patch && patch.display_name != null) {
    if (typeof patch.display_name !== 'string') {
      throw new OntologyUpdateError('display_name must be a string', 'invalid_patch');
    }
    const dn = patch.display_name.trim();
    if (!dn) throw new OntologyUpdateError('display_name cannot be empty', 'invalid_patch');
    row.display_name = dn;
    row.canonical_name = canonicalFromDisplay(dn);
  }
  if ('entity_type' in patch && patch.entity_type != null) {
    if (typeof patch.entity_type !== 'string' || !(ONTOLOGY_ENTITY_TYPES as readonly string[]).includes(patch.entity_type)) {
      throw new OntologyUpdateError('Invalid entity_type', 'invalid_patch');
    }
    row.entity_type = patch.entity_type as OntologyEntityType;
  }
  if ('description' in patch) {
    if (patch.description != null && typeof patch.description !== 'string') {
      throw new OntologyUpdateError('description must be a string or null', 'invalid_patch');
    }
    row.description =
      patch.description == null || typeof patch.description !== 'string'
        ? null
        : patch.description.trim() || null;
  }

  if (Object.keys(row).length === 0) {
    throw new OntologyUpdateError('No valid fields to update', 'invalid_patch');
  }

  const { error } = await client.from('ontology_entities').update(row).eq('group_id', group_id).eq('id', id);
  if (error) {
    throw new OntologyUpdateError(error.message || 'Failed to update entity', 'entity_update_failed', error);
  }
  return { updated: true };
}

export async function updateOntologyAlias(
  group_id: string,
  id: string,
  patch: Record<string, unknown>
): Promise<{ updated: true }> {
  await assertRowOwned('ontology_aliases', group_id, id);
  const client = getOntologySupabaseClient()!;

  const { data: aliasRow, error: fetchErr } = await client
    .from('ontology_aliases')
    .select('entity_id')
    .eq('group_id', group_id)
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) {
    throw new OntologyUpdateError(fetchErr.message || 'Failed to load alias', 'alias_fetch_failed', fetchErr);
  }
  const entityId = aliasRow && typeof aliasRow === 'object' ? parseOntologyId((aliasRow as { entity_id?: unknown }).entity_id) : null;

  if ('entity_display_name' in patch && patch.entity_display_name != null) {
    if (typeof patch.entity_display_name !== 'string') {
      throw new OntologyUpdateError('entity_display_name must be a string', 'invalid_patch');
    }
    if (!entityId) {
      throw new OntologyUpdateError('Alias has no entity_id', 'invalid_patch');
    }
    await updateEntityDisplayById(group_id, entityId, patch.entity_display_name);
  }

  const row: Record<string, unknown> = {};
  if ('alias_text' in patch && patch.alias_text != null) {
    if (typeof patch.alias_text !== 'string' || !patch.alias_text.trim()) {
      throw new OntologyUpdateError('alias_text must be a non-empty string', 'invalid_patch');
    }
    row.alias_text = patch.alias_text.trim();
  }
  if ('alias_language' in patch) {
    if (patch.alias_language != null && typeof patch.alias_language !== 'string') {
      throw new OntologyUpdateError('alias_language must be a string or null', 'invalid_patch');
    }
    row.alias_language =
      patch.alias_language == null || typeof patch.alias_language !== 'string'
        ? null
        : patch.alias_language.trim() || null;
  }
  if ('alias_type' in patch) {
    if (patch.alias_type != null && typeof patch.alias_type !== 'string') {
      throw new OntologyUpdateError('alias_type must be a string or null', 'invalid_patch');
    }
    row.alias_type =
      patch.alias_type == null || typeof patch.alias_type !== 'string' ? null : patch.alias_type.trim() || null;
  }

  if (Object.keys(row).length > 0) {
    const { error } = await client.from('ontology_aliases').update(row).eq('group_id', group_id).eq('id', id);
    if (error) {
      throw new OntologyUpdateError(error.message || 'Failed to update alias', 'alias_update_failed', error);
    }
  }

  if (Object.keys(row).length === 0 && !('entity_display_name' in patch && patch.entity_display_name != null)) {
    throw new OntologyUpdateError('No valid fields to update', 'invalid_patch');
  }

  return { updated: true };
}

export async function updateOntologyRelationship(
  group_id: string,
  id: string,
  patch: Record<string, unknown>
): Promise<{ updated: true }> {
  await assertRowOwned('ontology_relationships', group_id, id);
  const client = getOntologySupabaseClient()!;

  const { data: rel, error: fetchErr } = await client
    .from('ontology_relationships')
    .select('from_entity_id, to_entity_id')
    .eq('group_id', group_id)
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) {
    throw new OntologyUpdateError(fetchErr.message || 'Failed to load relationship', 'relationship_fetch_failed', fetchErr);
  }
  const fromId =
    rel && typeof rel === 'object' ? parseOntologyId((rel as { from_entity_id?: unknown }).from_entity_id) : null;
  const toId =
    rel && typeof rel === 'object' ? parseOntologyId((rel as { to_entity_id?: unknown }).to_entity_id) : null;

  if ('from_display_name' in patch && patch.from_display_name != null) {
    if (typeof patch.from_display_name !== 'string') {
      throw new OntologyUpdateError('from_display_name must be a string', 'invalid_patch');
    }
    if (!fromId) throw new OntologyUpdateError('Relationship missing from_entity_id', 'invalid_patch');
    await updateEntityDisplayById(group_id, fromId, patch.from_display_name);
  }
  if ('to_display_name' in patch && patch.to_display_name != null) {
    if (typeof patch.to_display_name !== 'string') {
      throw new OntologyUpdateError('to_display_name must be a string', 'invalid_patch');
    }
    if (!toId) throw new OntologyUpdateError('Relationship missing to_entity_id', 'invalid_patch');
    await updateEntityDisplayById(group_id, toId, patch.to_display_name);
  }

  const row: Record<string, unknown> = {};
  if ('relation_type' in patch && patch.relation_type != null) {
    if (typeof patch.relation_type !== 'string') {
      throw new OntologyUpdateError('relation_type must be a string', 'invalid_patch');
    }
    const rt = patch.relation_type.trim();
    if (!rt) {
      throw new OntologyUpdateError('relation_type cannot be empty', 'invalid_patch');
    }
    if (rt.length > MAX_RELATION_TYPE_LEN) {
      throw new OntologyUpdateError(`relation_type must be at most ${MAX_RELATION_TYPE_LEN} characters`, 'invalid_patch');
    }
    row.relation_type = rt;
  }

  if (Object.keys(row).length > 0) {
    const { error } = await client.from('ontology_relationships').update(row).eq('group_id', group_id).eq('id', id);
    if (error) {
      throw new OntologyUpdateError(error.message || 'Failed to update relationship', 'relationship_update_failed', error);
    }
  }

  const didVirtual =
    ('from_display_name' in patch && patch.from_display_name != null) ||
    ('to_display_name' in patch && patch.to_display_name != null);
  if (Object.keys(row).length === 0 && !didVirtual) {
    throw new OntologyUpdateError('No valid fields to update', 'invalid_patch');
  }

  return { updated: true };
}

export async function updateOntologyProperty(
  group_id: string,
  id: string,
  patch: Record<string, unknown>
): Promise<{ updated: true }> {
  await assertRowOwned('ontology_properties', group_id, id);
  const client = getOntologySupabaseClient()!;

  const { data: propRow, error: fetchErr } = await client
    .from('ontology_properties')
    .select('entity_id')
    .eq('group_id', group_id)
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) {
    throw new OntologyUpdateError(fetchErr.message || 'Failed to load property', 'property_fetch_failed', fetchErr);
  }
  const entityId =
    propRow && typeof propRow === 'object' ? parseOntologyId((propRow as { entity_id?: unknown }).entity_id) : null;

  if ('entity_display_name' in patch && patch.entity_display_name != null) {
    if (typeof patch.entity_display_name !== 'string') {
      throw new OntologyUpdateError('entity_display_name must be a string', 'invalid_patch');
    }
    if (!entityId) throw new OntologyUpdateError('Property missing entity_id', 'invalid_patch');
    await updateEntityDisplayById(group_id, entityId, patch.entity_display_name);
  }

  const row: Record<string, unknown> = {};
  if ('property_key' in patch && patch.property_key != null) {
    if (typeof patch.property_key !== 'string' || !patch.property_key.trim()) {
      throw new OntologyUpdateError('property_key must be a non-empty string', 'invalid_patch');
    }
    row.property_key = patch.property_key.trim();
  }
  if ('property_value_text' in patch && patch.property_value_text != null) {
    if (typeof patch.property_value_text !== 'string') {
      throw new OntologyUpdateError('property_value_text must be a string', 'invalid_patch');
    }
    row.property_value_text = patch.property_value_text;
  }
  if ('value_type' in patch && patch.value_type != null) {
    if (
      typeof patch.value_type !== 'string' ||
      !(ONTOLOGY_PROPERTY_VALUE_TYPES as readonly string[]).includes(patch.value_type)
    ) {
      throw new OntologyUpdateError('Invalid value_type', 'invalid_patch');
    }
    row.value_type = patch.value_type;
  }
  if ('status' in patch && patch.status != null) {
    if (typeof patch.status !== 'string' || !(ONTOLOGY_ROW_STATUSES as readonly string[]).includes(patch.status)) {
      throw new OntologyUpdateError('Invalid status', 'invalid_patch');
    }
    row.status = patch.status;
  }

  if (Object.keys(row).length > 0) {
    const { error } = await client.from('ontology_properties').update(row).eq('group_id', group_id).eq('id', id);
    if (error) {
      throw new OntologyUpdateError(error.message || 'Failed to update property', 'property_update_failed', error);
    }
  }

  const didVirtual = 'entity_display_name' in patch && patch.entity_display_name != null;
  if (Object.keys(row).length === 0 && !didVirtual) {
    throw new OntologyUpdateError('No valid fields to update', 'invalid_patch');
  }

  return { updated: true };
}

export type OntologyUpdateResource = 'entity' | 'alias' | 'relationship' | 'property';

export async function applyOntologyUpdate(
  resource: OntologyUpdateResource,
  group_id: string,
  id: string,
  patch: Record<string, unknown>
): Promise<{ updated: true }> {
  switch (resource) {
    case 'entity':
      return updateOntologyEntity(group_id, id, patch);
    case 'alias':
      return updateOntologyAlias(group_id, id, patch);
    case 'relationship':
      return updateOntologyRelationship(group_id, id, patch);
    case 'property':
      return updateOntologyProperty(group_id, id, patch);
    default:
      throw new OntologyUpdateError('Invalid resource', 'invalid_resource');
  }
}
