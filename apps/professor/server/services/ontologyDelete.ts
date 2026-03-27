import { getOntologySupabaseClient } from './ontologySupabase.ts';

/**
 * Row ids from PostgREST may be uuid strings, or int8/bigint as number (or string in JSON).
 */
export function parseOntologyId(raw: unknown): string | null {
  if (raw == null) return null;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? parseOntologyId(raw[0]) : null;
  }
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

export class OntologyDeleteError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'OntologyDeleteError';
    this.code = code;
    this.details = details;
  }
}

export interface EntityDeleteImpact {
  group_id: string;
  entity_id: string;
  cascade: {
    aliases: number;
    relationships: number;
    properties: number;
  };
}

/** Count dependent rows removed with the entity via FK ON DELETE CASCADE. */
export async function getEntityDeleteImpact(group_id: string, entity_id: string): Promise<EntityDeleteImpact> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyDeleteError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const [aliasesRes, relRes, propRes] = await Promise.all([
    client
      .from('ontology_aliases')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .eq('entity_id', entity_id),
    client
      .from('ontology_relationships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .or(`from_entity_id.eq.${entity_id},to_entity_id.eq.${entity_id}`),
    client
      .from('ontology_properties')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', group_id)
      .eq('entity_id', entity_id),
  ]);

  const err = aliasesRes.error || relRes.error || propRes.error;
  if (err) {
    throw new OntologyDeleteError(err.message || 'Failed to compute delete impact', 'impact_query_failed', err);
  }

  return {
    group_id,
    entity_id,
    cascade: {
      aliases: aliasesRes.count ?? 0,
      relationships: relRes.count ?? 0,
      properties: propRes.count ?? 0,
    },
  };
}

async function assertRowOwned(
  table: 'ontology_entities' | 'ontology_aliases' | 'ontology_relationships' | 'ontology_properties',
  group_id: string,
  id: string
): Promise<void> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyDeleteError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }
  const { data, error } = await client.from(table).select('id').eq('group_id', group_id).eq('id', id).maybeSingle();
  if (error) {
    throw new OntologyDeleteError(error.message || 'Lookup failed', 'lookup_failed', error);
  }
  if (!data) {
    throw new OntologyDeleteError('Row not found for this group', 'not_found');
  }
}

/** Deletes entity; FK CASCADE removes aliases, relationships, properties for that entity. */
export async function deleteOntologyEntity(group_id: string, entity_id: string): Promise<{ deleted: true }> {
  await assertRowOwned('ontology_entities', group_id, entity_id);
  const client = getOntologySupabaseClient()!;
  const { error } = await client.from('ontology_entities').delete().eq('group_id', group_id).eq('id', entity_id);
  if (error) {
    throw new OntologyDeleteError(error.message || 'Failed to delete entity', 'entity_delete_failed', error);
  }
  return { deleted: true };
}

/** Deletes one alias row only (entity and source unchanged). */
export async function deleteOntologyAlias(group_id: string, alias_id: string): Promise<{ deleted: true }> {
  await assertRowOwned('ontology_aliases', group_id, alias_id);
  const client = getOntologySupabaseClient()!;
  const { error } = await client.from('ontology_aliases').delete().eq('group_id', group_id).eq('id', alias_id);
  if (error) {
    throw new OntologyDeleteError(error.message || 'Failed to delete alias', 'alias_delete_failed', error);
  }
  return { deleted: true };
}

/** Deletes one relationship row only. */
export async function deleteOntologyRelationship(group_id: string, relationship_id: string): Promise<{ deleted: true }> {
  await assertRowOwned('ontology_relationships', group_id, relationship_id);
  const client = getOntologySupabaseClient()!;
  const { error } = await client
    .from('ontology_relationships')
    .delete()
    .eq('group_id', group_id)
    .eq('id', relationship_id);
  if (error) {
    throw new OntologyDeleteError(error.message || 'Failed to delete relationship', 'relationship_delete_failed', error);
  }
  return { deleted: true };
}

/** Deletes one property row only. */
export async function deleteOntologyProperty(group_id: string, property_id: string): Promise<{ deleted: true }> {
  await assertRowOwned('ontology_properties', group_id, property_id);
  const client = getOntologySupabaseClient()!;
  const { error } = await client.from('ontology_properties').delete().eq('group_id', group_id).eq('id', property_id);
  if (error) {
    throw new OntologyDeleteError(error.message || 'Failed to delete property', 'property_delete_failed', error);
  }
  return { deleted: true };
}

export type OntologyDeleteResource = 'entity' | 'alias' | 'relationship' | 'property';

export async function deleteOntologyRow(
  resource: OntologyDeleteResource,
  group_id: string,
  id: string
): Promise<{ deleted: true }> {
  switch (resource) {
    case 'entity':
      return deleteOntologyEntity(group_id, id);
    case 'alias':
      return deleteOntologyAlias(group_id, id);
    case 'relationship':
      return deleteOntologyRelationship(group_id, id);
    case 'property':
      return deleteOntologyProperty(group_id, id);
    default:
      throw new OntologyDeleteError('Invalid resource', 'invalid_resource');
  }
}
