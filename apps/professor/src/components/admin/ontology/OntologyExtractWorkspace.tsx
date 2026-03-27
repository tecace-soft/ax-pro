import type { OntologyApproveAndSaveResponse, OntologyExtractPreviewResponse } from '../../../services/ontology';

export type OntologyExtractWorkspaceProps = {
  groupId: string;
  hasGroup: boolean;
  hasUserId: boolean;
  createdByUserId: string;
  sourceText: string;
  onSourceTextChange: (v: string) => void;
  busy: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onExtract: () => void;
  onApproveAndSave: () => void;
  error: string | null;
  saveError: string | null;
  result: OntologyExtractPreviewResponse | null;
  saveResult: OntologyApproveAndSaveResponse | null;
};

export default function OntologyExtractWorkspace({
  groupId,
  hasGroup,
  hasUserId,
  createdByUserId,
  sourceText,
  onSourceTextChange,
  busy,
  isLoading,
  isSaving,
  onExtract,
  onApproveAndSave,
  error,
  saveError,
  result,
  saveResult,
}: OntologyExtractWorkspaceProps) {
  const hasInput = sourceText.trim().length > 0;

  return (
    <>
      <div className="dashboard-section-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gap: '10px' }}>
          <textarea
            value={sourceText}
            onChange={(e) => onSourceTextChange(e.target.value)}
            placeholder="Type HR feedback, policy notes, process descriptions, or domain terminology..."
            rows={10}
            style={{
              width: '100%',
              resize: 'vertical',
              borderRadius: '8px',
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-bg)',
              color: 'var(--admin-text)',
              padding: '12px',
              fontSize: '14px',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', display: 'grid', gap: '4px' }}>
              <span>
                Group: <strong>{hasGroup ? String(groupId) : '(missing group in URL)'}</strong>
              </span>
              <span>
                User id (for <code>created_by</code>):{' '}
                <strong>{hasUserId ? createdByUserId : '(log in — session missing userId)'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={onExtract}
                disabled={!hasGroup || !hasUserId || !hasInput || busy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background:
                    !hasGroup || !hasUserId || !hasInput || busy ? 'var(--admin-card-bg)' : 'var(--admin-primary)',
                  color: !hasGroup || !hasUserId || !hasInput || busy ? 'var(--admin-text-muted)' : '#fff',
                  cursor: !hasGroup || !hasUserId || !hasInput || busy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isLoading ? 'Extracting...' : 'Extract Ontology'}
              </button>
              <button
                type="button"
                onClick={onApproveAndSave}
                disabled={!hasGroup || !hasUserId || !result || busy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background:
                    !hasGroup || !hasUserId || !result || busy ? 'var(--admin-card-bg)' : 'var(--admin-text)',
                  color: !hasGroup || !hasUserId || !result || busy ? 'var(--admin-text-muted)' : 'var(--admin-bg)',
                  cursor: !hasGroup || !hasUserId || !result || busy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isSaving ? 'Saving...' : 'Approve and Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!busy && !error && !result && (
        <div className="dashboard-section-card">
          <p style={{ color: 'var(--admin-text-muted)', margin: 0 }}>
            Empty state: {!hasUserId ? 'Log in so your Supabase user id can be sent as created_by. ' : ''}
            Enter text and click <strong>Extract Ontology</strong> to see a structured preview.
          </p>
        </div>
      )}

      {error && (
        <div className="dashboard-section-card" style={{ borderColor: '#ef4444' }}>
          <p style={{ color: '#ef4444', margin: 0 }}>Error: {error}</p>
        </div>
      )}

      {saveError && (
        <div className="dashboard-section-card" style={{ borderColor: '#ef4444' }}>
          <p style={{ color: '#ef4444', margin: 0 }}>Save error: {saveError}</p>
        </div>
      )}

      {saveResult && !busy && (
        <div className="dashboard-section-card" style={{ marginBottom: '12px', borderColor: '#22c55e' }}>
          <h3 style={{ marginTop: 0 }}>Save summary</h3>
          <p style={{ marginBottom: '8px' }}>
            Source record <code>{saveResult.source_id}</code>
          </p>
          <div style={{ fontSize: '13px', display: 'grid', gap: '6px' }}>
            <div>
              <strong>Created</strong> — entities: {saveResult.created.entities.length}, aliases:{' '}
              {saveResult.created.aliases.length}, relationships: {saveResult.created.relationships.length}, properties:{' '}
              {saveResult.created.properties.length}
            </div>
            <div>
              <strong>Linked existing entities</strong>: {saveResult.linked_existing.entities.length}
            </div>
            <div>
              <strong>Skipped duplicate</strong> — aliases: {saveResult.skipped_duplicate.aliases.length},
              relationships: {saveResult.skipped_duplicate.relationships.length}, properties:{' '}
              {saveResult.skipped_duplicate.properties.length}
            </div>
            <div>
              <strong>Conflicts</strong> — entities: {saveResult.conflict.entities.length}, aliases:{' '}
              {saveResult.conflict.aliases.length}, properties: {saveResult.conflict.properties.length}
            </div>
          </div>
          {(saveResult.conflict.entities.length > 0 ||
            saveResult.conflict.aliases.length > 0 ||
            saveResult.conflict.properties.length > 0) && (
            <p style={{ color: 'var(--admin-text-muted)', marginTop: '10px', marginBottom: 0, fontSize: '12px' }}>
              Review conflicts in the browser devtools network response JSON for full detail.
            </p>
          )}
        </div>
      )}

      {result && !isLoading && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Preview</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: 0 }}>
              Extraction mode: <strong>{result.meta.extraction_mode}</strong>
            </p>
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Entities ({result.entities.length})</h3>
            {result.entities.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No entities extracted.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.entities.map((e) => (
                  <li key={e.id}>
                    <strong>{e.label}</strong> ({e.entity_type}) - <code>{e.id}</code>
                    {e.description ? ` - ${e.description}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Aliases ({result.aliases.length})</h3>
            {result.aliases.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No aliases extracted.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.aliases.map((a, idx) => (
                  <li key={`${a.entity_id}-${a.alias}-${idx}`}>
                    <code>{a.entity_id}</code> - {a.alias}
                    {typeof a.confidence === 'number' ? ` (confidence: ${a.confidence})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Relationships ({result.relationships.length})</h3>
            {result.relationships.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No relationships extracted.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.relationships.map((r) => (
                  <li key={r.id}>
                    <code>{r.subject_entity_id}</code> - {r.relation_type} - <code>{r.object_entity_id}</code>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Properties ({result.properties.length})</h3>
            {result.properties.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No properties extracted.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.properties.map((p, idx) => (
                  <li key={`${p.entity_id}-${p.key}-${idx}`}>
                    <code>{p.entity_id}</code> - {p.key}: {p.value}
                    {p.value_type ? ` (${p.value_type})` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Warnings ({result.warnings.length})</h3>
            {result.warnings.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No warnings.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {result.warnings.map((w, idx) => (
                  <li key={`${w}-${idx}`}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
