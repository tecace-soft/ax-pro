import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ApproveAndSavePersistenceResult,
  ApproveAndSaveValidatedPayload,
} from '../types/ontology.ts';
import { getOntologyServerEnv } from '../config/ontologyEnv.ts';

/**
 * Server-side Supabase client for ontology persistence.
 * Uses SUPABASE_URL (+ optional VITE_SUPABASE_URL fallback for URL only) and
 * SUPABASE_SERVICE_ROLE_KEY from {@link getOntologyServerEnv} — never the anon key.
 */
export function getOntologySupabaseClient(): SupabaseClient | null {
  const env = getOntologyServerEnv();
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isOntologySupabaseConfigured(): boolean {
  return getOntologySupabaseClient() !== null;
}

export class OntologyPersistenceError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'OntologyPersistenceError';
    this.code = code;
    this.details = details;
  }
}

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** PK from DB: id column, common alternates, serial/bigint, or sole uuid-shaped string on row. */
function readGeneratedId(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as Record<string, unknown>;
  for (const key of ['id', 'ontology_source_id', 'ontology_entity_id']) {
    if (!(key in o)) continue;
    const id = o[key];
    if (id === null || id === undefined) continue;
    if (typeof id === 'string' && id.length > 0) return id;
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    if (typeof id === 'bigint') return id.toString();
  }
  const uuidCandidates = Object.values(o).filter(
    (v): v is string => typeof v === 'string' && UUID_LIKE.test(v)
  );
  if (uuidCandidates.length === 1) return uuidCandidates[0];
  return null;
}

function firstInsertedRow<T>(data: T | T[] | null): T | null {
  if (data == null) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

function asDbId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'bigint') return value.toString();
  return null;
}

function canonicalName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function entityCanonicalKey(row: { canonical_name?: unknown; display_name?: unknown }): string {
  const cn =
    typeof row.canonical_name === 'string' && row.canonical_name.trim()
      ? row.canonical_name.trim()
      : '';
  const dn = typeof row.display_name === 'string' ? row.display_name : '';
  return cn ? canonicalName(cn) : canonicalName(dn);
}

/**
 * Persist reviewed ontology payload (Supabase schema: group_id on every table;
 * entities use canonical_name / display_name; aliases alias_text; relationships
 * from_entity_id / to_entity_id; properties property_value_text).
 *
 * TODO(conflict-resolution): cross-source merge policy when the same canonical_name appears with divergent display_name.
 */
