import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSession } from '../../services/auth';
import {
  OntologyApiError,
  approveAndSaveOntology,
  extractOntologyPreview,
  type OntologyApproveAndSaveResponse,
  type OntologyExtractPreviewResponse,
} from '../../services/ontology';
import '../../styles/knowledge-management.css';
import OntologyExtractWorkspace from '../../components/admin/ontology/OntologyExtractWorkspace';
import OntologySavedDataPanel from '../../components/admin/ontology/OntologySavedDataPanel';

type MainOntologyTab = 'extract' | 'saved';

export default function OntologyManagement() {
  const session = getSession();
  const [searchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState<MainOntologyTab>('extract');
  const [sourceText, setSourceText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewDraft, setPreviewDraft] = useState<OntologyExtractPreviewResponse | null>(null);
  const [saveResult, setSaveResult] = useState<OntologyApproveAndSaveResponse | null>(null);

  const groupId = useMemo(() => searchParams.get('group') || '', [searchParams]);
  const createdByUserId = useMemo(() => (session?.userId ?? '').trim(), [session]);

  const authContext = useMemo(
    () => ({
      userId: session?.userId,
      userEmail: session?.email,
      groupId: groupId || undefined,
    }),
    [session?.userId, session?.email, groupId]
  );

  const hasGroup = groupId.trim().length > 0;
  const hasUserId = createdByUserId.length > 0;
  const busy = isLoading || isSaving;

  const onExtract = async () => {
    if (!hasGroup || !hasUserId || !sourceText.trim() || busy) return;
    setIsLoading(true);
    setError(null);
    setSaveError(null);
    setSaveResult(null);
    try {
      const preview = await extractOntologyPreview(
        {
          group_id: String(groupId),
          source_type: 'manual_entry',
          source_text: sourceText.trim(),
          created_by: createdByUserId,
        },
        authContext
      );
      setPreviewDraft(JSON.parse(JSON.stringify(preview)) as OntologyExtractPreviewResponse);
    } catch (e) {
      setPreviewDraft(null);
      setError(e instanceof Error ? e.message : 'Failed to extract ontology preview');
    } finally {
      setIsLoading(false);
    }
  };

  const onApproveAndSave = async () => {
    if (!hasGroup || !hasUserId || !previewDraft || busy) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveResult(null);
    try {
      const saved = await approveAndSaveOntology(
        {
          group_id: String(groupId),
          source_type: 'manual_entry',
          source_text: previewDraft.source_text.trim(),
          created_by: createdByUserId,
          entities: previewDraft.entities,
          aliases: previewDraft.aliases,
          relationships: previewDraft.relationships,
          properties: previewDraft.properties,
          warnings: previewDraft.warnings,
        },
        authContext
      );
      setSaveResult(saved);
    } catch (e: unknown) {
      const details = e instanceof OntologyApiError ? e.details : undefined;
      const msg =
        typeof details === 'object' &&
        details &&
        'message' in details &&
        typeof (details as { message: unknown }).message === 'string'
          ? (details as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Approve and save failed';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="km-header" style={{ marginBottom: '12px' }}>
        <div className="km-title-section">
          <h1 className="km-title">Ontology Management</h1>
          <p className="km-subtitle">
            Extract and save new ontology from text, or review data already stored in Supabase for this group.
          </p>
        </div>
      </div>

      <div className="km-tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`km-tab ${mainTab === 'extract' ? 'active' : ''}`}
          onClick={() => setMainTab('extract')}
        >
          Extract &amp; save
        </button>
        <button
          type="button"
          className={`km-tab ${mainTab === 'saved' ? 'active' : ''}`}
          onClick={() => setMainTab('saved')}
        >
          Saved ontology
        </button>
      </div>

      <div className="km-content">
        {mainTab === 'extract' && (
          <OntologyExtractWorkspace
            groupId={groupId}
            hasGroup={hasGroup}
            hasUserId={hasUserId}
            createdByUserId={createdByUserId}
            sourceText={sourceText}
            onSourceTextChange={setSourceText}
            busy={busy}
            isLoading={isLoading}
            isSaving={isSaving}
            onExtract={onExtract}
            onApproveAndSave={onApproveAndSave}
            error={error}
            saveError={saveError}
            previewDraft={previewDraft}
            setPreviewDraft={setPreviewDraft}
            saveResult={saveResult}
          />
        )}
        {mainTab === 'saved' && <OntologySavedDataPanel groupId={groupId} authContext={authContext} />}
      </div>
    </div>
  );
}
