import type {
  OntologyConcept,
  OntologyDraft,
  OntologyRelation,
  ValidateOntologyDraftResult,
} from '../types/ontology.ts';

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizeConcept(raw: unknown, index: number): { ok: true; value: OntologyConcept } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: `concepts[${index}] must be an object` };
  }
  const o = raw as Record<string, unknown>;
  const id = isNonEmptyString(o.id) ? o.id.trim() : '';
  const label = isNonEmptyString(o.label) ? o.label.trim() : '';
  if (!id) return { ok: false, error: `concepts[${index}].id is required` };
  if (!label) return { ok: false, error: `concepts[${index}].label is required` };

  const description = isNonEmptyString(o.description) ? o.description.trim() : undefined;
  let synonyms: string[] | undefined;
  if (Array.isArray(o.synonyms)) {
    synonyms = o.synonyms.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim());
    if (synonyms.length === 0) synonyms = undefined;
  }

  return {
    ok: true,
    value: { id, label, description, synonyms },
  };
}

function normalizeRelation(raw: unknown, index: number): { ok: true; value: OntologyRelation } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: `relations[${index}] must be an object` };
  }
  const o = raw as Record<string, unknown>;
  const fromConceptId = isNonEmptyString(o.fromConceptId) ? o.fromConceptId.trim() : '';
  const toConceptId = isNonEmptyString(o.toConceptId) ? o.toConceptId.trim() : '';
  const relationType = isNonEmptyString(o.relationType) ? o.relationType.trim() : '';
  if (!fromConceptId) return { ok: false, error: `relations[${index}].fromConceptId is required` };
  if (!toConceptId) return { ok: false, error: `relations[${index}].toConceptId is required` };
  if (!relationType) return { ok: false, error: `relations[${index}].relationType is required` };
  const notes = isNonEmptyString(o.notes) ? o.notes.trim() : undefined;
  return { ok: true, value: { fromConceptId, toConceptId, relationType, notes } };
}

/**
 * Validates and normalizes an ontology draft (admin-feedback extraction path).
 * TODO(runtime-resolver): enforce vocabulary / namespace rules aligned with resolver indexes.
 */
export function validateOntologyDraft(input: unknown): ValidateOntologyDraftResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Body must be an object'], normalized: null };
  }

  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.concepts)) {
    return { valid: false, errors: ['concepts must be an array'], normalized: null };
  }

  const concepts: OntologyConcept[] = [];
  for (let i = 0; i < obj.concepts.length; i++) {
    const r = normalizeConcept(obj.concepts[i], i);
    if (!r.ok) errors.push(r.error);
    else concepts.push(r.value);
  }

  const relationsRaw = obj.relations;
  const relations: OntologyRelation[] = [];
  if (relationsRaw !== undefined) {
    if (!Array.isArray(relationsRaw)) {
      errors.push('relations must be an array when provided');
    } else {
      for (let i = 0; i < relationsRaw.length; i++) {
        const r = normalizeRelation(relationsRaw[i], i);
        if (!r.ok) errors.push(r.error);
        else relations.push(r.value);
      }
    }
  }

  const conceptIds = new Set(concepts.map((c) => c.id));
  for (let i = 0; i < relations.length; i++) {
    const rel = relations[i];
    if (!conceptIds.has(rel.fromConceptId)) {
      errors.push(`relations[${i}].fromConceptId "${rel.fromConceptId}" is not a known concept id`);
    }
    if (!conceptIds.has(rel.toConceptId)) {
      errors.push(`relations[${i}].toConceptId "${rel.toConceptId}" is not a known concept id`);
    }
  }

  const sourceSummary = isNonEmptyString(obj.sourceSummary) ? obj.sourceSummary.trim() : undefined;

  if (errors.length > 0) {
    return { valid: false, errors, normalized: null };
  }

  const normalized: OntologyDraft = {
    concepts,
    relations,
    ...(sourceSummary !== undefined ? { sourceSummary } : {}),
  };

  return { valid: true, errors: [], normalized };
}
