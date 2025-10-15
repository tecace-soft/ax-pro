import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { fetchVectorDocuments, VectorDocument } from '../../services/ragManagement';

interface KnowledgeDocument {
  id: string;
  title: string;
  parentId: string;
  chunkId: string;
  content: string;
  syncStatus: 'synced' | 'pending' | 'error';
}

const KnowledgeIndex: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(200);
  const [totalItems, setTotalItems] = useState(0);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load documents from Supabase on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchVectorDocuments();
      if (response.success) {
        // Transform VectorDocument to KnowledgeDocument
        const transformedDocs: KnowledgeDocument[] = response.documents.map((doc: VectorDocument) => ({
          id: doc.id.toString(),
          title: doc.metadata?.fileName || doc.metadata?.source || `Document ${doc.id}`,
          parentId: doc.metadata?.fileName || doc.metadata?.source || `Document ${doc.id}`,
          chunkId: `chunk_${doc.id}`,
          content: doc.content.substring(0, 200), // First 200 chars
          syncStatus: 'synced' as const,
        }));

        setDocuments(transformedDocs);
        setTotalItems(response.total);
        console.log(`✅ Loaded ${transformedDocs.length} documents from Supabase`);
      } else {
        setError(response.message || 'Failed to load documents');
        console.error('Failed to load documents:', response.message);
      }
    } catch (err) {
      const errorMessage = 'Failed to connect to Supabase. Please check your configuration.';
      setError(errorMessage);
      console.error('Error loading documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDocuments();
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.parentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.chunkId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="knowledge-index">
      <div className="ki-header">
        <h2 className="ki-title">{t('knowledge.knowledgeIndex')}</h2>
        <p className="ki-description">{t('knowledge.knowledgeIndexDescription')}</p>
      </div>

      {/* Search and Controls */}
      <div className="ki-controls">
        <div className="ki-search">
          <input
            type="text"
            placeholder={t('knowledge.searchByTitleFilepathContent')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="ki-pagination-info">
          <span>Total items: {totalItems}</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="ki-items-per-page">
          <label>Items per page:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="items-select"
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        <div className="ki-navigation">
          <button
            className="nav-btn prev-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            {t('knowledge.previous')}
          </button>
          <button
            className="nav-btn next-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          >
            {t('knowledge.next')}
          </button>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
          <span className="refresh-icon">↻</span>
          {isLoading ? 'Loading...' : t('knowledge.refresh')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{ 
          padding: '12px', 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: '4px', 
          marginBottom: '16px' 
        }}>
          {error}
        </div>
      )}

      {/* Documents Table */}
      <div className="ki-table-container">
        {isLoading ? (
          <div className="loading-state" style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#666' 
          }}>
            <div className="spinner" style={{
              width: '24px',
              height: '24px',
              border: '2px solid #f3f3f3',
              borderTop: '2px solid #333',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            Loading documents...
          </div>
        ) : (
          <table className="ki-table">
            <thead>
              <tr>
                <th>{t('knowledge.documentTitle')}</th>
                <th>{t('knowledge.parentId')}</th>
                <th>{t('knowledge.chunkId')}</th>
                <th>Content Preview</th>
                <th>{t('knowledge.sync')}</th>
                <th>{t('knowledge.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Failed to load documents' : 'No documents found. Upload and index files to see them here.'}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td className="doc-title">{doc.title}</td>
                    <td className="doc-parent-id">{doc.parentId}</td>
                    <td className="doc-chunk-id">{doc.chunkId}</td>
                    <td className="doc-content" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.content}
                    </td>
                    <td>
                      <span className={`sync-status ${doc.syncStatus}`}>
                        {doc.syncStatus === 'synced' ? '✓' : '⏳'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn view-btn" title={t('knowledge.view')}>
                        👁️
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default KnowledgeIndex;
