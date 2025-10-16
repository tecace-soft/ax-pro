import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { fetchVectorDocuments, VectorDocument, indexFileToVector, unindexFileByFilename } from '../../services/ragManagement';

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
  const [itemsPerPage, setItemsPerPage] = useState(500);
  const [totalItems, setTotalItems] = useState(0);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');

  // Load documents from Supabase on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading documents from Supabase...');
      console.log('⏰ Current time:', new Date().toISOString());
      const response = await fetchVectorDocuments();
      console.log('📋 Raw response:', response);
      console.log('📊 Total documents found:', response.total || 0);
      console.log('📄 Documents array length:', response.documents?.length || 0);
      
      // Log each document's creation time to see if new ones are there
      if (response.documents && response.documents.length > 0) {
        console.log('📅 Document creation times:');
        response.documents.forEach((doc, index) => {
          console.log(`  ${index + 1}. ID: ${doc.id}, Metadata:`, doc.metadata);
        });
      }
      
      if (response.success) {
        // Transform VectorDocument to KnowledgeDocument
        const transformedDocs: KnowledgeDocument[] = response.documents.map((doc: VectorDocument) => {
          const metadata = doc.metadata || {};
          
          // Extract file name from metadata
          let fileName = 'Unknown';
          if (metadata.fileName) {
            fileName = metadata.fileName;
          } else if (metadata.source && metadata.source !== 'blob') {
            fileName = metadata.source;
          } else if (metadata.pdf?.info?.Title) {
            fileName = metadata.pdf.info.Title;
          } else if (metadata.blobType) {
            const ext = metadata.blobType.split('/')[1] || 'pdf';
            fileName = `document.${ext}`;
          }
          
          // Extract page/line info
          let pageInfo = '';
          if (metadata.loc?.lines) {
            pageInfo = `Lines ${metadata.loc.lines.from}-${metadata.loc.lines.to}`;
          } else if (metadata.loc?.pageNumber) {
            pageInfo = `Page ${metadata.loc.pageNumber}`;
          }
          
          return {
            id: doc.id.toString(),
            fileName: fileName,
            source: metadata.source || 'blob',
            chunkIndex: metadata.chunkIndex || 0,
            content: doc.content,
            pageInfo: pageInfo,
            syncStatus: 'synced' as const,
            metadata: metadata, // Keep full metadata for detail view
          };
        });

        // Calculate chunk counts per file
        const chunkCounts: Record<string, number> = {};
        transformedDocs.forEach(doc => {
          chunkCounts[doc.fileName] = (chunkCounts[doc.fileName] || 0) + 1;
        });

        // Add chunk info to each document
        const chunkPositions: Record<string, number> = {};
        transformedDocs.forEach(doc => {
          if (!chunkPositions[doc.fileName]) {
            chunkPositions[doc.fileName] = 0;
          }
          chunkPositions[doc.fileName]++;
          (doc as any).chunkInfo = `${chunkPositions[doc.fileName]} of ${chunkCounts[doc.fileName]}`;
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
    console.log('🔄 Manual refresh triggered by user');
    setLastRefreshTime(new Date().toLocaleTimeString());
    loadDocuments();
  };

  const handleViewDocument = (doc: KnowledgeDocument) => {
    setSelectedDocument(doc);
  };

  const handleIndexFile = async (fileName: string) => {
    setActionLoading(fileName);
    try {
      const result = await indexFileToVector(fileName);
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadDocuments(); // Refresh the list
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Error indexing file: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnindexFile = async (fileName: string) => {
    if (!confirm(`⚠️ Are you sure you want to unindex all chunks for "${fileName}"? This will remove ALL chunks for this file.`)) {
      return;
    }
    
    setActionLoading(fileName);
    try {
      const result = await unindexFileByFilename(fileName);
      if (result.success) {
        alert(`✅ ${result.message} (${result.deletedCount || 0} chunks removed)`);
        loadDocuments(); // Refresh the list
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Error unindexing file: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleShowMetadata = (doc: KnowledgeDocument) => {
    // Get unique filenames and their chunk counts
    const uniqueFiles = documents.reduce((acc, d) => {
      if (!acc[d.fileName]) {
        acc[d.fileName] = {
          fileName: d.fileName,
          chunkCount: 0,
          chunks: []
        };
      }
      acc[d.fileName].chunkCount++;
      acc[d.fileName].chunks.push(d);
      return acc;
    }, {} as Record<string, any>);

    setSelectedMetadata(uniqueFiles);
    setShowMetadataModal(true);
  };

  // Get original document metadata for display
  const getOriginalMetadata = (doc: KnowledgeDocument) => {
    // Find the original document in the documents array to get full metadata
    const originalDoc = documents.find(d => d.id === doc.id);
    return originalDoc ? originalDoc : doc;
  };

  // Extract all available metadata fields
  const getMetadataFields = (doc: KnowledgeDocument) => {
    // This would need to be passed from the parent component or fetched separately
    // For now, we'll show what we have available
    return {
      fileName: doc.fileName,
      chunkIndex: doc.chunkIndex,
      source: doc.source,
      pageInfo: doc.pageInfo,
      syncStatus: doc.syncStatus,
      content: doc.content
    };
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
            <option value={1000}>1000</option>
            <option value={2000}>2000</option>
            <option value={5000}>5000</option>
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
          {lastRefreshTime && (
            <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '8px' }}>
              (Last: {lastRefreshTime})
            </span>
          )}
        </button>
      </div>

      {/* Debug Info */}
      <div style={{ 
        backgroundColor: 'var(--admin-bg-secondary)',
        border: '1px solid var(--admin-border)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '0.9em'
      }}>
        <strong>🔍 Debug Info:</strong> Total: {totalItems} | Showing: {filteredDocuments.length} | 
        Last Refresh: {lastRefreshTime || 'Never'} | 
        <button 
          onClick={() => {
            console.log('📊 Current documents state:', documents);
            console.log('📊 Filtered documents:', filteredDocuments);
          }}
          style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.8em' }}
        >
          Log State
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
                <th>Chunk</th>
                <th>Location</th>
                <th>Content Preview</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Failed to load documents' : 'No documents found. Upload and index files to see them here.'}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td className="doc-title" title={doc.fileName} style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                      {doc.fileName}
                    </td>
                    <td className="doc-chunk-index">{(doc as any).chunkInfo || '1 of 1'}</td>
                    <td className="doc-page-info">{doc.pageInfo || '-'}</td>
                    <td className="doc-content" title={doc.content} style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                      {doc.content.substring(0, 150)}...
                    </td>
                    <td>
                      <div className="file-actions">
                        <button 
                          className="icon-action-btn" 
                          title="View details"
                          onClick={() => handleViewDocument(doc)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button 
                          className="icon-action-btn delete-icon-btn" 
                          title="Unindex file"
                          onClick={() => handleUnindexFile(doc.fileName)}
                          disabled={actionLoading === doc.fileName}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
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
              backgroundColor: 'var(--card, #2f2f2f)',
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
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Chunk:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>{(selectedDocument as any).chunkInfo || '1 of 1'}</span>
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
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Document ID:</span>
                    <span className="ml-2 font-mono text-xs" style={{ color: 'var(--admin-text-muted)' }}>{selectedDocument.id}</span>
                  </div>
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Sync Status:</span>
                    <span className="ml-2" style={{ color: 'var(--admin-text)' }}>
                      {selectedDocument.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              {(selectedDocument as any).metadata && (
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
                    Metadata
                  </h4>
                  <div 
                    className="p-4 rounded-lg border-2 font-mono text-sm"
                    style={{ 
                      backgroundColor: 'var(--admin-bg-secondary)',
                      borderColor: 'var(--admin-border)',
                      color: 'var(--admin-text)',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}
                  >
                    <pre>{JSON.stringify((selectedDocument as any).metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              {/* Full Content */}
              <div>
                <h4 className="font-semibold mb-2" style={{ color: 'var(--admin-text)' }}>
                  Content
                </h4>
                <div 
                  className="p-4 rounded-lg border-2 font-mono text-sm whitespace-pre-wrap"
                  style={{ 
                    backgroundColor: 'var(--admin-bg-secondary)',
                    borderColor: 'var(--admin-border)',
                    color: 'var(--admin-text)',
                    maxHeight: '400px',
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

      {/* Metadata Modal */}
      {showMetadataModal && selectedMetadata && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setShowMetadataModal(false)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto border-2"
            style={{ 
              backgroundColor: 'var(--card, #2f2f2f)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                📊 File Metadata & Chunk Information
              </h3>
              <button
                onClick={() => setShowMetadataModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-2 transition-colors"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {Object.values(selectedMetadata).map((file: any) => (
                <div key={file.fileName} className="p-4 rounded-lg border-2" style={{ 
                  backgroundColor: 'var(--admin-bg-secondary)',
                  borderColor: 'var(--admin-border)'
                }}>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold" style={{ color: 'var(--admin-text)' }}>
                      📄 {file.fileName}
                    </h4>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ 
                        backgroundColor: 'rgba(59, 230, 255, 0.1)',
                        color: 'var(--admin-primary)'
                      }}>
                        {file.chunkCount} chunks
                      </span>
                      <button
                        onClick={() => handleIndexFile(file.fileName)}
                        disabled={actionLoading === file.fileName}
                        className="px-3 py-1 rounded text-sm font-medium transition-colors"
                        style={{ 
                          backgroundColor: actionLoading === file.fileName ? '#6b7280' : '#10b981',
                          color: 'white'
                        }}
                      >
                        {actionLoading === file.fileName ? '⏳ Indexing...' : '📤 Index'}
                      </button>
                      <button
                        onClick={() => handleUnindexFile(file.fileName)}
                        disabled={actionLoading === file.fileName}
                        className="px-3 py-1 rounded text-sm font-medium transition-colors"
                        style={{ 
                          backgroundColor: actionLoading === file.fileName ? '#6b7280' : '#ef4444',
                          color: 'white'
                        }}
                      >
                        {actionLoading === file.fileName ? '⏳ Unindexing...' : '🗑️ Unindex'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {file.chunks.map((chunk: KnowledgeDocument, index: number) => (
                      <div key={chunk.id} className="p-3 rounded border" style={{ 
                        backgroundColor: 'var(--admin-card)',
                        borderColor: 'var(--admin-border)'
                      }}>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                              Chunk #{chunk.chunkIndex}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                              ID: {chunk.id}
                            </span>
                          </div>
                          <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            Source: {chunk.source}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            Location: {chunk.pageInfo || 'N/A'}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                            Status: <span className="sync-status-text">
                              {chunk.syncStatus === 'synced' ? 'Synced' : 'Pending'}
                            </span>
                          </div>
                          <div className="text-xs font-mono" style={{ 
                            color: 'var(--admin-text-muted)',
                            maxHeight: '60px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {chunk.content.substring(0, 100)}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setShowMetadataModal(false)}
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
