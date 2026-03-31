import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';
import { IconPlus, IconRefresh } from '../../../ui/icons';
import type { OntologyRequestAuthContext } from '../../../services/ontology';
import {
  ONTOLOGY_ENTITY_TYPES_OPTIONS,
  OntologyApiError,
  deleteOntologySavedRow,
  fetchEntityDeleteImpact,
  normalizeOntologyId,
  type EntityDeleteImpactResponse,
  type OntologyDeleteResource,
} from '../../../services/ontology';
import { useOntologySavedBrowse } from '../../../hooks/useOntologySavedBrowse';
import EditableOntologyCell from './EditableOntologyCell';
import OntologyCreateModal from './OntologyCreateModal';

const PROPERTY_VALUE_TYPES = ['string', 'number', 'boolean', 'date'] as const;
const PROPERTY_STATUS_OPTIONS = ['active', 'deprecated'] as const;

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
  padding: 0,
  borderBottom: '1px solid var(--admin-border)',
  fontSize: '13px',
  verticalAlign: 'middle',
};

const tdInnerStyle: CSSProperties = {
  padding: '8px 10px',
  minHeight: '38px',
  boxSizing: 'border-box',
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
  const { t } = useTranslation();

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
  const [editError, setEditError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const rowDeleteDisabled = deleteBusy || impactLoading;

  const toolbarRight: CSSProperties = {
    marginLeft: 'auto',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
  };

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
      {editError && (
        <p style={{ color: '#ef4444', margin: 0, fontSize: '13px' }}>{editError}</p>
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
              className="icon-btn"
              onClick={() => void b.refreshEntities()}
              disabled={b.loadingEntities}
              title={t('actions.refresh')}
              aria-label={t('actions.refresh')}
            >
              <IconRefresh size={18} className={b.loadingEntities ? 'animate-spin' : ''} />
            </button>
            <div style={toolbarRight}>
              <button type="button" className="dashboard-export-btn" onClick={() => setCreateOpen(true)}>
                <IconPlus size={14} className="dashboard-export-btn__icon" /> Add
              </button>
            </div>
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
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {['display_name', 'entity_type', 'description'].map((col) => (
                      <th key={col} style={thStyle}>
                        {col === 'display_name' ? 'Entity' : col === 'entity_type' ? 'Type' : 'Description'}
                      </th>
                    ))}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.entities.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {['display_name', 'entity_type', 'description'].map((col) => (
                        <td key={col} style={tdStyle}>
                          {readRowId(row) ? (
                            col === 'entity_type' ? (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="entity"
                                columnKey="entity_type"
                                value={row.entity_type}
                                kind="select"
                                selectOptions={ONTOLOGY_ENTITY_TYPES_OPTIONS}
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            ) : col === 'description' ? (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="entity"
                                columnKey="description"
                                value={row.description}
                                kind="text"
                                formatCommit={(d) => d.trim() || null}
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            ) : (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="entity"
                                columnKey="display_name"
                                value={row.display_name}
                                kind="text"
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            )
                          ) : (
                            <div style={tdInnerStyle}>{cell(row[col])}</div>
                          )}
                        </td>
                      ))}
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
              className="icon-btn"
              onClick={() => void b.refreshAliases()}
              disabled={b.loadingAliases}
              title={t('actions.refresh')}
              aria-label={t('actions.refresh')}
            >
              <IconRefresh size={18} className={b.loadingAliases ? 'animate-spin' : ''} />
            </button>
            <div style={toolbarRight}>
              <button type="button" className="dashboard-export-btn" onClick={() => setCreateOpen(true)}>
                <IconPlus size={14} className="dashboard-export-btn__icon" /> Add
              </button>
            </div>
          </div>
          {b.loadingAliases && <p style={{ color: 'var(--admin-text-muted)' }}>Loading aliases…</p>}
          {b.errorAliases && <p style={{ color: '#ef4444', marginTop: 0 }}>{b.errorAliases}</p>}
          {!b.loadingAliases && !b.errorAliases && b.aliases.length === 0 && (
            <p style={{ color: 'var(--admin-text-muted)' }}>No aliases match the current filters.</p>
          )}
          {!b.loadingAliases && b.aliases.length > 0 && (
            <div style={tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    {['alias_text', 'entity_display_name', 'alias_language', 'alias_type'].map((col) => (
                      <th key={col} style={{ ...thStyle, width: '25%' }}>
                        {col === 'alias_text'
                          ? 'Alias'
                          : col === 'entity_display_name'
                            ? 'Entity'
                            : col === 'alias_language'
                              ? 'Language'
                              : 'Type'}
                      </th>
                    ))}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.aliases.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {['alias_text', 'entity_display_name', 'alias_language', 'alias_type'].map((col) => (
                        <td key={col} style={{ ...tdStyle, width: '25%' }}>
                          {readRowId(row) ? (
                            col === 'alias_language' || col === 'alias_type' ? (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="alias"
                                columnKey={col}
                                value={row[col]}
                                kind="text"
                                formatCommit={(d) => d.trim() || null}
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            ) : (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="alias"
                                columnKey={col}
                                value={row[col]}
                                kind="text"
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            )
                          ) : (
                            <div style={tdInnerStyle}>{cell(row[col])}</div>
                          )}
                        </td>
                      ))}
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
              <input
                value={b.relationType}
                onChange={(e) => b.setRelationType(e.target.value)}
                placeholder="Exact match (optional)"
                style={{
                  minWidth: '200px',
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
              className="icon-btn"
              onClick={() => void b.refreshRelationships()}
              disabled={b.loadingRelationships}
              title={t('actions.refresh')}
              aria-label={t('actions.refresh')}
            >
              <IconRefresh size={18} className={b.loadingRelationships ? 'animate-spin' : ''} />
            </button>
            <div style={toolbarRight}>
              <button type="button" className="dashboard-export-btn" onClick={() => setCreateOpen(true)}>
                <IconPlus size={14} className="dashboard-export-btn__icon" /> Add
              </button>
            </div>
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
                    {['from_display_name', 'relation_type', 'to_display_name'].map((col) => (
                      <th key={col} style={{ ...thStyle, width: '33.33%' }}>
                        {col === 'from_display_name' ? 'From Entity' : col === 'relation_type' ? 'Relationship' : 'To Entity'}
                      </th>
                    ))}
                    <th key="_delete" style={thAction} aria-label="Delete" />
                  </tr>
                </thead>
                <tbody>
                  {b.relationships.map((row, idx) => (
                    <tr key={cell(row.id) + String(idx)}>
                      {['from_display_name', 'relation_type', 'to_display_name'].map((col) => (
                        <td key={col} style={{ ...tdStyle, width: '33.33%' }}>
                          {readRowId(row) ? (
                            col === 'relation_type' ? (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="relationship"
                                columnKey="relation_type"
                                value={row.relation_type}
                                kind="text"
                                formatCommit={(d) => d.trim()}
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            ) : (
                              <EditableOntologyCell
                                groupId={groupId}
                                rowId={readRowId(row)!}
                                resource="relationship"
                                columnKey={col}
                                value={row[col]}
                                kind="text"
                                disabled={rowDeleteDisabled}
                                authContext={authContext}
                                onSaved={() => {
                                  setEditError(null);
                                  void refreshAll();
                                }}
                                onError={setEditError}
                              />
                            )
                          ) : (
                            <div style={tdInnerStyle}>{cell(row[col])}</div>
                          )}
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
              className="icon-btn"
              onClick={() => void b.refreshProperties()}
              disabled={b.loadingProperties}
              title={t('actions.refresh')}
              aria-label={t('actions.refresh')}
            >
              <IconRefresh size={18} className={b.loadingProperties ? 'animate-spin' : ''} />
            </button>
            <div style={toolbarRight}>
              <button type="button" className="dashboard-export-btn" onClick={() => setCreateOpen(true)}>
                <IconPlus size={14} className="dashboard-export-btn__icon" /> Add
              </button>
            </div>
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
                          {readRowId(row) &&
                          (col === 'property_key' ||
                            col === 'property_value_text' ||
                            col === 'entity_display_name') ? (
                            <EditableOntologyCell
                              groupId={groupId}
                              rowId={readRowId(row)!}
                              resource="property"
                              columnKey={col}
                              value={row[col]}
                              kind="text"
                              disabled={rowDeleteDisabled}
                              authContext={authContext}
                              onSaved={() => {
                                setEditError(null);
                                void refreshAll();
                              }}
                              onError={setEditError}
                            />
                          ) : readRowId(row) && col === 'value_type' ? (
                            <EditableOntologyCell
                              groupId={groupId}
                              rowId={readRowId(row)!}
                              resource="property"
                              columnKey="value_type"
                              value={row.value_type}
                              kind="select"
                              selectOptions={PROPERTY_VALUE_TYPES}
                              disabled={rowDeleteDisabled}
                              authContext={authContext}
                              onSaved={() => {
                                setEditError(null);
                                void refreshAll();
                              }}
                              onError={setEditError}
                            />
                          ) : readRowId(row) && col === 'status' ? (
                            <EditableOntologyCell
                              groupId={groupId}
                              rowId={readRowId(row)!}
                              resource="property"
                              columnKey="status"
                              value={row.status}
                              kind="select"
                              selectOptions={PROPERTY_STATUS_OPTIONS}
                              disabled={rowDeleteDisabled}
                              authContext={authContext}
                              onSaved={() => {
                                setEditError(null);
                                void refreshAll();
                              }}
                              onError={setEditError}
                            />
                          ) : (
                            <div style={tdInnerStyle}>{cell(row[col])}</div>
                          )}
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

      <OntologyCreateModal
        open={createOpen}
        tab={b.subTab}
        groupId={groupId}
        authContext={authContext}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setEditError(null);
          void refreshAll();
        }}
      />

      {deleteDialog && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => closeDialog()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ontology-delete-title"
            aria-describedby="ontology-delete-desc"
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
                <h3 id="ontology-delete-title" className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                  {deleteDialog.mode === 'entity'
                    ? 'Delete entity?'
                    : deleteDialog.resource === 'alias'
                      ? 'Delete alias?'
                      : deleteDialog.resource === 'relationship'
                        ? 'Delete relationship?'
                        : 'Delete property?'}
                </h3>
                <button
                  type="button"
                  onClick={() => !deleteBusy && closeDialog()}
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
              {deleteDialog.mode === 'entity' ? (
                <>
                  <p id="ontology-delete-desc" className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                    Deleting <strong>{deleteDialog.label}</strong> removes this entity. The database will also remove
                    related rows (cascade):
                  </p>
                  {!deleteDialog.impact ? (
                    <p className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)' }}>
                      Loading related row counts…
                    </p>
                  ) : (
                    <ul className="text-sm mb-4 pl-5" style={{ lineHeight: 1.5 }}>
                      <li>{deleteDialog.impact.cascade.aliases} alias row(s) with this entity</li>
                      <li>
                        {deleteDialog.impact.cascade.relationships} relationship row(s) where this entity is the source
                        or target
                      </li>
                      <li>{deleteDialog.impact.cascade.properties} property row(s) for this entity</li>
                    </ul>
                  )}
                  <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
                    Ontology sources and other entities are not deleted. This cannot be undone.
                  </p>
                </>
              ) : (
                <>
                  <p id="ontology-delete-desc" className="text-sm mb-4" style={{ color: 'var(--admin-text-muted)', lineHeight: 1.5 }}>
                    Are you sure you want to delete this row? This cannot be undone.
                  </p>
                  <p className="text-sm" style={{ lineHeight: 1.5, color: 'var(--admin-text)' }}>
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
                        Only this property (<strong>{deleteDialog.label}</strong>) will be removed. The entity and
                        ontology source are not deleted.
                      </>
                    )}
                  </p>
                </>
              )}
              {deleteError && (
                <p className="text-sm mt-4" style={{ color: '#ef4444' }}>
                  {deleteError}
                </p>
              )}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  disabled={deleteBusy}
                  onClick={closeDialog}
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
                  className="px-6 py-2 text-sm font-medium rounded-md"
                  style={{
                    background: '#b91c1c',
                    color: '#fff',
                    border: 'none',
                    cursor: deleteBusy ? 'wait' : 'pointer',
                    opacity: deleteBusy || (deleteDialog.mode === 'entity' && !deleteDialog.impact) ? 0.6 : 1,
                  }}
                  disabled={deleteBusy || (deleteDialog.mode === 'entity' && !deleteDialog.impact)}
                  onClick={() => void confirmDelete()}
                >
                  {deleteBusy ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
