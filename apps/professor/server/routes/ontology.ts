import { Router } from 'express';
import type { ApproveAndSaveRequestBody } from '../types/ontology.ts';
import {
  getOntologyServerEnv,
  missingForOntologyExtract,
  missingForOntologyPersist,
  missingForFullOntologyIngestion,
} from '../config/ontologyEnv.ts';
import {
  OntologyPersistenceError,
  persistApprovedOntology,
} from '../services/ontologySupabase.ts';
import { validateOntologyExtractPreviewBody } from '../services/ontologyExtractPreview.ts';
import { extractOntologyPreviewWithOpenAI } from '../services/ontologyStructuredExtract.ts';
import { validateApproveAndSaveBody } from '../services/ontologyApproveAndSave.ts';
import {
  listOntologyAliases,
  listOntologyEntities,
  listOntologyProperties,
  listOntologyRelationships,
  parseOntologyListBaseQuery,
} from '../services/ontologyRead.ts';
import {
  OntologyResolverError,
  resolveOntologyForUserMessage,
  validateResolveQueryBody,
} from '../services/ontologyResolveQuery.ts';

export interface OntologyRouterDeps {
  /** Cookie demo auth + admin role (same pattern as server/index.ts). */
  requireAdmin: (req: any, res: any, next: any) => void;
}

function listGroupIdMatchesHeader(req: any, groupId: string): boolean {
  const raw = req.headers?.['x-ax-group-id'];
  const header = typeof raw === 'string' ? raw.trim() : '';
  if (!header) return true;
  return header === groupId;
}

/**
 * Ontology ingestion + list + runtime resolve-query (n8n). Mounted at /api/ontology.
 */