export async function persistApprovedOntology(
  input: ApproveAndSaveValidatedPayload & { approvedBy?: string }
): Promise<ApproveAndSavePersistenceResult> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyPersistenceError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const sourceRow = {
    group_id: input.group_id,
    source_type: input.source_type,
    source_text: input.source_text,
    created_by: input.created_by,
  };

  // Prefer array insert — matches PostgREST bulk shape so representation rows are returned reliably.
  const sourceInsert = await client.from('ontology_sources').insert([sourceRow]).select('*');
  if (sourceInsert.error) {
    throw new OntologyPersistenceError(
      sourceInsert.error.message || 'Failed to insert ontology_sources',
      'sources_insert_failed',
      sourceInsert.error
    );
  }

  let source_id = readGeneratedId(firstInsertedRow(sourceInsert.data));

  if (!source_id) {
    const fallback = await client
      .from('ontology_sources')
      .select('*')
      .eq('group_id', sourceRow.group_id)
      .eq('created_by', sourceRow.created_by)
      .eq('source_type', sourceRow.source_type)
      .eq('source_text', sourceRow.source_text)
      .order('created_at', { ascending: false })
      .limit(1);
    if (fallback.error) {
      throw new OntologyPersistenceError(
        fallback.error.message || 'Failed to re-fetch ontology_sources after insert',
        'sources_select_after_insert_failed',
        { insert: sourceInsert.data, insertError: null, fallback: fallback.error }
      );
    }
    source_id = readGeneratedId(firstInsertedRow(fallback.data));
  }

  if (!source_id) {
    console.error('[ontology] ontology_sources insert returned no id', {
      insertData: sourceInsert.data,
      hint: 'Confirm PK column is id (or readable via select *) and service role bypasses RLS for this table.',
    });
    throw new OntologyPersistenceError(
      'Missing ontology_sources.id after insert — insert response was empty and re-fetch by natural keys found no row (check table name, RLS, and DB triggers)',
      'sources_insert_missing_id',
      { insertResponse: sourceInsert.data }
    );
  }

  try {
    const created: ApproveAndSavePersistenceResult['created'] = {
      entities: [],
      aliases: [],
      relationships: [],
      properties: [],
    };
    const linked_existing: ApproveAndSavePersistenceResult['linked_existing'] = { entities: [] };
    const skipped_duplicate: ApproveAndSavePersistenceResult['skipped_duplicate'] = {
      aliases: [],
      relationships: [],
      properties: [],
    };
    const conflict: ApproveAndSavePersistenceResult['conflict'] = {
      entities: [],
      aliases: [],
      properties: [],
    };

    const sourceRows = await client.from('ontology_sources').select('id').eq('group_id', input.group_id);
    if (sourceRows.error) {
      throw new OntologyPersistenceError(
        sourceRows.error.message || 'Failed to load group sources',
        'sources_lookup_failed',
        sourceRows.error
      );
    }
    const groupSourceIds = (sourceRows.data ?? [])
      .map((r) => readGeneratedId(r))
      .filter((id): id is string => !!id);

    const existingEntitiesByCanonical = new Map<
      string,
      Array<{ id: string; entity_type: string }>
    >();
    if (groupSourceIds.length > 0) {
      const existingEntities = await client
        .from('ontology_entities')
        .select('id, canonical_name, display_name, entity_type')
        .in('source_id', groupSourceIds);
      if (existingEntities.error) {
        throw new OntologyPersistenceError(
          existingEntities.error.message || 'Failed to load group entities',
          'entities_lookup_failed',
          existingEntities.error
        );
      }
      for (const row of existingEntities.data ?? []) {
        const id = readGeneratedId(row);
        const entity_type =
          typeof (row as { entity_type?: unknown }).entity_type === 'string'
            ? (row as { entity_type: string }).entity_type
            : '';
        if (!id || !entity_type) continue;
        const key = entityCanonicalKey(row as { canonical_name?: unknown; display_name?: unknown });
        if (!key) continue;
        if (!existingEntitiesByCanonical.has(key)) existingEntitiesByCanonical.set(key, []);
        existingEntitiesByCanonical.get(key)!.push({ id, entity_type });
      }
    }

    const byClientEntityId = new Map<string, string>();
    for (const entity of input.entities) {
      const canonical = canonicalName(entity.label);
      const matches = existingEntitiesByCanonical.get(canonical) ?? [];
      const sameTypeMatch = matches.find((m) => m.entity_type === entity.entity_type);
      const diffTypeMatch = matches.find((m) => m.entity_type !== entity.entity_type);
      if (sameTypeMatch) {
        byClientEntityId.set(entity.id, sameTypeMatch.id);
        linked_existing.entities.push({
          client_entity_id: entity.id,
          entity_id: sameTypeMatch.id,
          canonical_name: canonical,
        });
        continue;
      }
      if (diffTypeMatch) {
        conflict.entities.push({
          client_entity_id: entity.id,
          canonical_name: canonical,
          reason: `Canonical match exists with different entity_type (${diffTypeMatch.entity_type})`,
        });
        continue;
      }

      const inserted = await client
        .from('ontology_entities')
        .insert({
          group_id: input.group_id,
          source_id,
          canonical_name: canonical,
          display_name: entity.label.trim(),
          entity_type: entity.entity_type,
          description: entity.description ?? null,
          status: 'active',
        })
        .select('id');
      if (inserted.error) {
        throw new OntologyPersistenceError(
          inserted.error.message || 'Failed to insert ontology_entities',
          'entities_insert_failed',
          inserted.error
        );
      }
      const entity_id = readGeneratedId(firstInsertedRow(inserted.data));
      if (!entity_id) {
        throw new OntologyPersistenceError('Missing ontology_entities.id after insert', 'entities_insert_missing_id', {
          raw: inserted.data,
        });
      }
      byClientEntityId.set(entity.id, entity_id);
      created.entities.push({ client_entity_id: entity.id, entity_id });
      if (!existingEntitiesByCanonical.has(canonical)) existingEntitiesByCanonical.set(canonical, []);
      existingEntitiesByCanonical.get(canonical)!.push({ id: entity_id, entity_type: entity.entity_type });
    }

    const groupEntityIds = new Set<string>([
      ...Array.from(byClientEntityId.values()),
      ...Array.from(existingEntitiesByCanonical.values()).flat().map((v) => v.id),
    ]);

    const aliasSet = new Set(input.aliases.map((a) => a.alias.trim()).filter(Boolean));
    const aliasOwners = new Map<string, Set<string>>();
    if (groupEntityIds.size > 0 && aliasSet.size > 0) {
      const aliasRows = await client
        .from('ontology_aliases')
        .select('alias_text, entity_id')
        .in('entity_id', Array.from(groupEntityIds))
        .in('alias_text', Array.from(aliasSet));
      if (aliasRows.error) {
        throw new OntologyPersistenceError(
          aliasRows.error.message || 'Failed to load alias candidates',
          'aliases_lookup_failed',
          aliasRows.error
        );
      }
      for (const row of aliasRows.data ?? []) {
        const alias =
          typeof (row as { alias_text?: unknown }).alias_text === 'string'
            ? (row as { alias_text: string }).alias_text
            : '';
        const entity_id = asDbId((row as { entity_id?: unknown }).entity_id) ?? '';
        if (!alias || !entity_id) continue;
        if (!aliasOwners.has(alias)) aliasOwners.set(alias, new Set());
        aliasOwners.get(alias)!.add(entity_id);
      }
    }

    for (const alias of input.aliases) {
      const aliasText = alias.alias.trim();
      if (!aliasText) continue;
      const targetEntityId = byClientEntityId.get(alias.entity_id);
      if (!targetEntityId) continue;
      const owners = aliasOwners.get(aliasText) ?? new Set<string>();
      if (owners.has(targetEntityId)) {
        skipped_duplicate.aliases.push({ alias: aliasText, entity_id: targetEntityId });
        continue;
      }
      if (owners.size > 0) {
        conflict.aliases.push({
          alias: aliasText,
          requested_entity_id: targetEntityId,
          existing_entity_id: Array.from(owners)[0],
        });
        continue;
      }
      const inserted = await client
        .from('ontology_aliases')
        .insert({
          group_id: input.group_id,
          source_id,
          entity_id: targetEntityId,
          alias_text: aliasText,
          alias_language: null,
          alias_type: null,
        })
        .select('id');
      if (inserted.error) {
        throw new OntologyPersistenceError(
          inserted.error.message || 'Failed to insert ontology_aliases',
          'aliases_insert_failed',
          inserted.error
        );
      }
      const alias_id = readGeneratedId(firstInsertedRow(inserted.data));
      if (alias_id) created.aliases.push(alias_id);
      if (!aliasOwners.has(aliasText)) aliasOwners.set(aliasText, new Set());
      aliasOwners.get(aliasText)!.add(targetEntityId);
    }

    const relationshipKey = (s: string, r: string, o: string) => `${s}|${r}|${o}`;
    const relationshipKeys = new Set<string>();
    if (groupSourceIds.length > 0) {
      const relationshipRows = await client
        .from('ontology_relationships')
        .select('from_entity_id, relation_type, to_entity_id')
        .in('source_id', groupSourceIds);
      if (relationshipRows.error) {
        throw new OntologyPersistenceError(
          relationshipRows.error.message || 'Failed to load relationship candidates',
          'relationships_lookup_failed',
          relationshipRows.error
        );
      }
      for (const row of relationshipRows.data ?? []) {
        const s = asDbId((row as { from_entity_id?: unknown }).from_entity_id) ?? '';
        const rel =
          typeof (row as { relation_type?: unknown }).relation_type === 'string'
            ? (row as { relation_type: string }).relation_type
            : '';
        const o = asDbId((row as { to_entity_id?: unknown }).to_entity_id) ?? '';
        if (s && rel && o) relationshipKeys.add(relationshipKey(s, rel, o));
      }
    }

    for (const rel of input.relationships) {
      const from_entity_id = byClientEntityId.get(rel.subject_entity_id);
      const to_entity_id = byClientEntityId.get(rel.object_entity_id);
      if (!from_entity_id || !to_entity_id) continue;
      const key = relationshipKey(from_entity_id, rel.relation_type, to_entity_id);
      if (relationshipKeys.has(key)) {
        skipped_duplicate.relationships.push({
          subject_entity_id: from_entity_id,
          relation_type: rel.relation_type,
          object_entity_id: to_entity_id,
        });
        continue;
      }
      const inserted = await client
        .from('ontology_relationships')
        .insert({
          group_id: input.group_id,
          source_id,
          from_entity_id,
          to_entity_id,
          relation_type: rel.relation_type,
          status: 'active',
        })
        .select('id');
      if (inserted.error) {
        throw new OntologyPersistenceError(
          inserted.error.message || 'Failed to insert ontology_relationships',
          'relationships_insert_failed',
          inserted.error
        );
      }
      const relationship_id = readGeneratedId(firstInsertedRow(inserted.data));
      if (relationship_id) {
        created.relationships.push({
          ...(rel.id ? { client_relationship_id: rel.id } : {}),
          relationship_id,
        });
      }
      relationshipKeys.add(key);
    }

    const propertyMap = new Map<string, string>();
    const candidateEntityIds = Array.from(new Set(Array.from(byClientEntityId.values())));
    if (candidateEntityIds.length > 0) {
      const propertyRows = await client
        .from('ontology_properties')
        .select('entity_id, property_key, property_value_text')
        .in('entity_id', candidateEntityIds);
      if (propertyRows.error) {
        throw new OntologyPersistenceError(
          propertyRows.error.message || 'Failed to load property candidates',
          'properties_lookup_failed',
          propertyRows.error
        );
      }
      for (const row of propertyRows.data ?? []) {
        const entity_id = asDbId((row as { entity_id?: unknown }).entity_id) ?? '';
        const property_key =
          typeof (row as { property_key?: unknown }).property_key === 'string'
            ? (row as { property_key: string }).property_key
            : '';
        const property_value_text =
          typeof (row as { property_value_text?: unknown }).property_value_text === 'string'
            ? (row as { property_value_text: string }).property_value_text
            : '';
        if (entity_id && property_key) propertyMap.set(`${entity_id}|${property_key}`, property_value_text);
      }
    }

    for (const prop of input.properties) {
      const entity_id = byClientEntityId.get(prop.entity_id);
      if (!entity_id) continue;
      const mapKey = `${entity_id}|${prop.key}`;
      const existingValue = propertyMap.get(mapKey);
      if (existingValue !== undefined) {
        if (existingValue === prop.value) {
          skipped_duplicate.properties.push({ entity_id, key: prop.key, value: prop.value });
        } else {
          conflict.properties.push({
            entity_id,
            key: prop.key,
            existing_value: existingValue,
            requested_value: prop.value,
          });
        }
        continue;
      }
      const inserted = await client
        .from('ontology_properties')
        .insert({
          group_id: input.group_id,
          source_id,
          entity_id,
          property_key: prop.key,
          property_value_text: prop.value,
          value_type: prop.value_type ?? 'string',
          status: 'active',
        })
        .select('id');
      if (inserted.error) {
        throw new OntologyPersistenceError(
          inserted.error.message || 'Failed to insert ontology_properties',
          'properties_insert_failed',
          inserted.error
        );
      }
      const property_id = readGeneratedId(firstInsertedRow(inserted.data));
      if (property_id) created.properties.push(property_id);
      propertyMap.set(mapKey, prop.value);
    }

    return { source_id, created, linked_existing, skipped_duplicate, conflict, warnings: input.warnings };
  } catch (error) {
    await client.from('ontology_sources').delete().eq('id', source_id);
    if (error instanceof OntologyPersistenceError) throw error;
    throw new OntologyPersistenceError('Unexpected persistence failure', 'unknown_persist_error', error);
  }
}
