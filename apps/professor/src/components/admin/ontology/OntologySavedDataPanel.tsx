import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import type { OntologyRequestAuthContext } from '../../../services/ontology';
import {
  ONTOLOGY_ENTITY_TYPES_OPTIONS,
  ONTOLOGY_RELATION_TYPES_OPTIONS,
  OntologyApiError,
  deleteOntologySavedRow,
  fetchEntityDeleteImpact,
  normalizeOntologyId,
  type EntityDeleteImpactResponse,
  type OntologyDeleteResource,
} from '../../../services/ontology';
import { useOntologySavedBrowse } from '../../../hooks/useOntologySavedBrowse';

const tableWrap: CSSProperties = {
  overflowX: 'auto',
  maxHeight: 'min(62vh, 720px)',
  overflowY: 'auto',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid var(--admin-border)',
  fontSize: '12px',
  color: 'var(--admin-text-muted)',
  position: 'sticky',
  top: 0,
  background: 'var(--admin-card-bg)',
  zIndex: 1,
};

const tdStyle: CSSProperties = {
  padding: '8px 10px',
  borderBottom: '1px solid var(--admin-border)',
  fontSize: '13px',
  verticalAlign: 'top',
};

function cell(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

function readRowId(row: Record<string, unknown>): string | null {
  return normalizeOntologyId(row.id);
}

const thAction: CSSProperties = {
  textAlign: 'center',
  width: '44px',
  padding: '8px 6px',
  borderBottom: '1px solid var(--admin-border)',
  fontSize: '12px',
  color: 'var(--admin-text-muted)',
  position: 'sticky',
  top: 0,
  background: 'var(--admin-card-bg)',
  zIndex: 1,
};

const tdAction: CSSProperties = {
  padding: '6px 6px',
  borderBottom: '1px solid var(--admin-border)',
  textAlign: 'center',
  verticalAlign: 'middle',
};

export default function OntologySavedDataPanel({
  groupId,
  authContext,
}: {
  groupId: string;
  authContext?: OntologyRequestAuthContext;
}) {
  const b = useOntologySavedBrowse(groupId, authContext);
  const { refreshAll } = b;

  const [deleteDialog, setDeleteDialog] = useState<
    | null
    | {
        mode: 'entity';
        entityId: string;
        label: string;
        impact: EntityDeleteImpactResponse | null;
      }
    | {
        mode: 'child';
        resource: Exclude<OntologyDeleteResource, 'entity'>;
        id: string;
        label: string;
      }
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [impactLoading, setImpactLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const rowDeleteDisabled = deleteBusy || impactLoading;

  const closeDialog = useCallback(() => {
    if (deleteBusy) return;
    setDeleteDialog(null);
    setDeleteError(null);
  }, [deleteBusy]);

  const openEntityDelete = useCallback(
    async (row: Record<string, unknown>) => {
      const id = readRowId(row);
      if (!id) return;
      const label =
        typeof row.display_name === 'string' && row.display_name.trim()
          ? row.display_name.trim()
          : typeof row.canonical_name === 'string' && row.canonical_name.trim()
            ? row.canonical_name.trim()
            : id;
      setDeleteError(null);
      setDeleteDialog({ mode: 'entity', entityId: id, label, impact: null });
      setImpactLoading(true);
      try {
        const impact = await fetchEntityDeleteImpact({ group_id: groupId, entity_id: id }, authContext);
        setDeleteDialog((d) => (d && d.mode === 'entity' && d.entityId === id ? { ...d, impact } : d));
      } catch (e) {
        setDeleteDialog(null);
        setDeleteError(
          e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Failed to load cascade counts'
        );
      } finally {
        setImpactLoading(false);
      }
    },
    [groupId, authContext]
  );

  const openChildDelete = useCallback(
    (resource: Exclude<OntologyDeleteResource, 'entity'>, row: Record<string, unknown>, label: string) => {
      const id = readRowId(row);
      if (!id) return;
      setDeleteError(null);
      setDeleteDialog({ mode: 'child', resource, id, label });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteDialog) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      if (deleteDialog.mode === 'entity') {
        await deleteOntologySavedRow({ resource: 'entity', group_id: groupId, id: deleteDialog.entityId }, authContext);
      } else {
        await deleteOntologySavedRow(
          { resource: deleteDialog.resource, group_id: groupId, id: deleteDialog.id },
          authContext
        );
      }
      setDeleteDialog(null);
      await refreshAll();
    } catch (e) {
      setDeleteError(
        e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Delete failed'
      );
    } finally {
      setDeleteBusy(false);
    }
  }, [deleteDialog, groupId, authContext, refreshAll]);

  const subTabs = useMemo(
    () =>
      [
        { id: 'entities' as const, label: 'Entities' },
        { id: 'aliases' as const, label: 'Aliases' },
        { id: 'relationships' as const, label: 'Relationships' },
        { id: 'properties' as const, label: 'Properties' },
      ] as const,
    []
  );

  if (!groupId.trim()) {
    return (
      <div className="dashboard-section-card">
        <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>Select a group (URL <code>?group=...</code>) to browse saved ontology.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '14px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
        }}
      >
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={b.includeDeprecated}
            onChange={(e) => b.setIncludeDeprecated(e.target.checked)}
          />
          Include deprecated (non-active status where applicable)
        </label>
        <span style={{ color: 'var(--admin-text-muted)' }}>
          Showing rows with <strong>status = active</strong> by default for entities, relationships, and properties.
        </span>
      </div>

      {deleteError && !deleteDialog && (
        <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>{deleteError}</p>
      )}

      <div className="km-tabs" style={{ marginBottom: 0 }}>
        {subTabs.map((t) => (
          <button
            type="button"
            key={t.id}
            className={`km-tab ${b.subTab === t.id ? 'active' : ''}`}
            onClick={() => b.setSubTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {b.subTab === 'entities' && (
        <div className="dashboard-section-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
              Search name
              <input
                value={b.entityQ}
                onChange={(e) => b.setEntityQ(e.target.value)}
                placeholder="Display or canonical name"
                style={{
                  minWidth: '220px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                }}
              />
            </label>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
              Entity type
              <select
                value={b.entityType}
                onChange={(e) => b.setEntityType(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                  minWidth: '160px',
                }}
              >
                <option value="">All types</option>
                {ONTOLOGY_ENTITY_TYPES_OPTIONS.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="km-tab"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => void b.refreshEntities()}
            >
              Refresh
            </button>
          </div>
          {b.loadingEntities && <p style={{ color: 'var(--admin-text-muted)' }}>Loading entities…</p>}
          {b.errorEntities && (
            <p style={{ color: '#ef4444', marginTop: 0 }}>{b.errorEntities}</p>
          )}
          {!b.loadingEntities && !b.errorEntities && b.entities.length === 0 && (
            <p style={{ color: 'var(--admin-text-muted)' }}>No entities match the current filters.</p>
          )}
          {!b.loadingEntities && b.entities.length > 0 && (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['display_name', 'canonical_name', 'entity_type', 'status', 'description', 'id', 'source_id', 'updated_at'].map(
                      (col) => (
                        <th key={col} style={thStyle}>
                          {col}
                        </th>
                      )
                    )}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.entities.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {['display_name', 'canonical_name', 'entity_type', 'status', 'description', 'id', 'source_id', 'updated_at'].map(
                        (col) => (
                          <td key={col} style={tdStyle}>
                            {cell(row[col])}
                          </td>
                        )
                      )}
                      <td style={tdAction}>
                        <button
                          type="button"
                          aria-label="Delete entity"
                          disabled={rowDeleteDisabled}
                          onClick={() => void openEntityDelete(row)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: rowDeleteDisabled ? 'wait' : 'pointer',
                            color: 'var(--admin-text-muted)',
                            padding: '4px',
                            borderRadius: '6px',
                            lineHeight: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {b.subTab === 'aliases' && (
        <div className="dashboard-section-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
              Search alias
              <input
                value={b.aliasQ}
                onChange={(e) => b.setAliasQ(e.target.value)}
                placeholder="Alias text"
                style={{
                  minWidth: '220px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                }}
              />
            </label>
            <button
              type="button"
              className="km-tab"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => void b.refreshAliases()}
            >
              Refresh
            </button>
          </div>
          {b.loadingAliases && <p style={{ color: 'var(--admin-text-muted)' }}>Loading aliases…</p>}
          {b.errorAliases && <p style={{ color: '#ef4444', marginTop: 0 }}>{b.errorAliases}</p>}
          {!b.loadingAliases && !b.errorAliases && b.aliases.length === 0 && (
            <p style={{ color: 'var(--admin-text-muted)' }}>No aliases match the current filters.</p>
          )}
          {!b.loadingAliases && b.aliases.length > 0 && (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['alias_text', 'entity_display_name', 'entity_id', 'alias_language', 'alias_type', 'id', 'source_id', 'created_at'].map(
                      (col) => (
                        <th key={col} style={thStyle}>
                          {col}
                        </th>
                      )
                    )}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.aliases.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {['alias_text', 'entity_display_name', 'entity_id', 'alias_language', 'alias_type', 'id', 'source_id', 'created_at'].map(
                        (col) => (
                          <td key={col} style={tdStyle}>
                            {cell(row[col])}
                          </td>
                        )
                      )}
                      <td style={tdAction}>
                        <button
                          type="button"
                          aria-label="Delete alias"
                          disabled={rowDeleteDisabled}
                          onClick={() =>
                            openChildDelete('alias', row, cell(row.alias_text))
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: rowDeleteDisabled ? 'wait' : 'pointer',
                            color: 'var(--admin-text-muted)',
                            padding: '4px',
                            borderRadius: '6px',
                            lineHeight: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {b.subTab === 'relationships' && (
        <div className="dashboard-section-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
              Relation type
              <select
                value={b.relationType}
                onChange={(e) => b.setRelationType(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                  minWidth: '200px',
                }}
              >
                <option value="">All relation types</option>
                {ONTOLOGY_RELATION_TYPES_OPTIONS.map((rt) => (
                  <option key={rt} value={rt}>
                    {rt}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="km-tab"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => void b.refreshRelationships()}
            >
              Refresh
            </button>
          </div>
          {b.loadingRelationships && <p style={{ color: 'var(--admin-text-muted)' }}>Loading relationships…</p>}
          {b.errorRelationships && (
            <p style={{ color: '#ef4444', marginTop: 0 }}>{b.errorRelationships}</p>
          )}
          {!b.loadingRelationships && !b.errorRelationships && b.relationships.length === 0 && (
            <p style={{ color: 'var(--admin-text-muted)' }}>No relationships match the current filters.</p>
          )}
          {!b.loadingRelationships && b.relationships.length > 0 && (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'relation_type',
                      'from_display_name',
                      'to_display_name',
                      'status',
                      'from_entity_id',
                      'to_entity_id',
                      'id',
                      'source_id',
                      'created_at',
                    ].map((col) => (
                      <th key={col} style={thStyle}>
                        {col}
                      </th>
                    ))}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.relationships.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {[
                        'relation_type',
                        'from_display_name',
                        'to_display_name',
                        'status',
                        'from_entity_id',
                        'to_entity_id',
                        'id',
                        'source_id',
                        'created_at',
                      ].map((col) => (
                        <td key={col} style={tdStyle}>
                          {cell(row[col])}
                        </td>
                      ))}
                      <td style={tdAction}>
                        <button
                          type="button"
                          aria-label="Delete relationship"
                          disabled={rowDeleteDisabled}
                          onClick={() =>
                            openChildDelete(
                              'relationship',
                              row,
                              `${cell(row.relation_type)} · ${cell(row.from_display_name)} → ${cell(row.to_display_name)}`
                            )
                          }
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: rowDeleteDisabled ? 'wait' : 'pointer',
                            color: 'var(--admin-text-muted)',
                            padding: '4px',
                            borderRadius: '6px',
                            lineHeight: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {b.subTab === 'properties' && (
        <div className="dashboard-section-card">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px', alignItems: 'flex-end' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '12px' }}>
              Search key or value
              <input
                value={b.propertyQ}
                onChange={(e) => b.setPropertyQ(e.target.value)}
                placeholder="Property key or value text"
                style={{
                  minWidth: '240px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background: 'var(--admin-bg)',
                  color: 'var(--admin-text)',
                }}
              />
            </label>
            <button
              type="button"
              className="km-tab"
              style={{ padding: '8px 12px', cursor: 'pointer' }}
              onClick={() => void b.refreshProperties()}
            >
              Refresh
            </button>
          </div>
          {b.loadingProperties && <p style={{ color: 'var(--admin-text-muted)' }}>Loading properties…</p>}
          {b.errorProperties && (
            <p style={{ color: '#ef4444', marginTop: 0 }}>{b.errorProperties}</p>
          )}
          {!b.loadingProperties && !b.errorProperties && b.properties.length === 0 && (
            <p style={{ color: 'var(--admin-text-muted)' }}>No properties match the current filters.</p>
          )}
          {!b.loadingProperties && b.properties.length > 0 && (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {[
                      'property_key',
                      'property_value_text',
                      'value_type',
                      'status',
                      'entity_display_name',
                      'entity_id',
                      'id',
                      'source_id',
                      'created_at',
                    ].map((col) => (
                      <th key={col} style={thStyle}>
                        {col}
                      </th>
                    ))}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.properties.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {[
                        'property_key',
                        'property_value_text',
                        'value_type',
                        'status',
                        'entity_display_name',
                        'entity_id',
                        'id',
                        'source_id',
                        'created_at',
                      ].map((col) => (
                        <td key={col} style={tdStyle}>
                          {cell(row[col])}
                        </td>
                      ))}
                      <td style={tdAction}>
                        <button
                          type="button"
                          aria-label="Delete property"
                          disabled={rowDeleteDisabled}
                          onClick={() => openChildDelete('property', row, cell(row.property_key))}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: rowDeleteDisabled ? 'wait' : 'pointer',
                            color: 'var(--admin-text-muted)',
                            padding: '4px',
                            borderRadius: '6px',
                            lineHeight: 0,
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {deleteDialog && (
        <div
          role="presentation"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => closeDialog()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ontology-delete-title"
            aria-describedby="ontology-delete-desc"
            style={{
              background: 'var(--admin-card-bg)',
              border: '1px solid var(--admin-border)',
              borderRadius: '12px',
              maxWidth: '480px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="ontology-delete-title" style={{ margin: '0 0 12px', fontSize: '18px' }}>
              {deleteDialog.mode === 'entity'
                ? 'Delete entity?'
                : deleteDialog.resource === 'alias'
                  ? 'Delete alias?'
                  : deleteDialog.resource === 'relationship'
                    ? 'Delete relationship?'
                    : 'Delete property?'}
            </h2>
            {deleteDialog.mode === 'entity' ? (
              <>
                <p id="ontology-delete-desc" style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5 }}>
                  Deleting <strong>{deleteDialog.label}</strong> removes this entity. The database will also remove related rows (cascade):
                </p>
                {!deleteDialog.impact ? (
                  <p style={{ color: 'var(--admin-text-muted)' }}>Loading related row counts…</p>
                ) : (
                  <ul style={{ margin: '0 0 12px', paddingLeft: '20px', fontSize: '14px' }}>
                    <li>{deleteDialog.impact.cascade.aliases} alias row(s) with this entity</li>
                    <li>
                      {deleteDialog.impact.cascade.relationships} relationship row(s) where this entity is the source or
                      target
                    </li>
                    <li>{deleteDialog.impact.cascade.properties} property row(s) for this entity</li>
                  </ul>
                )}
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                  Ontology sources and other entities are not deleted. This cannot be undone.
                </p>
              </>
            ) : (
              <>
                <p id="ontology-delete-desc" style={{ margin: '0 0 12px', fontSize: '14px', lineHeight: 1.5 }}>
                  Are you sure you want to delete this row? This cannot be undone.
                </p>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.5 }}>
                  {deleteDialog.resource === 'alias' && (
                    <>
                      Only the alias <strong>{deleteDialog.label}</strong> will be removed. The linked entity and
                      ontology source are not deleted.
                    </>
                  )}
                  {deleteDialog.resource === 'relationship' && (
                    <>
                      Only this relationship (<strong>{deleteDialog.label}</strong>) will be removed. Connected entities
                      and ontology sources are not deleted.
                    </>
                  )}
                  {deleteDialog.resource === 'property' && (
                    <>
                      Only this property (<strong>{deleteDialog.label}</strong>) will be removed. The entity and ontology
                      source are not deleted.
                    </>
                  )}
                </p>
              </>
            )}
            {deleteError && (
              <p style={{ color: '#ef4444', marginTop: '12px', marginBottom: 0, fontSize: '13px' }}>{deleteError}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button type="button" className="km-tab" disabled={deleteBusy} onClick={closeDialog}>
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#b91c1c',
                  color: '#fff',
                  cursor: deleteBusy ? 'wait' : 'pointer',
                  opacity: deleteBusy ? 0.7 : 1,
                }}
                disabled={deleteBusy || (deleteDialog.mode === 'entity' && !deleteDialog.impact)}
                onClick={() => void confirmDelete()}
              >
                {deleteBusy ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
