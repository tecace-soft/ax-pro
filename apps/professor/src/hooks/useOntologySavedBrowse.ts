import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type OntologyRequestAuthContext,
  fetchOntologyAliasesList,
  fetchOntologyEntitiesList,
  fetchOntologyPropertiesList,
  fetchOntologyRelationshipsList,
  OntologyApiError,
} from '../services/ontology';

export type SavedOntologySubTab = 'entities' | 'aliases' | 'relationships' | 'properties';

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

export function useOntologySavedBrowse(groupId: string, auth?: OntologyRequestAuthContext) {
  const [subTab, setSubTab] = useState<SavedOntologySubTab>('entities');
  const [includeDeprecated, setIncludeDeprecated] = useState(false);

  const [entityQ, setEntityQ] = useState('');
  const [entityType, setEntityType] = useState('');
  const debouncedEntityQ = useDebounced(entityQ, 350);
  const debouncedEntityType = useDebounced(entityType, 200);

  const [aliasQ, setAliasQ] = useState('');
  const debouncedAliasQ = useDebounced(aliasQ, 350);

  const [relationType, setRelationType] = useState('');
  const debouncedRelationType = useDebounced(relationType, 200);

  const [propertyQ, setPropertyQ] = useState('');
  const debouncedPropertyQ = useDebounced(propertyQ, 350);

  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [aliases, setAliases] = useState<Record<string, unknown>[]>([]);
  const [relationships, setRelationships] = useState<Record<string, unknown>[]>([]);
  const [properties, setProperties] = useState<Record<string, unknown>[]>([]);

  const [loadingEntities, setLoadingEntities] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [loadingRelationships, setLoadingRelationships] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(false);

  const [errorEntities, setErrorEntities] = useState<string | null>(null);
  const [errorAliases, setErrorAliases] = useState<string | null>(null);
  const [errorRelationships, setErrorRelationships] = useState<string | null>(null);
  const [errorProperties, setErrorProperties] = useState<string | null>(null);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadEntities = useCallback(async () => {
    if (!groupId.trim()) return;
    setLoadingEntities(true);
    setErrorEntities(null);
    try {
      const res = await fetchOntologyEntitiesList(
        {
          group_id: groupId,
          q: debouncedEntityQ || undefined,
          entity_type: debouncedEntityType || undefined,
          include_deprecated: includeDeprecated,
        },
        auth
      );
      if (!mounted.current) return;
      setEntities(res.items);
    } catch (e) {
      if (!mounted.current) return;
      setEntities([]);
      setErrorEntities(e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load entities');
    } finally {
      if (mounted.current) setLoadingEntities(false);
    }
  }, [groupId, debouncedEntityQ, debouncedEntityType, includeDeprecated, auth]);

  const loadAliases = useCallback(async () => {
    if (!groupId.trim()) return;
    setLoadingAliases(true);
    setErrorAliases(null);
    try {
      const res = await fetchOntologyAliasesList(
        {
          group_id: groupId,
          q: debouncedAliasQ || undefined,
          include_deprecated: includeDeprecated,
        },
        auth
      );
      if (!mounted.current) return;
      setAliases(res.items);
    } catch (e) {
      if (!mounted.current) return;
      setAliases([]);
      setErrorAliases(e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load aliases');
    } finally {
      if (mounted.current) setLoadingAliases(false);
    }
  }, [groupId, debouncedAliasQ, includeDeprecated, auth]);

  const loadRelationships = useCallback(async () => {
    if (!groupId.trim()) return;
    setLoadingRelationships(true);
    setErrorRelationships(null);
    try {
      const res = await fetchOntologyRelationshipsList(
        {
          group_id: groupId,
          relation_type: debouncedRelationType || undefined,
          include_deprecated: includeDeprecated,
        },
        auth
      );
      if (!mounted.current) return;
      setRelationships(res.items);
    } catch (e) {
      if (!mounted.current) return;
      setRelationships([]);
      setErrorRelationships(
        e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load relationships'
      );
    } finally {
      if (mounted.current) setLoadingRelationships(false);
    }
  }, [groupId, debouncedRelationType, includeDeprecated, auth]);

  const loadProperties = useCallback(async () => {
    if (!groupId.trim()) return;
    setLoadingProperties(true);
    setErrorProperties(null);
    try {
      const res = await fetchOntologyPropertiesList(
        {
          group_id: groupId,
          q: debouncedPropertyQ || undefined,
          include_deprecated: includeDeprecated,
        },
        auth
      );
      if (!mounted.current) return;
      setProperties(res.items);
    } catch (e) {
      if (!mounted.current) return;
      setProperties([]);
      setErrorProperties(
        e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load properties'
      );
    } finally {
      if (mounted.current) setLoadingProperties(false);
    }
  }, [groupId, debouncedPropertyQ, includeDeprecated, auth]);

  useEffect(() => {
    if (subTab !== 'entities') return;
    void loadEntities();
  }, [subTab, loadEntities]);

  useEffect(() => {
    if (subTab !== 'aliases') return;
    void loadAliases();
  }, [subTab, loadAliases]);

  useEffect(() => {
    if (subTab !== 'relationships') return;
    void loadRelationships();
  }, [subTab, loadRelationships]);

  useEffect(() => {
    if (subTab !== 'properties') return;
    void loadProperties();
  }, [subTab, loadProperties]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadEntities(), loadAliases(), loadRelationships(), loadProperties()]);
  }, [loadEntities, loadAliases, loadRelationships, loadProperties]);

  return {
    subTab,
    setSubTab,
    includeDeprecated,
    setIncludeDeprecated,
    entityQ,
    setEntityQ,
    entityType,
    setEntityType,
    aliasQ,
    setAliasQ,
    relationType,
    setRelationType,
    propertyQ,
    setPropertyQ,
    entities,
    aliases,
    relationships,
    properties,
    loadingEntities,
    loadingAliases,
    loadingRelationships,
    loadingProperties,
    errorEntities,
    errorAliases,
    errorRelationships,
    errorProperties,
    refreshEntities: loadEntities,
    refreshAliases: loadAliases,
    refreshRelationships: loadRelationships,
    refreshProperties: loadProperties,
    refreshAll,
  };
}
