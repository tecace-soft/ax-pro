import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import type { OntologyRequestAuthContext } from '../../../services/ontology';
import { OntologyApiError, patchOntologySavedRow, type OntologyDeleteResource } from '../../../services/ontology';
import '../../../styles/ontology-editable-cell.css';

export type EditableOntologyCellProps = {
  groupId: string;
  rowId: string;
  resource: OntologyDeleteResource;
  columnKey: string;
  value: unknown;
  disabled?: boolean;
  kind: 'text' | 'textarea' | 'select';
  selectOptions?: readonly string[];
  formatCommit?: (draft: string) => unknown;
  authContext?: OntologyRequestAuthContext;
  onSaved: () => void | Promise<void>;
  onError: (message: string) => void;
};

function rawString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function stableString(v: unknown): string {
  if (v == null) return '';
  return String(v);
}

const CELL_H = 38;

export default function EditableOntologyCell({
  groupId,
  rowId,
  resource,
  columnKey,
  value,
  disabled = false,
  kind,
  selectOptions,
  formatCommit,
  authContext,
  onSaved,
  onError,
}: EditableOntologyCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  const display = rawString(value);
  const showLabel = display || '—';

  const beginEdit = useCallback(() => {
    if (disabled || saving) return;
    if (kind === 'select' && selectOptions?.length) {
      setDraft(display || selectOptions[0] || '');
      setEditing(true);
      return;
    }
    setDraft(display);
    setEditing(true);
  }, [disabled, saving, kind, selectOptions, display]);

  useEffect(() => {
    if (!editing) return;
    const el = kind === 'select' ? selectRef.current : inputRef.current;
    if (!el) return;
    el.focus();
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.select();
    }
  }, [editing, kind]);

  const saveIfChanged = useCallback(
    async (patchValue: unknown) => {
      const current =
        kind === 'select'
          ? stableString(value)
          : formatCommit
            ? formatCommit(display)
            : display.trim();
      const next = patchValue;
      if (Object.is(next, current) || (next === '' && current === '')) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        await patchOntologySavedRow(
          { resource, group_id: groupId, id: rowId, patch: { [columnKey]: next } },
          authContext
        );
        setEditing(false);
        await onSaved();
      } catch (e) {
        onError(e instanceof OntologyApiError ? e.message : e instanceof Error ? e.message : 'Save failed');
        setEditing(false);
      } finally {
        setSaving(false);
      }
    },
    [kind, formatCommit, display, value, resource, groupId, rowId, columnKey, authContext, onSaved, onError]
  );

  const commitText = useCallback(() => {
    const patchVal = formatCommit ? formatCommit(draft) : draft.trim();
    const equivCurrent = formatCommit ? formatCommit(display) : display.trim();
    if (Object.is(patchVal, equivCurrent)) {
      setEditing(false);
      return;
    }
    void saveIfChanged(patchVal);
  }, [draft, display, formatCommit, saveIfChanged]);

  const displayStyle: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: CELL_H,
    height: CELL_H,
    lineHeight: `${CELL_H}px`,
    padding: '0 8px',
    margin: 0,
    fontSize: '13px',
    fontFamily: 'inherit',
    color: 'inherit',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textAlign: 'left',
    cursor: disabled || saving ? 'default' : 'pointer',
  };

  const activeControlBase: CSSProperties = {
    boxSizing: 'border-box',
    width: '100%',
    minHeight: CELL_H,
    height: CELL_H,
    lineHeight: `${CELL_H}px`,
    padding: '0 8px',
    margin: 0,
    color: 'inherit',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: 'transparent',
    border: '1px solid #2f426e',
    borderRadius: '10px',
    boxShadow: 'var(--glass-inner-glow), 0 0 0 1px rgba(147, 197, 253, 0.3), 0 0 12px rgba(147, 197, 253, 0.25)',
    outline: 'none',
  };

  if (kind === 'select' && selectOptions?.length && editing) {
    return (
      <select
        ref={selectRef}
        className="ontology-editable-control"
        value={draft || display || selectOptions[0]}
        disabled={saving}
        onBlur={() => {
          if (!saving) setEditing(false);
        }}
        onChange={(e) => {
          const v = e.target.value;
          setDraft(v);
          void saveIfChanged(v);
        }}
        onKeyDown={(e: KeyboardEvent<HTMLSelectElement>) => {
          if (e.key === 'Escape') setEditing(false);
        }}
        style={{ ...activeControlBase, cursor: saving ? 'wait' : 'pointer' }}
      >
        {selectOptions.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  if (kind === 'textarea' && editing) {
    return (
      <textarea
        ref={inputRef}
        className="ontology-editable-control"
        value={draft}
        disabled={saving}
        rows={1}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commitText()}
        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
          }
        }}
        style={{ ...activeControlBase, resize: 'none', overflow: 'hidden', whiteSpace: 'nowrap' }}
      />
    );
  }

  if (editing && kind === 'text') {
    return (
      <input
        ref={inputRef}
        className="ontology-editable-control"
        type="text"
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commitText()}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitText();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            setEditing(false);
          }
        }}
        style={activeControlBase}
      />
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled || saving ? -1 : 0}
      onClick={beginEdit}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        if (disabled || saving) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          beginEdit();
        }
      }}
      title="Click to edit"
      style={displayStyle}
    >
      {showLabel}
    </div>
  );
}
