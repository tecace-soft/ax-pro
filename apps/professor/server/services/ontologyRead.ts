import { getOntologySupabaseClient, OntologyPersistenceError } from './ontologySupabase.ts';
import type { OntologyEntityType, OntologyRelationType } from '../types/ontology.ts';
import { ONTOLOGY_ENTITY_TYPES, ONTOLOGY_RELATION_TYPES } from '../types/ontology.ts';

const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function clampLimit(raw: string | undefined): number {
  const n = raw ? parseInt(raw, 10) : DEFAULT_LIMIT;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export interface ListOntologyQueryBase {
  group_id: string;
  limit?: number;
  /** When true, include deprecated rows (status != active). Default false = approved/saved active only. */
  include_deprecated?: boolean;
}

export type OntologyStoredEntityRow = Record<string, unknown>;
export type OntologyStoredAliasRow = Record<string, unknown> & { entity_display_name?: string | null };
export type OntologyStoredRelationshipRow = Record<string, unknown> & {
  from_display_name?: string | null;
  to_display_name?: string | null;
};
export type OntologyStoredPropertyRow = Record<string, unknown> & { entity_display_name?: string | null };

/** Parse and validate shared list query params from Express query object. */
export function parseOntologyListBaseQuery(q: Record<string, unknown>): {
  ok: true;
  group_id: string;
  limit: number;
  include_deprecated: boolean;
} | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const group_id = typeof q.group_id === 'string' ? q.group_id.trim() : '';
  if (!group_id) errors.push('group_id query parameter is required');
  else if (group_id.length > 256) errors.push('group_id is too long');

  const limit = clampLimit(typeof q.limit === 'string' ? q.limit : undefined);
  const inc = typeof q.include_deprecated === 'string' ? q.include_deprecated.toLowerCase() : '';
  const include_deprecated = inc === '1' || inc === 'true' || inc === 'yes';

  if (errors.length) return { ok: false, errors };
  return { ok: true, group_id, limit, include_deprecated };
}

async function entityDisplayMap(
  client: NonNullable<ReturnType<typeof getOntologySupabaseClient>>,
  group_id: string,
  ids: string[]
): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const { data, error } = await client
    .from('ontology_entities')
    .select('id, display_name')
    .eq('group_id', group_id)
    .in('id', uniq);
  if (error) {
    throw new OntologyPersistenceError(
      error.message || 'Failed to load entity labels',
      'entity_labels_lookup_failed',
      error
    );
  }
  for (const row of data ?? []) {
    const id = row && typeof row === 'object' && typeof (row as { id?: unknown }).id === 'string' ? (row as { id: string }).id : '';
    const dn =
      row && typeof row === 'object' && typeof (row as { display_name?: unknown }).display_name === 'string'
        ? (row as { display_name: string }).display_name
        : '';
    if (id) map.set(id, dn || id);
  }
  return map;
}

