-- Allow arbitrary relationship labels (admin/manual edits), not only the original enum.

ALTER TABLE public.ontology_relationships
  DROP CONSTRAINT IF EXISTS ontology_relationships_relation_type_check;
