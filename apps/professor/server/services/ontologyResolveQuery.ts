import { getOntologySupabaseClient } from './ontologySupabase.ts';
import type {
  OntologyResolveQueryResponse,
  OntologyResolverPayload,
} from '../types/ontology.ts';

const FETCH_CAP = 8_000;
const MIN_TERM_LENGTH = 2;
const MAX_USER_MESSAGE_LEN = 100_000;

/**
 * Runtime ontology resolver: match saved (active) ontology to a user message for n8n / LLM context.
 *
 * TODO(ontology-resolver): fuzzy matching (trigram / Levenshtein) for typos and near-matches.
 * TODO(ontology-resolver): relevance ranking and score thresholds; cap payload size by score.
 * TODO(ontology-resolver): expand graph hops (related entities N steps) with limits.
 * TODO(ontology-resolver): cache per-group entity/alias index in memory or Redis.
 */
export class OntologyResolverError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'OntologyResolverError';
    this.code = code;
    this.details = details;
  }
}

export type ValidateResolveQueryResult =
  | { ok: true; value: { group_id: string; user_message: string } }
  | { ok: false; errors: string[] };

export function validateResolveQueryBody(body: unknown): ValidateResolveQueryResult {
  const errors: string[] = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, errors: ['Body must be a JSON object'] };
  }
  const o = body as Record<string, unknown>;
  const group_id = typeof o.group_id === 'string' ? o.group_id.trim() : '';
  if (!group_id) errors.push('group_id is required (non-empty string)');
  else if (group_id.length > 256) errors.push('group_id is too long');

  const user_message = typeof o.user_message === 'string' ? o.user_message : '';
  if (user_message.length > MAX_USER_MESSAGE_LEN) {
    errors.push(`user_message must be at most ${MAX_USER_MESSAGE_LEN} characters`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { group_id, user_message } };
}

/** v1: lowercase, trim, non-alphanumeric → space, collapse spaces (ASCII-ish). */
export function normalizeForResolverMatch(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function termMatchesMessage(
  normalizedMessage: string,
  messageTokens: Set<string>,
  rawTerm: string
): boolean {
  const term = normalizeForResolverMatch(rawTerm);
  if (term.length < MIN_TERM_LENGTH) return false;
  if (normalizedMessage.length > 0 && normalizedMessage === term) return true;
  if (normalizedMessage.includes(term)) return true;
  if (messageTokens.has(term)) return true;
  return false;
}

function emptyResponse(group_id: string): OntologyResolveQueryResponse {
  const ontology_payload: OntologyResolverPayload = {
    schema_version: 1,
    group_id,
    entities: [],
    aliases: [],
    properties: [],
    relationships: [],
  };
  return {
    group_id,
    has_relevant_ontology: false,
    matched_entities: [],
    matched_aliases: [],
    related_properties: [],
    related_relationships: [],
    ontology_payload,
  };
}

function asRecordRows(rows: unknown[] | null | undefined): Record<string, unknown>[] {
  if (!rows?.length) return [];
  return rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && !Array.isArray(r));
}

function readStringId(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'bigint') return v.toString();
  return null;
}

