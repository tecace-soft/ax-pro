import { useMemo, type CSSProperties } from 'react';
import type { OntologyRequestAuthContext } from '../../../services/ontology';
import {
  ONTOLOGY_ENTITY_TYPES_OPTIONS,
  ONTOLOGY_RELATION_TYPES_OPTIONS,
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

export default function OntologySavedDataPanel({
  groupId,
  authContext,
}: {
  groupId: string;
  authContext?: OntologyRequestAuthContext;
}) {
  const b = useOntologySavedBrowse(groupId, authContext);

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
