import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { fetchVectorDocuments, VectorDocument } from '../../services/ragManagement';

interface KnowledgeDocument {
  id: string;
  fileName: string;
  source: string;
  chunkIndex: number;
  content: string;
  pageInfo?: string;
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
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);

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
        const transformedDocs: KnowledgeDocument[] = response.documents.map((doc: VectorDocument) => {
          const metadata = doc.metadata || {};
          
          console.log('Document metadata:', metadata); // Debug log
          
          // Extract file name from various possible metadata fields
          let fileName = 'Unknown';
          
          // Priority order for filename extraction:
          // 1. metadata.fileName (if n8n sets it)
          // 2. metadata.source (if not 'blob')
          // 3. metadata.pdf.info.Title or Creator
          // 4. Extract from content if it mentions a filename
          
          if (metadata.fileName) {
            fileName = metadata.fileName;
          } else if (metadata.source && metadata.source !== 'blob') {
            fileName = metadata.source;
          } else if (metadata.pdf?.info?.Title) {
            fileName = metadata.pdf.info.Title;
          } else if (metadata.pdf?.info?.Creator) {
            fileName = `Document by ${metadata.pdf.info.Creator}`;
          } else if (metadata.blobType) {
            // Use blob type as fallback
            const ext = metadata.blobType.split('/')[1] || 'pdf';
            fileName = `document.${ext}`;
          }
          
          // Extract page/line info
          let pageInfo = '';
          if (metadata.loc?.lines) {
            pageInfo = `Lines ${metadata.loc.lines.from}-${metadata.loc.lines.to}`;
          } else if (metadata.loc?.pageNumber) {
            pageInfo = `Page ${metadata.loc.pageNumber}`;
          } else if (metadata.pdf?.totalPages) {
            pageInfo = `PDF (${metadata.pdf.totalPages} pages)`;
          }
          
          return {
            id: doc.id.toString(),
            fileName: fileName,
            source: metadata.source || 'blob',
            chunkIndex: metadata.chunkIndex || 0,
            content: doc.content,
            pageInfo: pageInfo,
            syncStatus: 'synced' as const,
          };
        });

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

  const handleViewDocument = (doc: KnowledgeDocument) => {
    setSelectedDocument(doc);
  };

  // Get original document metadata for display
  const getOriginalMetadata = (doc: KnowledgeDocument) => {
    // Find the original document in the documents array to get full metadata
    const originalDoc = documents.find(d => d.id === doc.id);
    return originalDoc ? originalDoc : doc;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                <th>File Name</th>
                <th>Chunk #</th>
                <th>Location</th>
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
                    <td className="doc-title">{doc.fileName}</td>
                    <td className="doc-chunk-index">{doc.chunkIndex}</td>
                    <td className="doc-page-info">{doc.pageInfo || '-'}</td>
                    <td className="doc-content" style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.content.substring(0, 150)}...
                    </td>
                    <td>
                      <span className={`sync-status ${doc.syncStatus}`}>
                        {doc.syncStatus === 'synced' ? '✓' : '⏳'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="action-btn view-btn" 
                        title={t('knowledge.view')}
                        onClick={() => handleViewDocument(doc)}
                      >
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

      {/* Content Preview Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2"
            style={{ 
              backgroundColor: 'var(--admin-card)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                Content Preview
              </h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Document Info */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--admin-bg-secondary)' }}>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>File Name:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>{selectedDocument.fileName}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Chunk Index:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>{selectedDocument.chunkIndex}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Source:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>{selectedDocument.source}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Location:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>{selectedDocument.pageInfo || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Sync Status:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>
                      <span className={`sync-status ${selectedDocument.syncStatus}`}>
                        {selectedDocument.syncStatus === 'synced' ? '✓ Synced' : '⏳ Pending'}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Chunk ID:</span>
                    <span className="ml-2 font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>{selectedDocument.id}</span>
                  </div>
                </div>
              </div>
              
              {/* Full Content */}
              <div>
                <h4 className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
                  Full Content
                </h4>
                <div 
                  className="p-4 rounded-lg border-2 font-mono text-sm whitespace-pre-wrap"
                  style={{ 
                    backgroundColor: 'var(--admin-bg-secondary)',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text)',
                    maxHeight: '500px',
                    overflowY: 'auto'
                  }}
                >
                  {selectedDocument.content}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setSelectedDocument(null)}
                className="px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105"
                style={{ 
                  backgroundColor: 'var(--admin-primary)', 
                  color: 'white',
                  boxShadow: '0 4px 14px 0 rgba(59, 230, 255, 0.3)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeIndex;