export async function resolveOntologyForUserMessage(input: {
  group_id: string;
  user_message: string;
}): Promise<OntologyResolveQueryResponse> {
  const client = getOntologySupabaseClient();
  if (!client) {
    throw new OntologyResolverError(
      'Supabase client unavailable (check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)',
      'supabase_not_configured'
    );
  }

  const normMsg = normalizeForResolverMatch(input.user_message);
  if (!normMsg) {
    return emptyResponse(input.group_id);
  }

  const messageTokens = new Set(
    normMsg.split(' ').filter((t) => t.length >= MIN_TERM_LENGTH)
  );

  const { data: entData, error: entErr } = await client
    .from('ontology_entities')
    .select('*')
    .eq('group_id', input.group_id)
    .eq('status', 'active')
    .limit(FETCH_CAP);

  if (entErr) {
    throw new OntologyResolverError(
      entErr.message || 'Failed to load ontology entities',
      'entities_fetch_failed',
      entErr
    );
  }

  const entities = asRecordRows(entData);
  const entityById = new Map<string, Record<string, unknown>>();
  for (const e of entities) {
    const id = readStringId(e.id);
    if (id) entityById.set(id, e);
  }

  const { data: aliasData, error: aliasErr } = await client
    .from('ontology_aliases')
    .select('*')
    .eq('group_id', input.group_id)
    .limit(FETCH_CAP);

  if (aliasErr) {
    throw new OntologyResolverError(
      aliasErr.message || 'Failed to load ontology aliases',
      'aliases_fetch_failed',
      aliasErr
    );
  }

  const aliases = asRecordRows(aliasData);

  const matchedEntityIds = new Set<string>();
  const matchedAliasRows: Record<string, unknown>[] = [];

  for (const e of entities) {
    const id = readStringId(e.id);
    if (!id) continue;
    const display = typeof e.display_name === 'string' ? e.display_name : '';
    const canonical = typeof e.canonical_name === 'string' ? e.canonical_name : '';
    if (termMatchesMessage(normMsg, messageTokens, display) || termMatchesMessage(normMsg, messageTokens, canonical)) {
      matchedEntityIds.add(id);
    }
  }

  for (const a of aliases) {
    const aliasText = typeof a.alias_text === 'string' ? a.alias_text : '';
    if (!termMatchesMessage(normMsg, messageTokens, aliasText)) continue;
    matchedAliasRows.push({ ...a });
    const eid = readStringId(a.entity_id);
    if (eid) matchedEntityIds.add(eid);
  }

  if (matchedEntityIds.size === 0) {
    return emptyResponse(input.group_id);
  }

  const matched_entities = [...matchedEntityIds]
    .map((id) => entityById.get(id))
    .filter((e): e is Record<string, unknown> => !!e);

  const ids = [...matchedEntityIds];

  const { data: propData, error: propErr } = await client
    .from('ontology_properties')
    .select('*')
    .eq('group_id', input.group_id)
    .eq('status', 'active')
    .in('entity_id', ids)
    .limit(FETCH_CAP);

  if (propErr) {
    throw new OntologyResolverError(
      propErr.message || 'Failed to load ontology properties',
      'properties_fetch_failed',
      propErr
    );
  }

  const { data: relFrom, error: relFromErr } = await client
    .from('ontology_relationships')
    .select('*')
    .eq('group_id', input.group_id)
    .eq('status', 'active')
    .in('from_entity_id', ids)
    .limit(FETCH_CAP);

  if (relFromErr) {
    throw new OntologyResolverError(
      relFromErr.message || 'Failed to load ontology relationships',
      'relationships_fetch_failed',
      relFromErr
    );
  }

  const { data: relTo, error: relToErr } = await client
    .from('ontology_relationships')
    .select('*')
    .eq('group_id', input.group_id)
    .eq('status', 'active')
    .in('to_entity_id', ids)
    .limit(FETCH_CAP);

  if (relToErr) {
    throw new OntologyResolverError(
      relToErr.message || 'Failed to load ontology relationships',
      'relationships_fetch_failed',
      relToErr
    );
  }

  const relById = new Map<string, Record<string, unknown>>();
  for (const r of [...asRecordRows(relFrom), ...asRecordRows(relTo)]) {
    const rid = readStringId(r.id);
    if (rid) relById.set(rid, r);
  }

  const related_relationships = [...relById.values()].map((r) => {
    const fromId = readStringId(r.from_entity_id);
    const toId = readStringId(r.to_entity_id);
    const fromE = fromId ? entityById.get(fromId) : undefined;
    const toE = toId ? entityById.get(toId) : undefined;
    return {
      ...r,
      from_display_name: fromE && typeof fromE.display_name === 'string' ? fromE.display_name : null,
      to_display_name: toE && typeof toE.display_name === 'string' ? toE.display_name : null,
    };
  });

  const related_properties = asRecordRows(propData).map((p) => {
    const eid = readStringId(p.entity_id);
    const ent = eid ? entityById.get(eid) : undefined;
    return {
      ...p,
      entity_display_name: ent && typeof ent.display_name === 'string' ? ent.display_name : null,
    };
  });

  const matched_aliases = matchedAliasRows.map((a) => {
    const eid = readStringId(a.entity_id);
    const ent = eid ? entityById.get(eid) : undefined;
    return {
      ...a,
      entity_display_name: ent && typeof ent.display_name === 'string' ? ent.display_name : null,
    };
  });

  const ontology_payload: OntologyResolverPayload = {
    schema_version: 1,
    group_id: input.group_id,
    entities: matched_entities.map((e) => ({ ...e })),
    aliases: matched_aliases.map((a) => ({ ...a })),
    properties: related_properties.map((p) => ({ ...p })),
    relationships: related_relationships.map((r) => ({ ...r })),
  };

  return {
    group_id: input.group_id,
    has_relevant_ontology: true,
    matched_entities: ontology_payload.entities,
    matched_aliases: ontology_payload.aliases,
    related_properties: ontology_payload.properties,
    related_relationships: ontology_payload.relationships,
    ontology_payload,
  };
}
