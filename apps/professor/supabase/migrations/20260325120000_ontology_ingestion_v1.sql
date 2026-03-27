-- Ontology ingestion (group-scoped). FK group_id -> public."group"(group_id).
-- Aligns with persistApprovedOntology in apps/professor/server/services/ontologySupabase.ts.

CREATE OR REPLACE FUNCTION public.ontology_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- ontology_sources
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public."group" (group_id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_text text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ontology_sources_source_type_check CHECK (
    source_type = ANY (
      ARRAY[
        'admin_feedback'::text,
        'document'::text,
        'manual'::text,
        'manual_entry'::text,
        'chat_transcript'::text
      ]
    )
  )
);

CREATE INDEX ontology_sources_group_created_idx
  ON public.ontology_sources (group_id, created_at DESC);

COMMENT ON TABLE public.ontology_sources IS
  'One ingestion batch per group: raw source text and metadata from extract-preview / approve-and-save.';

-- ---------------------------------------------------------------------------
-- ontology_entities
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public."group" (group_id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  display_name text NOT NULL,
  entity_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  source_id uuid NOT NULL REFERENCES public.ontology_sources (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ontology_entities_entity_type_check CHECK (
    entity_type = ANY (
      ARRAY[
        'benefit'::text,
        'provider'::text,
        'policy'::text,
        'event'::text,
        'system'::text,
        'department'::text,
        'form'::text,
        'term'::text,
        'person'::text
      ]
    )
  ),
  CONSTRAINT ontology_entities_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'deprecated'::text])
  )
);

CREATE INDEX ontology_entities_group_canonical_idx
  ON public.ontology_entities (group_id, canonical_name);
CREATE INDEX ontology_entities_source_id_idx ON public.ontology_entities (source_id);

CREATE TRIGGER ontology_entities_set_updated_at
  BEFORE UPDATE ON public.ontology_entities
  FOR EACH ROW
  EXECUTE PROCEDURE public.ontology_set_updated_at();

-- ---------------------------------------------------------------------------
-- ontology_aliases
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public."group" (group_id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.ontology_entities (id) ON DELETE CASCADE,
  alias_text text NOT NULL,
  alias_language text,
  alias_type text,
  source_id uuid NOT NULL REFERENCES public.ontology_sources (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ontology_aliases_unique_per_entity UNIQUE (entity_id, alias_text)
);

CREATE INDEX ontology_aliases_source_id_idx ON public.ontology_aliases (source_id);
CREATE INDEX ontology_aliases_entity_id_idx ON public.ontology_aliases (entity_id);

-- ---------------------------------------------------------------------------
-- ontology_relationships
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public."group" (group_id) ON DELETE CASCADE,
  from_entity_id uuid NOT NULL REFERENCES public.ontology_entities (id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  to_entity_id uuid NOT NULL REFERENCES public.ontology_entities (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  source_id uuid NOT NULL REFERENCES public.ontology_sources (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ontology_relationships_relation_type_check CHECK (
    relation_type = ANY (
      ARRAY[
        'provided_by'::text,
        'uses_system'::text,
        'managed_by'::text,
        'requires_form'::text,
        'part_of'::text,
        'related_to'::text,
        'occurs_on'::text,
        'has_contact'::text
      ]
    )
  ),
  CONSTRAINT ontology_relationships_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'deprecated'::text])
  )
);

CREATE INDEX ontology_relationships_source_id_idx ON public.ontology_relationships (source_id);
CREATE INDEX ontology_relationships_from_idx ON public.ontology_relationships (from_entity_id);
CREATE INDEX ontology_relationships_to_idx ON public.ontology_relationships (to_entity_id);

-- ---------------------------------------------------------------------------
-- ontology_properties
-- ---------------------------------------------------------------------------
CREATE TABLE public.ontology_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id text NOT NULL REFERENCES public."group" (group_id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES public.ontology_entities (id) ON DELETE CASCADE,
  property_key text NOT NULL,
  property_value_text text NOT NULL,
  value_type text NOT NULL DEFAULT 'string',
  status text NOT NULL DEFAULT 'active',
  source_id uuid NOT NULL REFERENCES public.ontology_sources (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ontology_properties_value_type_check CHECK (
    value_type = ANY (
      ARRAY['string'::text, 'number'::text, 'boolean'::text, 'date'::text]
    )
  ),
  CONSTRAINT ontology_properties_status_check CHECK (
    status = ANY (ARRAY['active'::text, 'deprecated'::text])
  ),
  CONSTRAINT ontology_properties_unique_key_per_entity UNIQUE (entity_id, property_key)
);

CREATE INDEX ontology_properties_source_id_idx ON public.ontology_properties (source_id);
CREATE INDEX ontology_properties_entity_id_idx ON public.ontology_properties (entity_id);

-- ---------------------------------------------------------------------------
-- RLS (service role bypasses)
-- ---------------------------------------------------------------------------
ALTER TABLE public.ontology_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ontology_properties ENABLE ROW LEVEL SECURITY;
