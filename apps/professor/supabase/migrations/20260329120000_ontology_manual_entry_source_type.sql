-- Allow ontology_sources.source_type = manual_entry (Ontology Management page).
ALTER TABLE public.ontology_sources DROP CONSTRAINT IF EXISTS ontology_sources_source_type_check;

ALTER TABLE public.ontology_sources ADD CONSTRAINT ontology_sources_source_type_check CHECK (
  source_type = ANY (
    ARRAY[
      'admin_feedback'::text,
      'document'::text,
      'manual'::text,
      'manual_entry'::text,
      'chat_transcript'::text
    ]
  )
);