export async function listOntologyEntities(params: ListOntologyQueryBase & { q?: string; entity_type?: string }): Promise<{
  items: OntologyStoredEntityRow[];
}> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyPersistenceError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const limit = params.limit ?? DEFAULT_LIMIT;
  let query = client
    .from('ontology_entities')
    .select('*')
    .eq('group_id', params.group_id)
    .order('display_name', { ascending: true })
    .limit(limit);

  if (!params.include_deprecated) {
    query = query.eq('status', 'active');
  }

  const et = typeof params.entity_type === 'string' ? params.entity_type.trim() : '';
  if (et && (ONTOLOGY_ENTITY_TYPES as readonly string[]).includes(et)) {
    query = query.eq('entity_type', et as OntologyEntityType);
  }

  const search = typeof params.q === 'string' ? params.q.trim() : '';
  if (search) {
    const pat = `%${escapeIlike(search)}%`;
    query = query.or(`display_name.ilike.${pat},canonical_name.ilike.${pat}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new OntologyPersistenceError(
      error.message || 'Failed to list ontology_entities',
      'entities_list_failed',
      error
    );
  }

  return { items: (data ?? []) as OntologyStoredEntityRow[] };
}

export async function listOntologyAliases(params: ListOntologyQueryBase & { q?: string }): Promise<{
  items: OntologyStoredAliasRow[];
}> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyPersistenceError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const limit = params.limit ?? DEFAULT_LIMIT;
  let query = client
    .from('ontology_aliases')
    .select('*')
    .eq('group_id', params.group_id)
    .order('alias_text', { ascending: true })
    .limit(limit);

  const search = typeof params.q === 'string' ? params.q.trim() : '';
  if (search) {
    query = query.ilike('alias_text', `%${escapeIlike(search)}%`);
  }

  const { data, error } = await query;
  if (error) {
    throw new OntologyPersistenceError(
      error.message || 'Failed to list ontology_aliases',
      'aliases_list_failed',
      error
    );
  }

  const rows = (data ?? []) as OntologyStoredAliasRow[];
  const entityIds = rows.map((r) => (typeof r.entity_id === 'string' ? r.entity_id : '')).filter(Boolean);
  const labels = await entityDisplayMap(client, params.group_id, entityIds);
  for (const r of rows) {
    const eid = typeof r.entity_id === 'string' ? r.entity_id : '';
    r.entity_display_name = eid ? labels.get(eid) ?? null : null;
  }

  return { items: rows };
}

export async function listOntologyRelationships(params: ListOntologyQueryBase & { relation_type?: string }): Promise<{
  items: OntologyStoredRelationshipRow[];
}> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyPersistenceError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const limit = params.limit ?? DEFAULT_LIMIT;
  let query = client
    .from('ontology_relationships')
    .select('*')
    .eq('group_id', params.group_id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!params.include_deprecated) {
    query = query.eq('status', 'active');
  }

  const rt = typeof params.relation_type === 'string' ? params.relation_type.trim() : '';
  if (rt && (ONTOLOGY_RELATION_TYPES as readonly string[]).includes(rt)) {
    query = query.eq('relation_type', rt as OntologyRelationType);
  }

  const { data, error } = await query;
  if (error) {
    throw new OntologyPersistenceError(
      error.message || 'Failed to list ontology_relationships',
      'relationships_list_failed',
      error
    );
  }

  const rows = (data ?? []) as OntologyStoredRelationshipRow[];
  const ids: string[] = [];
  for (const r of rows) {
    if (typeof r.from_entity_id === 'string') ids.push(r.from_entity_id);
    if (typeof r.to_entity_id === 'string') ids.push(r.to_entity_id);
  }
  const labels = await entityDisplayMap(client, params.group_id, ids);
  for (const r of rows) {
    const from = typeof r.from_entity_id === 'string' ? r.from_entity_id : '';
    const to = typeof r.to_entity_id === 'string' ? r.to_entity_id : '';
    r.from_display_name = from ? labels.get(from) ?? null : null;
    r.to_display_name = to ? labels.get(to) ?? null : null;
  }

  return { items: rows };
}

export async function listOntologyProperties(params: ListOntologyQueryBase & { q?: string }): Promise<{
  items: OntologyStoredPropertyRow[];
}> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyPersistenceError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const limit = params.limit ?? DEFAULT_LIMIT;
  let query = client
    .from('ontology_properties')
    .select('*')
    .eq('group_id', params.group_id)
    .order('property_key', { ascending: true })
    .limit(limit);

  if (!params.include_deprecated) {
    query = query.eq('status', 'active');
  }

  const search = typeof params.q === 'string' ? params.q.trim() : '';
  if (search) {
    const pat = `%${escapeIlike(search)}%`;
    query = query.or(`property_key.ilike.${pat},property_value_text.ilike.${pat}`);
  }

  const { data, error } = await query;
  if (error) {
    throw new OntologyPersistenceError(
      error.message || 'Failed to list ontology_properties',
      'properties_list_failed',
      error
    );
  }

  const rows = (data ?? []) as OntologyStoredPropertyRow[];
  const entityIds = rows.map((r) => (typeof r.entity_id === 'string' ? r.entity_id : '')).filter(Boolean);
  const labels = await entityDisplayMap(client, params.group_id, entityIds);
  for (const r of rows) {
    const eid = typeof r.entity_id === 'string' ? r.entity_id : '';
    r.entity_display_name = eid ? labels.get(eid) ?? null : null;
  }

  return { items: rows };
}
