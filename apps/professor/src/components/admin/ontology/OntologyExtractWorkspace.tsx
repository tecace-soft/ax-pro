import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { OntologyApproveAndSaveResponse, OntologyExtractPreviewResponse } from '../../../services/ontology';
import { ONTOLOGY_ENTITY_TYPES_OPTIONS } from '../../../services/ontology';

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
  previewDraft: OntologyExtractPreviewResponse | null;
  setPreviewDraft: Dispatch<SetStateAction<OntologyExtractPreviewResponse | null>>;
  saveResult: OntologyApproveAndSaveResponse | null;
};

function newLocalId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

const field = {
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid var(--admin-border)',
  background: 'var(--admin-bg)',
  color: 'var(--admin-text)',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box' as const,
};

const rowCard: CSSProperties = {
  border: '1px solid var(--admin-border)',
  borderRadius: '8px',
  padding: '12px',
  marginBottom: '10px',
  display: 'grid',
  gap: '8px',
};

const labelStyle: CSSProperties = { fontSize: '11px', color: 'var(--admin-text-muted)' };

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
  previewDraft,
  setPreviewDraft,
  saveResult,
}: OntologyExtractWorkspaceProps) {
  const hasInput = sourceText.trim().length > 0;
  const entityIdOptions = previewDraft?.entities.map((e) => e.id) ?? [];

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
                disabled={!hasGroup || !hasUserId || !previewDraft || busy}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--admin-border)',
                  background:
                    !hasGroup || !hasUserId || !previewDraft || busy
                      ? 'var(--admin-card-bg)'
                      : 'var(--admin-text)',
                  color:
                    !hasGroup || !hasUserId || !previewDraft || busy
                      ? 'var(--admin-text-muted)'
                      : 'var(--admin-bg)',
                  cursor: !hasGroup || !hasUserId || !previewDraft || busy ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {isSaving ? 'Saving...' : 'Approve and Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {!busy && !error && !previewDraft && (
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

      {previewDraft && !isLoading && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Review &amp; edit before save</h3>
            <p style={{ color: 'var(--admin-text-muted)', marginBottom: '10px', fontSize: '13px' }}>
              Extraction mode: <strong>{previewDraft.meta.extraction_mode}</strong>. Adjust rows below; only Approve and
              Save persists to Supabase.
            </p>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={labelStyle}>Source text (saved with this batch)</span>
              <textarea
                value={previewDraft.source_text}
                onChange={(e) =>
                  setPreviewDraft((d) => (d ? { ...d, source_text: e.target.value } : null))
                }
                rows={4}
                style={{ ...field, resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="dashboard-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Entities ({previewDraft.entities.length})</h3>
              <button
                type="button"
                className="km-tab"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() =>
                  setPreviewDraft((d) =>
                    d
                      ? {
                          ...d,
                          entities: [
                            ...d.entities,
                            { id: newLocalId('entity'), label: '', entity_type: 'term', description: '' },
                          ],
                        }
                      : null
                  )
                }
              >
                + Add entity
              </button>
            </div>
            {previewDraft.entities.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No entities — add one or re-extract.</p>
            ) : (
              previewDraft.entities.map((e, idx) => (
                <div key={e.id} style={rowCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <code style={{ fontSize: '12px', wordBreak: 'break-all' }}>{e.id}</code>
                    <button
                      type="button"
                      onClick={() => {
                        const id = e.id;
                        setPreviewDraft((d) =>
                          d
                            ? {
                                ...d,
                                entities: d.entities.filter((_, i) => i !== idx),
                                aliases: d.aliases.filter((a) => a.entity_id !== id),
                                relationships: d.relationships.filter(
                                  (r) => r.subject_entity_id !== id && r.object_entity_id !== id
                                ),
                                properties: d.properties.filter((p) => p.entity_id !== id),
                              }
                            : null
                        );
                      }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'transparent',
                        color: '#ef4444',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Label</span>
                      <input
                        style={field}
                        value={e.label}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.entities];
                            next[idx] = { ...next[idx], label: ev.target.value };
                            return { ...d, entities: next };
                          })
                        }
                      />
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Type</span>
                      <select
                        style={field}
                        value={ONTOLOGY_ENTITY_TYPES_OPTIONS.includes(e.entity_type as (typeof ONTOLOGY_ENTITY_TYPES_OPTIONS)[number]) ? e.entity_type : 'term'}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.entities];
                            next[idx] = { ...next[idx], entity_type: ev.target.value };
                            return { ...d, entities: next };
                          })
                        }
                      >
                        {ONTOLOGY_ENTITY_TYPES_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Description</span>
                    <input
                      style={field}
                      value={e.description ?? ''}
                      onChange={(ev) =>
                        setPreviewDraft((d) => {
                          if (!d) return null;
                          const next = [...d.entities];
                          next[idx] = { ...next[idx], description: ev.target.value };
                          return { ...d, entities: next };
                        })
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Aliases ({previewDraft.aliases.length})</h3>
              <button
                type="button"
                className="km-tab"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() =>
                  setPreviewDraft((d) =>
                    d
                      ? {
                          ...d,
                          aliases: [
                            ...d.aliases,
                            {
                              entity_id: entityIdOptions[0] ?? '',
                              alias: '',
                              confidence: 1,
                            },
                          ],
                        }
                      : null
                  )
                }
                disabled={entityIdOptions.length === 0}
              >
                + Add alias
              </button>
            </div>
            {previewDraft.aliases.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No aliases.</p>
            ) : (
              previewDraft.aliases.map((a, idx) => (
                <div key={`alias-${idx}`} style={rowCard}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDraft((d) =>
                          d ? { ...d, aliases: d.aliases.filter((_, i) => i !== idx) } : null
                        )
                      }
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'transparent',
                        color: '#ef4444',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Alias text</span>
                      <input
                        style={field}
                        value={a.alias}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.aliases];
                            next[idx] = { ...next[idx], alias: ev.target.value };
                            return { ...d, aliases: next };
                          })
                        }
                      />
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Entity</span>
                      <select
                        style={field}
                        value={entityIdOptions.includes(a.entity_id) ? a.entity_id : entityIdOptions[0] ?? ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.aliases];
                            next[idx] = { ...next[idx], entity_id: ev.target.value };
                            return { ...d, aliases: next };
                          })
                        }
                      >
                        {entityIdOptions.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Confidence</span>
                      <input
                        style={field}
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={typeof a.confidence === 'number' ? a.confidence : ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.aliases];
                            const v = ev.target.value === '' ? undefined : Number(ev.target.value);
                            next[idx] = { ...next[idx], confidence: Number.isFinite(v) ? v : undefined };
                            return { ...d, aliases: next };
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Relationships ({previewDraft.relationships.length})</h3>
              <button
                type="button"
                className="km-tab"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() =>
                  setPreviewDraft((d) =>
                    d
                      ? {
                          ...d,
                          relationships: [
                            ...d.relationships,
                            {
                              id: newLocalId('rel'),
                              subject_entity_id: entityIdOptions[0] ?? '',
                              relation_type: 'related_to',
                              object_entity_id: entityIdOptions[1] ?? entityIdOptions[0] ?? '',
                              notes: '',
                            },
                          ],
                        }
                      : null
                  )
                }
                disabled={entityIdOptions.length === 0}
              >
                + Add relationship
              </button>
            </div>
            {previewDraft.relationships.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No relationships.</p>
            ) : (
              previewDraft.relationships.map((r, idx) => (
                <div key={r.id} style={rowCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <code style={{ fontSize: '11px' }}>{r.id}</code>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDraft((d) =>
                          d ? { ...d, relationships: d.relationships.filter((_, i) => i !== idx) } : null
                        )
                      }
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'transparent',
                        color: '#ef4444',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Subject entity</span>
                      <select
                        style={field}
                        value={entityIdOptions.includes(r.subject_entity_id) ? r.subject_entity_id : entityIdOptions[0] ?? ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.relationships];
                            next[idx] = { ...next[idx], subject_entity_id: ev.target.value };
                            return { ...d, relationships: next };
                          })
                        }
                      >
                        {entityIdOptions.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Relation</span>
                      <input
                        style={field}
                        value={r.relation_type ?? ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.relationships];
                            next[idx] = { ...next[idx], relation_type: ev.target.value };
                            return { ...d, relationships: next };
                          })
                        }
                        placeholder="e.g. provided_by or custom label"
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Object entity</span>
                      <select
                        style={field}
                        value={entityIdOptions.includes(r.object_entity_id) ? r.object_entity_id : entityIdOptions[0] ?? ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.relationships];
                            next[idx] = { ...next[idx], object_entity_id: ev.target.value };
                            return { ...d, relationships: next };
                          })
                        }
                      >
                        {entityIdOptions.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Notes</span>
                    <input
                      style={field}
                      value={r.notes ?? ''}
                      onChange={(ev) =>
                        setPreviewDraft((d) => {
                          if (!d) return null;
                          const next = [...d.relationships];
                          next[idx] = { ...next[idx], notes: ev.target.value };
                          return { ...d, relationships: next };
                        })
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-section-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>Properties ({previewDraft.properties.length})</h3>
              <button
                type="button"
                className="km-tab"
                style={{ padding: '6px 12px', cursor: 'pointer', fontSize: '12px' }}
                onClick={() =>
                  setPreviewDraft((d) =>
                    d
                      ? {
                          ...d,
                          properties: [
                            ...d.properties,
                            {
                              entity_id: entityIdOptions[0] ?? '',
                              key: '',
                              value: '',
                              value_type: 'string',
                            },
                          ],
                        }
                      : null
                  )
                }
                disabled={entityIdOptions.length === 0}
              >
                + Add property
              </button>
            </div>
            {previewDraft.properties.length === 0 ? (
              <p style={{ color: 'var(--admin-text-muted)' }}>No properties.</p>
            ) : (
              previewDraft.properties.map((p, idx) => (
                <div key={`prop-${idx}`} style={rowCard}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewDraft((d) =>
                          d ? { ...d, properties: d.properties.filter((_, i) => i !== idx) } : null
                        )
                      }
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        border: '1px solid var(--admin-border)',
                        background: 'transparent',
                        color: '#ef4444',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 1fr', gap: 8 }}>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Entity</span>
                      <select
                        style={field}
                        value={entityIdOptions.includes(p.entity_id) ? p.entity_id : entityIdOptions[0] ?? ''}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.properties];
                            next[idx] = { ...next[idx], entity_id: ev.target.value };
                            return { ...d, properties: next };
                          })
                        }
                      >
                        {entityIdOptions.map((id) => (
                          <option key={id} value={id}>
                            {id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Key</span>
                      <input
                        style={field}
                        value={p.key}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.properties];
                            next[idx] = { ...next[idx], key: ev.target.value };
                            return { ...d, properties: next };
                          })
                        }
                      />
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Value type</span>
                      <select
                        style={field}
                        value={p.value_type ?? 'string'}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.properties];
                            next[idx] = {
                              ...next[idx],
                              value_type: ev.target.value as OntologyExtractPreviewResponse['properties'][0]['value_type'],
                            };
                            return { ...d, properties: next };
                          })
                        }
                      >
                        {(['string', 'number', 'boolean', 'date'] as const).map((vt) => (
                          <option key={vt} value={vt}>
                            {vt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Value</span>
                      <input
                        style={field}
                        value={p.value}
                        onChange={(ev) =>
                          setPreviewDraft((d) => {
                            if (!d) return null;
                            const next = [...d.properties];
                            next[idx] = { ...next[idx], value: ev.target.value };
                            return { ...d, properties: next };
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="dashboard-section-card">
            <h3 style={{ marginTop: 0 }}>Warnings ({previewDraft.warnings.length})</h3>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={labelStyle}>One line per warning (optional edits before save)</span>
              <textarea
                value={previewDraft.warnings.join('\n')}
                onChange={(e) =>
                  setPreviewDraft((d) =>
                    d
                      ? {
                          ...d,
                          warnings: e.target.value.split('\n').map((l) => l.trim()).filter(Boolean),
                        }
                      : null
                  )
                }
                rows={Math.max(3, Math.min(12, previewDraft.warnings.length + 2))}
                placeholder="Warnings from extraction (editable)"
                style={{ ...field, resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
