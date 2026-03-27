/**
 * Ontology ingestion — server-only environment (never use VITE_* for secrets).
 *
 * Required for POST /api/ontology/extract-preview (OpenAI structured extraction):
 *   - OPENAI_API_KEY
 *
 * Required for POST /api/ontology/approve-and-save:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   - OPENAI_MODEL — chat model for extraction (default: gpt-4o-mini).
 *     Legacy: ONTOLOGY_EXTRACTION_MODEL is still read if OPENAI_MODEL is unset.
 *   - ONTOLOGY_TABLE — target table name (default: hr_ontology_ingestions).
 *
 * URL convenience (non-secret): if SUPABASE_URL is unset, VITE_SUPABASE_URL may be
 * read so a shared apps/professor .env can supply the project URL without duplicating.
 * Service role key must be SUPABASE_SERVICE_ROLE_KEY only (no anon fallback).
 */

export interface OntologyServerEnv {
  openaiApiKey: string | undefined;
  openaiModel: string;
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  tableName: string;
}

let cached: OntologyServerEnv | null = null;

export function getOntologyServerEnv(): OntologyServerEnv {
  if (cached) return cached;
  const openaiModel =
    (process.env.OPENAI_MODEL && process.env.OPENAI_MODEL.trim()) ||
    (process.env.ONTOLOGY_EXTRACTION_MODEL && process.env.ONTOLOGY_EXTRACTION_MODEL.trim()) ||
    'gpt-4o-mini';

  cached = {
    openaiApiKey: process.env.OPENAI_API_KEY?.trim() || undefined,
    openaiModel,
    supabaseUrl:
      (process.env.SUPABASE_URL && process.env.SUPABASE_URL.trim()) ||
      (process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_URL.trim()) ||
      undefined,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    tableName: (process.env.ONTOLOGY_TABLE && process.env.ONTOLOGY_TABLE.trim()) || 'hr_ontology_ingestions',
  };
  return cached;
}

/** For tests or reloading env in unusual setups */
export function resetOntologyServerEnvCache(): void {
  cached = null;
}

export function missingForOntologyExtract(env: OntologyServerEnv = getOntologyServerEnv()): string[] {
  const m: string[] = [];
  if (!env.openaiApiKey) m.push('OPENAI_API_KEY');
  return m;
}

export function missingForOntologyPersist(env: OntologyServerEnv = getOntologyServerEnv()): string[] {
  const m: string[] = [];
  if (!env.supabaseUrl) m.push('SUPABASE_URL');
  if (!env.supabaseServiceRoleKey) m.push('SUPABASE_SERVICE_ROLE_KEY');
  return m;
}

export function missingForFullOntologyIngestion(env: OntologyServerEnv = getOntologyServerEnv()): string[] {
  return [...new Set([...missingForOntologyExtract(env), ...missingForOntologyPersist(env)])];
}

export function logOntologyConfigurationStatus(): void {
  const env = getOntologyServerEnv();
  const missing = missingForFullOntologyIngestion(env);
  console.log('[Ontology] Config:', {
    openaiKeySet: !!env.openaiApiKey,
    openaiModel: env.openaiModel,
    supabaseUrlSet: !!env.supabaseUrl,
    serviceRoleKeySet: !!env.supabaseServiceRoleKey,
    table: env.tableName,
    missingForFullPipeline: missing.length ? missing : undefined,
  });
}
