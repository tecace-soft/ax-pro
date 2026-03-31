import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SavedOntologySubTab } from '../../../hooks/useOntologySavedBrowse';
import type { OntologyRequestAuthContext } from '../../../services/ontology';
import {
  ONTOLOGY_ENTITY_TYPES_OPTIONS,
  OntologyApiError,
  createOntologySavedRow,
  fetchOntologyEntitiesList,
  normalizeOntologyId,
} from '../../../services/ontology';

const PROPERTY_VALUE_TYPES = ['string', 'number', 'boolean', 'date'] as const;
const STATUS_OPTIONS = ['active', 'deprecated'] as const;

function canonicalPreview(display: string): string {
  return display
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Match RecentConversations supervisor correction modal field styles (Dashboard). */
const controlStyle = {
  backgroundColor: 'var(--admin-card-bg)',
  color: 'var(--admin-text)',
  border: '1px solid var(--admin-border)',
} as const;

export default function OntologyCreateModal({
  open,
  tab,
  groupId,
  authContext,
  onClose,
  onCreated,
}: {
  open: boolean;
  tab: SavedOntologySubTab;
  groupId: string;
  authContext?: OntologyRequestAuthContext;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Record<string, unknown>[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [displayName, setDisplayName] = useState('');
  const [entityType, setEntityType] = useState<string>(ONTOLOGY_ENTITY_TYPES_OPTIONS[0]);
  const [description, setDescription] = useState('');
  const [entityStatus, setEntityStatus] = useState<string>('active');

  const [aliasEntityId, setAliasEntityId] = useState('');
  const [aliasText, setAliasText] = useState('');
  const [aliasLanguage, setAliasLanguage] = useState('');
  const [aliasType, setAliasType] = useState('');

  const [fromEntityId, setFromEntityId] = useState('');
  const [toEntityId, setToEntityId] = useState('');
  const [relationType, setRelationType] = useState<string>('related_to');
  const [relStatus, setRelStatus] = useState<string>('active');

  const [propEntityId, setPropEntityId] = useState('');
  const [propKey, setPropKey] = useState('');
  const [propValue, setPropValue] = useState('');
  const [propValueType, setPropValueType] = useState<string>('string');
  const [propStatus, setPropStatus] = useState<string>('active');

  const resetForms = useCallback(() => {
    setLocalError(null);
    setDisplayName('');
    setEntityType(ONTOLOGY_ENTITY_TYPES_OPTIONS[0]);
    setDescription('');
    setEntityStatus('active');
    setAliasEntityId('');
    setAliasText('');
    setAliasLanguage('');
    setAliasType('');
    setFromEntityId('');
    setToEntityId('');
    setRelationType('related_to');
    setRelStatus('active');
    setPropEntityId('');
    setPropKey('');
    setPropValue('');
    setPropValueType('string');
    setPropStatus('active');
  }, []);

  useEffect(() => {
    if (!open) {
      resetForms();
      return;
    }
    resetForms();
    if (tab === 'entities') return;
    setLoadingEntities(true);
    void (async () => {
      try {
        const res = await fetchOntologyEntitiesList(
          { group_id: groupId, include_deprecated: true, limit: 2000 },
          authContext
        );
        if (!mounted.current) return;
        setEntities(res.items);
        const firstId = normalizeOntologyId(res.items[0]?.id);
        if (firstId) {
          setAliasEntityId(firstId);
          setFromEntityId(firstId);
          setToEntityId(firstId);
          setPropEntityId(firstId);
        }
      } catch (e) {
        if (!mounted.current) return;
        setLocalError(
          e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load entities'
        );
        setEntities([]);
      } finally {
        if (mounted.current) setLoadingEntities(false);
      }
    })();
  }, [open, tab, groupId, authContext, resetForms]);

  const entityOptions = useMemo(() => {
    return [...entities]
      .map((row) => {
        const id = normalizeOntologyId(row.id);
        const dn = typeof row.display_name === 'string' ? row.display_name : '';
        return id ? { id, label: dn || id } : null;
      })
      .filter((x): x is { id: string; label: string } => x != null)
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [entities]);

  const canonical = useMemo(() => canonicalPreview(displayName), [displayName]);

  const title =
    tab === 'entities'
      ? 'Add entity'
      : tab === 'aliases'
        ? 'Add alias'
        : tab === 'relationships'
          ? 'Add relationship'
          : 'Add property';

  const handleCreate = useCallback(async () => {
    if (!authContext?.userId?.trim()) {
      setLocalError('Missing user id for created_by. Ensure you are signed in (x-ax-user-id).');
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      if (tab === 'entities') {
        const dn = displayName.trim();
        if (!dn) {
          setLocalError('Display name is required.');
          setBusy(false);
          return;
        }
        if (!canonical) {
          setLocalError('Display name must include letters or digits for canonical name.');
          setBusy(false);
          return;
        }
        await createOntologySavedRow(
          {
            resource: 'entity',
            group_id: groupId,
            display_name: dn,
            entity_type: entityType,
            ...(description.trim() ? { description: description.trim() } : {}),
            status: entityStatus,
          },
          authContext
        );
      } else if (tab === 'aliases') {
        if (!aliasEntityId) {
          setLocalError('Select an entity.');
          setBusy(false);
          return;
        }
        const at = aliasText.trim();
        if (!at) {
          setLocalError('Alias text is required.');
          setBusy(false);
          return;
        }
        await createOntologySavedRow(
          {
            resource: 'alias',
            group_id: groupId,
            entity_id: aliasEntityId,
            alias_text: at,
            ...(aliasLanguage.trim() ? { alias_language: aliasLanguage.trim() } : {}),
            ...(aliasType.trim() ? { alias_type: aliasType.trim() } : {}),
          },
          authContext
        );
      } else if (tab === 'relationships') {
        if (!fromEntityId || !toEntityId) {
          setLocalError('Select both entities.');
          setBusy(false);
          return;
        }
        const rt = relationType.trim();
        if (!rt) {
          setLocalError('Relationship label is required.');
          setBusy(false);
          return;
        }
        await createOntologySavedRow(
          {
            resource: 'relationship',
            group_id: groupId,
            from_entity_id: fromEntityId,
            to_entity_id: toEntityId,
            relation_type: rt,
            status: relStatus,
          },
          authContext
        );
      } else {
        if (!propEntityId) {
          setLocalError('Select an entity.');
          setBusy(false);
          return;
        }
        const pk = propKey.trim();
        if (!pk) {
          setLocalError('Property key is required.');
          setBusy(false);
          return;
        }
        await createOntologySavedRow(
          {
            resource: 'property',
            group_id: groupId,
            entity_id: propEntityId,
            property_key: pk,
            property_value_text: propValue,
            value_type: propValueType,
            status: propStatus,
          },
          authContext
        );
      }
      onCreated();
      onClose();
      resetForms();
    } catch (e) {
      setLocalError(e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }, [
    authContext,
    tab,
    groupId,
    displayName,
    canonical,
    entityType,
    description,
    entityStatus,
    aliasEntityId,
    aliasText,
    aliasLanguage,
    aliasType,
    fromEntityId,
    toEntityId,
    relationType,
    relStatus,
    propEntityId,
    propKey,
    propValue,
    propValueType,
    propStatus,
    onCreated,
    onClose,
    resetForms,
  ]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ontology-create-title"
        className="rounded-lg max-w-2xl w-full mx-4"
        style={{
          backgroundColor: 'var(--admin-bg-card)',
          border: '1px solid var(--admin-border)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 id="ontology-create-title" className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
              {title}
            </h3>
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="p-1 hover:bg-gray-100/10 rounded"
              style={{ color: 'var(--admin-text-secondary)' }}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div>
            {tab === 'entities' && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Display name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Canonical name
                  </label>
                  <input
                    value={canonical || ''}
                    readOnly
                    className="w-full text-sm p-3 rounded"
                    style={{ ...controlStyle, opacity: 0.85, cursor: 'not-allowed' }}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Entity type
                  </label>
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                  >
                    {ONTOLOGY_ENTITY_TYPES_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full resize-y text-sm p-3 rounded"
                    style={controlStyle}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Status
                  </label>
                  <select
                    value={entityStatus}
                    onChange={(e) => setEntityStatus(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {tab === 'aliases' && (
              <>
                {loadingEntities ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Loading entities…
                  </p>
                ) : entityOptions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    No entities in this group. Create an entity first.
                  </p>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                      Entity
                    </label>
                    <select
                      value={aliasEntityId}
                      onChange={(e) => setAliasEntityId(e.target.value)}
                      className="w-full text-sm p-3 rounded"
                      style={controlStyle}
                    >
                      {entityOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Alias
                  </label>
                  <input
                    value={aliasText}
                    onChange={(e) => setAliasText(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Language <span style={{ color: 'var(--admin-text-muted)' }}>(optional)</span>
                  </label>
                  <input
                    value={aliasLanguage}
                    onChange={(e) => setAliasLanguage(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Type <span style={{ color: 'var(--admin-text-muted)' }}>(optional)</span>
                  </label>
                  <input
                    value={aliasType}
                    onChange={(e) => setAliasType(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
              </>
            )}

            {tab === 'relationships' && (
              <>
                {loadingEntities ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Loading entities…
                  </p>
                ) : entityOptions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    No entities in this group. Create an entity first.
                  </p>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                        From entity
                      </label>
                      <select
                        value={fromEntityId}
                        onChange={(e) => setFromEntityId(e.target.value)}
                        className="w-full text-sm p-3 rounded"
                        style={controlStyle}
                      >
                        {entityOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                        Relationship
                      </label>
                      <input
                        value={relationType}
                        onChange={(e) => setRelationType(e.target.value)}
                        className="w-full text-sm p-3 rounded"
                        style={controlStyle}
                        placeholder="e.g. provided_by or custom label"
                        autoComplete="off"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                        To entity
                      </label>
                      <select
                        value={toEntityId}
                        onChange={(e) => setToEntityId(e.target.value)}
                        className="w-full text-sm p-3 rounded"
                        style={controlStyle}
                      >
                        {entityOptions.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                        Status
                      </label>
                      <select
                        value={relStatus}
                        onChange={(e) => setRelStatus(e.target.value)}
                        className="w-full text-sm p-3 rounded"
                        style={controlStyle}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'properties' && (
              <>
                {loadingEntities ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Loading entities…
                  </p>
                ) : entityOptions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    No entities in this group. Create an entity first.
                  </p>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                      Entity
                    </label>
                    <select
                      value={propEntityId}
                      onChange={(e) => setPropEntityId(e.target.value)}
                      className="w-full text-sm p-3 rounded"
                      style={controlStyle}
                    >
                      {entityOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Property key
                  </label>
                  <input
                    value={propKey}
                    onChange={(e) => setPropKey(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Value
                  </label>
                  <input
                    value={propValue}
                    onChange={(e) => setPropValue(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Value type
                  </label>
                  <select
                    value={propValueType}
                    onChange={(e) => setPropValueType(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                  >
                    {PROPERTY_VALUE_TYPES.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--admin-text)' }}>
                    Status
                  </label>
                  <select
                    value={propStatus}
                    onChange={(e) => setPropStatus(e.target.value)}
                    className="w-full text-sm p-3 rounded"
                    style={controlStyle}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {localError && (
            <p className="text-sm mt-4" style={{ color: '#ef4444' }}>
              {localError}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="px-4 py-2 text-sm font-medium rounded-md"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                busy || (tab !== 'entities' && !loadingEntities && entityOptions.length === 0)
              }
              onClick={() => void handleCreate()}
              className="px-6 py-2 text-sm font-medium rounded-md"
              style={{
                background: 'linear-gradient(180deg, var(--admin-primary), var(--admin-primary-600))',
                color: '#041220',
                opacity:
                  busy || (tab !== 'entities' && !loadingEntities && entityOptions.length === 0)
                    ? 0.6
                    : 1,
                border: 'none',
              }}
            >
              {busy ? 'Saving…' : 'Create Ontology'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
