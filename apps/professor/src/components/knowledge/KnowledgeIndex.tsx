import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { fetchFileSummaries, fetchChunksForFile, FileSummary, VectorDocument, indexFileToVector, unindexFileByFilename } from '../../services/ragManagement';

interface KnowledgeDocument {
  id: string;
  fileName: string;
  source: string;
  chunkIndex: number;
  content: string;
  pageInfo?: string;
  syncStatus: 'synced' | 'orphaned';
  createdAt?: string;
}

const KnowledgeIndex: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalItems, setTotalItems] = useState(0);
  const [fileSummaries, setFileSummaries] = useState<FileSummary[]>([]);
  const [chunksByFile, setChunksByFile] = useState<Map<string, KnowledgeDocument[]>>(new Map());
  const [loadingChunks, setLoadingChunks] = useState<Set<string>>(new Set());
  const [loadedChunkCounts, setLoadedChunkCounts] = useState<Map<string, number>>(new Map()); // Track how many chunks are loaded per file
  const [totalChunkCounts, setTotalChunkCounts] = useState<Map<string, number>>(new Map()); // Track total chunks per file
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [loadingProgress, setLoadingProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<KnowledgeDocument | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState<any>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);

  // Load file summaries on mount and when pagination changes
  useEffect(() => {
    loadFileSummaries();
  }, [currentPage, itemsPerPage]);

  // Load chunks when a file is expanded (only initial 10 chunks)
  useEffect(() => {
    expandedFiles.forEach(fileName => {
      const hasChunks = chunksByFile.has(fileName) && (chunksByFile.get(fileName)?.length || 0) > 0;
      if (!hasChunks && !loadingChunks.has(fileName)) {
        loadChunksForFile(fileName, 10, 0); // Load initial 10 chunks
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedFiles, chunksByFile, loadingChunks]);

  const loadFileSummaries = async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStatus('Connecting to database...');
    setLoadingProgress(null);

    try {
      console.log(`🔄 Loading file summaries (fast mode)...`);
      setLoadingStatus('Fetching document metadata...');
      
      const response = await fetchFileSummaries((current, total, status) => {
        setLoadingStatus(status);
        setLoadingProgress({ current, total });
      });
      
      console.log('📋 File summaries response:', response);
      
      if (response.success) {
        setError(null); // Clear any previous errors
        setLoadingStatus(`Found ${response.files.length} files with ${response.total.toLocaleString()} chunks`);
        setFileSummaries(response.files);
        setTotalItems(response.total);
        console.log(`✅ Loaded ${response.files.length} file summaries (${response.total} total chunks)`);
        
        // Clear status after a brief moment
        setTimeout(() => {
          setLoadingStatus('');
          setLoadingProgress(null);
        }, 1000);
      } else {
        const errorMsg = response.message || 'Failed to load file summaries';
        setError(errorMsg);
        setLoadingStatus('');
        setLoadingProgress(null);
        console.error('❌ Failed to load file summaries:', {
          message: errorMsg,
          response: response
        });
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to connect to Supabase. Please check your configuration.';
      setError(errorMessage);
      setLoadingStatus('');
      setLoadingProgress(null);
      console.error('❌ Error loading file summaries:', {
        error: err,
        message: err?.message,
        stack: err?.stack
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadChunksForFile = async (fileName: string, limit: number = 10, offset: number = 0) => {
    setLoadingChunks(prev => new Set(prev).add(fileName));
    
    try {
      const response = await fetchChunksForFile(fileName, limit, offset);
      
      if (response.success) {
        // Get file summary for total chunk count
        const fileSummary = fileSummaries.find(f => f.fileName === fileName);
        const totalChunks = response.total || fileSummary?.chunkCount || response.documents.length;
        
        // Update total chunk count
        setTotalChunkCounts(prev => {
          const newMap = new Map(prev);
          newMap.set(fileName, totalChunks);
          return newMap;
        });
        
        // Transform VectorDocument to KnowledgeDocument
        const transformedDocs: KnowledgeDocument[] = response.documents.map((doc: VectorDocument, index: number) => {
          const metadata = doc.metadata || {};
          
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
            chunkIndex: metadata.chunkIndex || (offset + index),
            content: doc.content,
            pageInfo: pageInfo,
            syncStatus: fileSummary?.syncStatus || 'orphaned',
            createdAt: (doc as any).created_at || new Date().toISOString(),
            metadata: metadata,
          };
        });

        // Add chunk info with total count
        transformedDocs.forEach((doc, idx) => {
          const chunkNumber = offset + idx + 1;
          (doc as any).chunkInfo = `Chunk ${chunkNumber} of ${totalChunks}`;
        });

        setChunksByFile(prev => {
          const newMap = new Map(prev);
          const existingChunks = newMap.get(fileName) || [];
          // Append new chunks to existing ones
          newMap.set(fileName, [...existingChunks, ...transformedDocs]);
          return newMap;
        });
        
        // Update loaded count
        setLoadedChunkCounts(prev => {
          const newMap = new Map(prev);
          const currentLoaded = newMap.get(fileName) || 0;
          newMap.set(fileName, currentLoaded + transformedDocs.length);
          return newMap;
        });
        
        console.log(`✅ Loaded ${transformedDocs.length} chunks for ${fileName} (${offset + transformedDocs.length} / ${totalChunks} total)`);
      } else {
        console.error('Failed to load chunks:', response.message);
      }
    } catch (err) {
      console.error('Error loading chunks for file:', err);
    } finally {
      setLoadingChunks(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileName);
        return newSet;
      });
    }
  };

  const loadMoreChunks = async (fileName: string) => {
    const currentLoaded = loadedChunkCounts.get(fileName) || 0;
    await loadChunksForFile(fileName, 50, currentLoaded);
  };

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered by user');
    setLastRefreshTime(new Date().toLocaleTimeString());
    setCurrentPage(1); // Reset to first page
    setChunksByFile(new Map()); // Clear cached chunks
    setLoadedChunkCounts(new Map()); // Clear loaded counts
    setTotalChunkCounts(new Map()); // Clear total counts
    setExpandedFiles(new Set()); // Collapse all files
    loadFileSummaries();
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
        setChunksByFile(new Map()); // Clear cached chunks
        setExpandedFiles(new Set()); // Collapse all files
        loadFileSummaries(); // Refresh the list
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
        // Remove chunks from cache
        setChunksByFile(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileName);
          return newMap;
        });
        setExpandedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileName);
          return newSet;
        });
        loadFileSummaries(); // Refresh the list
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Error unindexing file: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };


  const handleToggleFile = (fileName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion when clicking checkbox
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
    setIsSelectAll(false); // Deselect "Select All" if individual file is toggled
  };

  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) {
      alert('No files selected for deletion.');
      return;
    }

    const filesToDelete = Array.from(selectedFiles);
    const fileList = filesToDelete.slice(0, 5).join(', ');
    const moreFiles = filesToDelete.length > 5 ? ` and ${filesToDelete.length - 5} more file(s)` : '';
    const fullFileList = fileList + moreFiles;

    // First confirmation
    if (!confirm(`Are you sure you want to unindex all chunks for ${filesToDelete.length} file(s)?\n\nFiles:\n${fullFileList}\n\nThis action cannot be undone.`)) {
      return;
    }

    // Second confirmation for safety
    if (!confirm(`⚠️ FINAL CONFIRMATION: Unindex all chunks for ${filesToDelete.length} file(s)?\n\nThis will permanently remove ALL chunks for:\n${fullFileList}`)) {
      return;
    }

    setActionLoading('batch-delete');
    let successCount = 0;
    let failCount = 0;
    const failedFiles: string[] = [];

    try {
      for (const fileName of filesToDelete) {
        try {
          const result = await unindexFileByFilename(fileName);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedFiles.push(`${fileName}: ${result.message}`);
          }
        } catch (error) {
          failCount++;
          failedFiles.push(`${fileName}: Unknown error`);
          console.error(`Error unindexing file ${fileName}:`, error);
        }
      }

      // Show results
      if (successCount > 0) {
        alert(`✅ ${successCount} file(s) unindexed successfully.`);
      }
      if (failCount > 0) {
        alert(`❌ ${failCount} file(s) failed to unindex: ${failedFiles.join(', ')}`);
      }

      // Clear selection and refresh
      setSelectedFiles(new Set());
      setIsSelectAll(false);
      setChunksByFile(new Map()); // Clear cached chunks
      setExpandedFiles(new Set()); // Collapse all files
      await loadFileSummaries();
    } catch (error) {
      console.error('Error in batch delete:', error);
      alert('Error during batch delete');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFileExpansion = (fileName: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileName)) {
        newSet.delete(fileName);
      } else {
        newSet.add(fileName);
      }
      return newSet;
    });
  };

  // Truncate filename in the middle (macOS Finder style) - always show extension at the end
  const truncateFileName = (fileName: string, maxLength: number = 30): string => {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    
    // Extract extension (everything after the last dot)
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === 0) {
      // No extension or starts with dot, just truncate in the middle
      const half = Math.floor(maxLength / 2);
      return `${fileName.substring(0, half - 2)}...${fileName.substring(fileName.length - half + 2)}`;
    }
    
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex); // includes the dot, e.g., ".md"
    
    // Calculate available length for name part (subtract extension and "...")
    const availableLength = maxLength - extension.length - 3; // 3 for "..."
    
    if (availableLength < 4) {
      // Too short, show as much as possible but always show extension
      const frontPart = fileName.substring(0, Math.max(1, maxLength - extension.length - 3));
      return `${frontPart}...${extension}`;
    }
    
    // Split available length between front and back parts
    const frontLength = Math.floor(availableLength / 2);
    const backLength = availableLength - frontLength;
    
    // Get front part and back part of name (before extension)
    const frontPart = nameWithoutExt.substring(0, frontLength);
    const backPart = nameWithoutExt.substring(nameWithoutExt.length - backLength);
    
    // Ensure extension is always at the end
    return `${frontPart}...${backPart}${extension}`;
  };

  const handleShowMetadata = (doc: KnowledgeDocument) => {
    // Build metadata from file summaries and loaded chunks
    const uniqueFiles: Record<string, any> = {};
    
    fileSummaries.forEach(file => {
      uniqueFiles[file.fileName] = {
        fileName: file.fileName,
        chunkCount: file.chunkCount,
        chunks: chunksByFile.get(file.fileName) || []
      };
    });

    setSelectedMetadata(uniqueFiles);
    setShowMetadataModal(true);
  };

  // Get original document metadata for display
  const getOriginalMetadata = (doc: KnowledgeDocument) => {
    // Find the document in loaded chunks
    const chunks = chunksByFile.get(doc.fileName);
    const originalDoc = chunks?.find(d => d.id === doc.id);
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

  // Filter file summaries by search query
  const filteredFiles = fileSummaries.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination based on number of unique files
  const totalUniqueFiles = filteredFiles.length;
  const displayItemsPerPage = 20; // Show 20 files per page
  const totalPages = Math.ceil(totalUniqueFiles / displayItemsPerPage);
  
  // Paginate files
  const startIndex = (currentPage - 1) * displayItemsPerPage;
  const endIndex = startIndex + displayItemsPerPage;
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  const handleToggleSelectAll = () => {
    const currentPageFiles = paginatedFiles.map(f => f.fileName);
    if (isSelectAll) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(currentPageFiles));
    }
    setIsSelectAll(prev => !prev);
  };

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
          <span>Total: {totalItems.toLocaleString()} chunks in {totalUniqueFiles} files</span>
          <span>Showing {paginatedFiles.length} files (Page {currentPage} of {totalPages || 1})</span>
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
          <span className="refresh-icon" style={{ 
            animation: isLoading ? 'spin 1s linear infinite' : 'none',
            display: 'inline-block'
          }}>↻</span>
          {isLoading ? (loadingStatus || 'Loading...') : t('knowledge.refresh')}
          {lastRefreshTime && !isLoading && (
            <span style={{ fontSize: '0.8em', opacity: 0.7, marginLeft: '8px' }}>
              (Last: {lastRefreshTime})
            </span>
          )}
        </button>
        {selectedFiles.size > 0 && (
          <button
            className="refresh-btn"
            onClick={handleBatchDelete}
            disabled={actionLoading === 'batch-delete'}
            style={{
              backgroundColor: 'var(--error, #ef4444)',
              color: 'white',
              marginLeft: '8px'
            }}
          >
            Unindex {selectedFiles.size} file(s)
          </button>
        )}
      </div>

      {/* Loading Status Indicator */}
      {isLoading && loadingStatus && (
        <div style={{
          backgroundColor: 'var(--admin-bg-secondary)',
          border: '1px solid var(--admin-border)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: loadingProgress ? '8px' : '0'
          }}>
            <div className="spinner" style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(59, 230, 255, 0.2)',
              borderTop: '2px solid #3be6ff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              flexShrink: 0
            }}></div>
            <span style={{ 
              flex: 1, 
              fontWeight: '500',
              fontSize: '14px',
              color: 'var(--admin-text)'
            }}>
              {loadingStatus}
            </span>
            {loadingProgress && loadingProgress.total > 0 && (
              <span style={{ 
                color: 'var(--admin-primary)',
                fontWeight: '600',
                fontSize: '14px',
                whiteSpace: 'nowrap'
              }}>
                {Math.round((loadingProgress.current / loadingProgress.total) * 100)}%
              </span>
            )}
          </div>
          {loadingProgress && loadingProgress.total > 0 && (
            <div style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--admin-text-muted)'
            }}>
              <div style={{
                flex: 1,
                height: '6px',
                backgroundColor: 'var(--admin-border)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, (loadingProgress.current / loadingProgress.total) * 100)}%`,
                  backgroundColor: 'var(--admin-primary)',
                  transition: 'width 0.3s ease',
                  borderRadius: '3px'
                }}></div>
              </div>
              <span style={{ whiteSpace: 'nowrap' }}>
                {loadingProgress.current.toLocaleString()} / {loadingProgress.total.toLocaleString()} documents
              </span>
            </div>
          )}
        </div>
      )}

      {/* Debug Info */}
      <div style={{ 
        backgroundColor: 'var(--admin-bg-secondary)',
        border: '1px solid var(--admin-border)',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '0.9em'
      }}>
        <strong>🔍 Debug Info:</strong> Total: {totalItems.toLocaleString()} chunks ({totalUniqueFiles} unique files) | 
        Loaded chunks: {Array.from(chunksByFile.values()).reduce((sum, chunks) => sum + chunks.length, 0).toLocaleString()} | Showing: {paginatedFiles.length} files on this page | 
        Last Refresh: {lastRefreshTime || 'Never'} | 
        <button 
          onClick={() => {
            console.log('📊 File summaries:', fileSummaries);
            console.log('📊 Loaded chunks:', chunksByFile);
            console.log('📊 Filtered files:', filteredFiles);
          }}
          style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '0.8em' }}
        >
          Log State
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message" style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fee', 
          color: '#c33', 
          borderRadius: '4px', 
          marginBottom: '16px',
          border: '1px solid #fcc',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong>Error:</strong> {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              loadFileSummaries();
            }}
            style={{
              padding: '4px 12px',
              backgroundColor: '#c33',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Retry
          </button>
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
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={isSelectAll}
                    onChange={handleToggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>File Name</th>
                <th>Chunk</th>
                <th>Location</th>
                <th>Content Preview</th>
                <th>Sync Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Failed to load file summaries' : 'No files found. Upload and index files to see them here.'}
                  </td>
                </tr>
              ) : (
                paginatedFiles.map((fileSummary) => {
                  const fileName = fileSummary.fileName;
                  const isExpanded = expandedFiles.has(fileName);
                  const chunks = chunksByFile.get(fileName) || [];
                  const isLoadingChunks = loadingChunks.has(fileName);
                  const firstChunk = chunks[0];
                  
                  return (
                    <React.Fragment key={fileName}>
                      {/* Main row - always visible */}
                      <tr 
                        onClick={() => toggleFileExpansion(fileName)} 
                        style={{ 
                          cursor: 'pointer', 
                          backgroundColor: isExpanded ? 'rgba(59, 230, 255, 0.1)' : selectedFiles.has(fileName) ? 'rgba(59, 130, 246, 0.15)' : undefined,
                          fontWeight: isExpanded ? '500' : 'normal'
                        }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(fileName)}
                            onChange={() => {
                              setSelectedFiles(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(fileName)) {
                                  newSet.delete(fileName);
                                } else {
                                  newSet.add(fileName);
                                }
                                return newSet;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td className="doc-title" title={fileName} style={{ maxWidth: '200px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '12px', color: 'var(--admin-primary)', flexShrink: 0 }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span style={{ 
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden'
                            }}>
                              {truncateFileName(fileName, 25)}
                            </span>
                          </div>
                        </td>
                        <td className="doc-chunk-index" style={{ color: 'var(--admin-primary)', fontWeight: '600' }}>
                          {fileSummary.chunkCount} {fileSummary.chunkCount === 1 ? 'chunk' : 'chunks'}
                        </td>
                        <td className="doc-page-info">{firstChunk?.pageInfo || '-'}</td>
                        <td className="doc-content" title={firstChunk?.content} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {firstChunk ? `${firstChunk.content.substring(0, 100)}...` : '-'}
                        </td>
                        <td>
                          <span style={{ 
                            color: fileSummary.syncStatus === 'synced' ? '#10b981' : '#f59e0b',
                            fontSize: '14px'
                          }}>
                            {fileSummary.syncStatus === 'synced' ? 'Synced' : 'Orphaned'}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                          {fileSummary.firstChunkCreatedAt ? new Date(fileSummary.firstChunkCreatedAt).toLocaleDateString() : '-'}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="file-actions">
                            {firstChunk && (
                              <button 
                                className="icon-action-btn" 
                                title="View details"
                                onClick={() => handleViewDocument(firstChunk)}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              </button>
                            )}
                            <button 
                              className="icon-action-btn delete-icon-btn" 
                              title="Unindex all chunks"
                              onClick={() => handleUnindexFile(fileName)}
                              disabled={actionLoading === fileName}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Expanded rows - show individual chunks */}
                      {isExpanded && (
                        <>
                          {isLoadingChunks && chunks.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ paddingLeft: '40px', textAlign: 'center', padding: '20px', color: '#666' }}>
                                Loading chunks...
                              </td>
                            </tr>
                          ) : chunks.length > 0 ? (
                            <>
                              {chunks.map((doc, idx) => (
                                <tr key={doc.id} style={{ backgroundColor: 'rgba(9, 14, 34, 0.3)' }}>
                                  <td style={{ paddingLeft: '40px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                                    └ Chunk {idx + 1}
                                  </td>
                                  <td className="doc-chunk-index">{(doc as any).chunkInfo || `${idx + 1} of ${chunks.length}`}</td>
                                  <td className="doc-page-info">{doc.pageInfo || '-'}</td>
                                  <td className="doc-content" title={doc.content} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                                    {doc.content.substring(0, 100)}...
                                  </td>
                                  <td>
                                    <span style={{ 
                                      color: doc.syncStatus === 'synced' ? '#10b981' : '#f59e0b',
                                      fontSize: '13px'
                                    }}>
                                      {doc.syncStatus === 'synced' ? 'Synced' : 'Orphaned'}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-'}
                                  </td>
                                  <td>
                                    <button 
                                      className="icon-action-btn" 
                                      title="View this chunk"
                                      onClick={() => handleViewDocument(doc)}
                                      style={{ fontSize: '12px' }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                      </svg>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              {/* Load More Button */}
                              {(() => {
                                const loadedCount = loadedChunkCounts.get(fileName) || chunks.length;
                                const totalCount = totalChunkCounts.get(fileName) || fileSummary.chunkCount;
                                const hasMore = loadedCount < totalCount;
                                
                                return hasMore && (
                                  <tr>
                                    <td colSpan={8} style={{ paddingLeft: '40px', padding: '16px', textAlign: 'center' }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          loadMoreChunks(fileName);
                                        }}
                                        disabled={isLoadingChunks}
                                        style={{
                                          padding: '8px 16px',
                                          backgroundColor: 'var(--admin-primary)',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          cursor: isLoadingChunks ? 'not-allowed' : 'pointer',
                                          fontSize: '14px',
                                          fontWeight: '500',
                                          opacity: isLoadingChunks ? 0.6 : 1
                                        }}
                                      >
                                        {isLoadingChunks ? (
                                          <>Loading...</>
                                        ) : (
                                          <>Load more (showing {loadedCount} of {totalCount} chunks)</>
                                        )}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })()}
                            </>
                          ) : (
                            <tr>
                              <td colSpan={8} style={{ paddingLeft: '40px', textAlign: 'center', padding: '20px', color: '#666' }}>
                                No chunks loaded
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
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