function readOntologyResolverKeyFromRequest(req: any): string {
  const h = req.headers?.['x-ontology-resolver-key'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  const auth = req.headers?.['authorization'];
  if (typeof auth === 'string') {
    const m = auth.match(/^\s*Bearer\s+(.+)\s*$/i);
    if (m?.[1]) return m[1].trim();
  }
  return '';
}

/**
 * n8n / Postman: set ONTOLOGY_RESOLVER_API_KEY in apps/professor/.env and restart the server.
 * Send either header x-ontology-resolver-key: <key> or Authorization: Bearer <key>.
 * If the env var is unset, falls back to requireAdmin (browser session / group headers).
 */
function createRequireResolveQuery(requireAdmin: OntologyRouterDeps['requireAdmin']) {
  return (req: any, res: any, next: any) => {
    const expected = process.env.ONTOLOGY_RESOLVER_API_KEY?.trim();
    if (expected) {
      const got = readOntologyResolverKeyFromRequest(req);
      if (got === expected) return next();
      return res.status(401).json({
        error: 'Unauthorized',
        details:
          'Invalid or missing resolver credentials. Use x-ontology-resolver-key or Authorization: Bearer (same value as ONTOLOGY_RESOLVER_API_KEY).',
      });
    }
    return requireAdmin(req, res, next);
  };
}

export function createOntologyRouter(deps: OntologyRouterDeps): Router {
  const router = Router();
  const { requireAdmin } = deps;
  const requireResolveQuery = createRequireResolveQuery(requireAdmin);

  const listHandler = (resource: 'entities' | 'aliases' | 'relationships' | 'properties') =>
    async (req: any, res: any) => {
      const missing = missingForOntologyPersist();
      if (missing.length > 0) {
        return res.status(503).json({
          error: 'Ontology persistence is not configured',
          missingEnv: missing,
        });
      }

      const parsed = parseOntologyListBaseQuery(req.query as Record<string, unknown>);
      if (!parsed.ok) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
      }
      if (!listGroupIdMatchesHeader(req, parsed.group_id)) {
        return res.status(403).json({ error: 'Forbidden', details: 'group_id must match x-ax-group-id header' });
      }

      try {
        const q = typeof req.query.q === 'string' ? req.query.q : undefined;
        const entity_type = typeof req.query.entity_type === 'string' ? req.query.entity_type : undefined;
        const relation_type = typeof req.query.relation_type === 'string' ? req.query.relation_type : undefined;

        const base = {
          group_id: parsed.group_id,
          limit: parsed.limit,
          include_deprecated: parsed.include_deprecated,
        };

        let result: { items: unknown[] };
        if (resource === 'entities') {
          result = await listOntologyEntities({ ...base, q, entity_type });
        } else if (resource === 'aliases') {
          result = await listOntologyAliases({ ...base, q });
        } else if (resource === 'relationships') {
          result = await listOntologyRelationships({ ...base, relation_type });
        } else {
          result = await listOntologyProperties({ ...base, q });
        }

        return res.json({
          group_id: parsed.group_id,
          include_deprecated: parsed.include_deprecated,
          items: result.items,
          count: result.items.length,
        });
      } catch (err: unknown) {
        console.error(`[ontology/list ${resource}]`, err);
        if (err instanceof OntologyPersistenceError) {
          return res.status(502).json({ error: 'List failed', code: err.code, message: err.message });
        }
        const message = err instanceof Error ? err.message : String(err);
        return res.status(500).json({ error: 'List failed', message });
      }
    };

  router.get('/entities', requireAdmin, listHandler('entities'));
  router.get('/aliases', requireAdmin, listHandler('aliases'));
  router.get('/relationships', requireAdmin, listHandler('relationships'));
  router.get('/properties', requireAdmin, listHandler('properties'));

  router.get('/health', (_req, res) => {
    const env = getOntologyServerEnv();
    const missingExtract = missingForOntologyExtract(env);
    const missingPersist = missingForOntologyPersist(env);
    const missingFull = missingForFullOntologyIngestion(env);

    res.json({
      status: 'ok',
      ontology: {
        extractPreviewUsesOpenAi: true,
        llmExtractReady: missingExtract.length === 0,
        persistReady: missingPersist.length === 0,
        fullPipelineReady: missingFull.length === 0,
        missingForLlmExtract: missingExtract,
        missingForPersist: missingPersist,
        missingForFullPipeline: missingFull,
        table: env.tableName,
        openaiModel: env.openaiModel,
      },
      resolver: {
        resolveQueryPath: '/api/ontology/resolve-query',
        apiKeyAuth: !!process.env.ONTOLOGY_RESOLVER_API_KEY?.trim(),
      },
    });
  });

  router.post('/resolve-query', requireResolveQuery, async (req, res) => {
    const missing = missingForOntologyPersist();
    if (missing.length > 0) {
      return res.status(503).json({
        error: 'Ontology resolver is not configured',
        missingEnv: missing,
      });
    }

    const parsed = validateResolveQueryBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    }

    if (!listGroupIdMatchesHeader(req, parsed.value.group_id)) {
      return res.status(403).json({ error: 'Forbidden', details: 'group_id must match x-ax-group-id header when sent' });
    }

    try {
      const result = await resolveOntologyForUserMessage(parsed.value);
      return res.json(result);
    } catch (err: unknown) {
      console.error('[ontology/resolve-query]', err);
      if (err instanceof OntologyResolverError) {
        return res.status(502).json({
          error: 'Resolve query failed',
          code: err.code,
          message: err.message,
        });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Resolve query failed', message });
    }
  });

  router.post('/extract-preview', requireAdmin, async (req, res) => {
    const parsed = validateOntologyExtractPreviewBody(req.body);
    if (!parsed.ok) {
      return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
    }

    const missing = missingForOntologyExtract();
    if (missing.length > 0) {
      return res.status(503).json({
        error: 'OpenAI extraction is not configured',
        missingEnv: missing,
      });
    }

    try {
      const preview = await extractOntologyPreviewWithOpenAI(parsed.value);
      return res.json(preview);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[ontology/extract-preview]', err);
      return res.status(502).json({ error: 'Extract preview failed', message });
    }
  });

  router.post('/approve-and-save', requireAdmin, async (req, res) => {
    const missing = missingForOntologyPersist();
    if (missing.length > 0) {
      return res.status(503).json({
        error: 'Ontology persistence is not configured',
        missingEnv: missing,
      });
    }

    try {
      const parsed = validateApproveAndSaveBody(req.body as ApproveAndSaveRequestBody | undefined);
      if (!parsed.ok) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.errors });
      }

      const headerUid =
        typeof (req as { headers?: Record<string, unknown> }).headers?.['x-ax-user-id'] === 'string'
          ? String((req as { headers: Record<string, string> }).headers['x-ax-user-id']).trim()
          : '';
      const reqUid =
        typeof (req as { userId?: string }).userId === 'string' ? (req as { userId: string }).userId.trim() : '';
      const resolvedCreatedBy = headerUid || reqUid;

      if (!resolvedCreatedBy) {
        return res.status(400).json({
          error: 'created_by required',
          details:
            'ontology_sources.created_by must be the Supabase user.user_id. Send x-ax-user-id with the logged-in user id.',
        });
      }
      if (resolvedCreatedBy.includes('@')) {
        return res.status(400).json({
          error: 'created_by must be user_id',
          details:
            'ontology_sources.created_by references user(user_id); use the Supabase user id, not an email (set x-ax-user-id from session.userId).',
        });
      }

      const userId = resolvedCreatedBy;

      const result = await persistApprovedOntology({
        ...parsed.value,
        created_by: resolvedCreatedBy,
        approvedBy: userId,
      });

      console.info('[ontology/approve-and-save] ok', {
        group_id: parsed.value.group_id,
        source_id: result.source_id,
        createdCounts: {
          entities: result.created.entities.length,
          aliases: result.created.aliases.length,
          relationships: result.created.relationships.length,
          properties: result.created.properties.length,
        },
        linkedEntities: result.linked_existing.entities.length,
        skipped: {
          aliases: result.skipped_duplicate.aliases.length,
          relationships: result.skipped_duplicate.relationships.length,
          properties: result.skipped_duplicate.properties.length,
        },
        conflicts: {
          entities: result.conflict.entities.length,
          aliases: result.conflict.aliases.length,
          properties: result.conflict.properties.length,
        },
      });

      return res.json({
        ...result,
        // TODO(runtime-resolver): trigger resolver rebuild or enqueue async job here
      });
    } catch (err: unknown) {
      console.error('[ontology/approve-and-save]', err);
      if (err instanceof OntologyPersistenceError) {
        return res.status(502).json({
          error: 'Persist failed',
          code: err.code,
          message: err.message,
        });
      }
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: 'Persist failed', message });
    }
  });

  return router;
}
