import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { ToastContainer } from '../ui/Toast';
import { 
  uploadFilesToSupabase,
  fetchFilesFromSupabase,
  deleteFileFromSupabase,
  indexFileToVector,
  unindexFileByFilename,
  reindexFile,
  checkIndexingStatus,
  checkFileSyncStatus,
  validateFileExtended, 
  formatFileSize, 
  getFileIcon,
  FileUploadResult,
  RAGFile 
} from '../../services/ragManagement';

const FileLibrary: React.FC = () => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<RAGFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);
  const [indexingStatus, setIndexingStatus] = useState<Record<string, {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message: string;
    chunksCount?: number;
    lastUpdated?: string;
  }>>({});
  const [pollingFiles, setPollingFiles] = useState<Set<string>>(new Set());
  const [isDevMode, setIsDevMode] = useState(() => {
    // Default to false (production mode), only true if explicitly set
    const stored = localStorage.getItem('n8n-dev-mode');
    // If no value stored, default to production (false)
    // If 'true' is stored, use dev mode
    // If 'false' is stored, use production mode
    return stored === 'true';
  });
  // Always use Supabase Storage
  const storageType = 'supabase' as const;

  // Toast helpers
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Toggle dev mode
  const toggleDevMode = () => {
    const newDevMode = !isDevMode;
    setIsDevMode(newDevMode);
    localStorage.setItem('n8n-dev-mode', newDevMode.toString());
    console.log(`🔧 Switched to ${newDevMode ? 'DEV' : 'PRODUCTION'} mode`);
  };

  // Reset to production mode (useful for debugging)
  const resetToProduction = () => {
    setIsDevMode(false);
    localStorage.setItem('n8n-dev-mode', 'false');
    console.log(`🔧 Reset to PRODUCTION mode`);
  };

  // Refresh sync status for all files
  const refreshSyncStatus = async () => {
    console.log('🔄 Refreshing sync status for all files...');
    setIsLoading(true);
    
    try {
      // Reload files to get updated sync status
      await loadFiles();
      console.log('✅ Sync status refreshed');
    } catch (error) {
      console.error('❌ Error refreshing sync status:', error);
      setError('Failed to refresh sync status');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch files on component mount
  useEffect(() => {
    loadFiles();
  }, [storageType]);

  // Force production mode on mount if no explicit dev mode setting
  useEffect(() => {
    const stored = localStorage.getItem('n8n-dev-mode');
    if (stored === null || stored === 'true') {
      // No setting stored or was set to dev, default to production
      setIsDevMode(false);
      localStorage.setItem('n8n-dev-mode', 'false');
      console.log('🔧 Defaulted to PRODUCTION mode');
    }
  }, []);

  // Add console command for easy debugging
  useEffect(() => {
    (window as any).resetToProduction = resetToProduction;
    (window as any).toggleDevMode = toggleDevMode;
    console.log('🔧 Debug commands available:');
    console.log('  - window.resetToProduction() - Reset to production mode');
    console.log('  - window.toggleDevMode() - Toggle between dev/prod');
  }, []);

  // Polling for indexing status
  useEffect(() => {
    if (pollingFiles.size === 0) return;

    const pollInterval = setInterval(async () => {
      for (const fileName of pollingFiles) {
        try {
          const status = await checkIndexingStatus(fileName);
          setIndexingStatus(prev => ({
            ...prev,
            [fileName]: {
              status: status.status,
              message: status.message,
              chunksCount: status.chunksCount,
              lastUpdated: status.lastUpdated
            }
          }));

          // Stop polling if completed or failed
          if (status.status === 'completed' || status.status === 'failed') {
            setPollingFiles(prev => {
              const newSet = new Set(prev);
              newSet.delete(fileName);
              return newSet;
            });
          }
        } catch (error) {
          console.error(`Error polling status for ${fileName}:`, error);
        }
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [pollingFiles]);

  // Load files from Supabase Storage
  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchFilesFromSupabase();
      if (response.success) {
        setUploadedFiles(response.files);
        console.log(`✅ Loaded ${response.files.length} files from Supabase Storage`);
      } else {
        setError(response.message || 'Failed to load files from Supabase');
        console.error('Failed to load files:', response.message);
      }
    } catch (err) {
      const errorMessage = 'Failed to connect to Supabase Storage. Please check your configuration.';
      setError(errorMessage);
      console.error('Error loading files:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    loadFiles();
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      const result = await deleteFileFromSupabase(fileName);
        
      if (result.success) {
        // Remove file from local state
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
        console.log(`✅ File ${fileName} deleted successfully`);
      } else {
        alert(`Failed to delete file: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
    }
  };

  // Handle file indexing
  const handleIndexFile = async (fileName: string) => {
    setActionLoading(fileName);
    try {
      console.log('🔄 Starting index process for:', fileName);
      
      // Set initial status
      setIndexingStatus(prev => ({
        ...prev,
        [fileName]: {
          status: 'processing',
          message: 'Sending file to n8n for indexing...'
        }
      }));
      
      const result = await indexFileToVector(fileName);
      console.log('📋 Index result:', result);
      
      if (result.success) {
        // Start polling for status updates
        setPollingFiles(prev => new Set(prev).add(fileName));
        
        setIndexingStatus(prev => ({
          ...prev,
          [fileName]: {
            status: 'processing',
            message: result.message || 'File sent for indexing, checking status...'
          }
        }));
        
        // Show initial success message
        showToast(`✅ ${result.message} - Status will update automatically. Check Knowledge Index tab when complete.`, 'success');
        loadFiles(); // Refresh the list
      } else {
        setIndexingStatus(prev => ({
          ...prev,
          [fileName]: {
            status: 'failed',
            message: result.message || 'Failed to send file for indexing'
          }
        }));
        showToast(`❌ Failed to index file: ${result.message}`, 'error');
      }
    } catch (error) {
      console.error('❌ Error indexing file:', error);
      setIndexingStatus(prev => ({
        ...prev,
        [fileName]: {
          status: 'failed',
          message: `Error: ${error}`
        }
      }));
      showToast(`❌ Error indexing file: ${error}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle file unindexing
  const handleUnindexFile = async (fileName: string) => {
    if (!confirm(`⚠️ Are you sure you want to unindex all chunks for "${fileName}"? This will remove ALL chunks for this file.`)) {
      return;
    }
    
    setActionLoading(fileName);
    try {
      const result = await unindexFileByFilename(fileName);
      if (result.success) {
        alert(`✅ ${result.message} (${result.deletedCount || 0} chunks removed)`);
        loadFiles(); // Refresh the list
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error unindexing file:', error);
      alert(`❌ Error unindexing file: ${error}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle file re-indexing
  const handleReindexFile = async (fileId: string, fileName: string) => {
    try {
      const result = await reindexFile(fileId);
      if (result.success) {
        alert(`File "${fileName}" re-indexed successfully`);
        // Optionally refresh the file list
        loadFiles();
      } else {
        alert(`Failed to re-index file: ${result.message}`);
      }
    } catch (error) {
      console.error('Error re-indexing file:', error);
      alert('Failed to re-index file');
    }
  };

  // Handle file download
  const handleDownloadFile = async (fileName: string) => {
    try {
      // Get Supabase signed URL (for private buckets)
      const supabase = (await import('../../services/supabase')).getSupabaseClient();
      const filePath = `files/${fileName}`;
      
      // Create a signed URL that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('knowledge-base')
        .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour
      
      if (error) {
        console.error('Error creating signed URL:', error);
        alert(`Failed to get download URL: ${error.message}`);
        return;
      }
      
      if (data?.signedUrl) {
        // Open in new tab or download
        window.open(data.signedUrl, '_blank');
      } else {
        alert('Failed to get download URL');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    fileArray.forEach(file => {
      const validation = validateFileExtended(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    // Show validation errors
    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    // Upload valid files
    if (validFiles.length > 0) {
      uploadFiles(validFiles);
    }
  }, [storageType]);

  // Upload files to Supabase Storage
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadResults([]);

    try {
      const results = await uploadFilesToSupabase(files);
      setUploadResults(results);

      // Show success/error messages
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const failedResults = results.filter(r => !r.success);

      if (successCount > 0) {
        showToast(`✅ ${successCount} file(s) uploaded successfully`, 'success');
      }
      if (failCount > 0) {
        const errorMessages = failedResults.map(r => r.message).join(', ');
        showToast(`❌ ${failCount} file(s) failed: ${errorMessages}`, 'error');
      }
      
      // Immediately refresh the file list to show new files
      await loadFiles();
      
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Filter and sort files
  const filteredAndSortedFiles = uploadedFiles
    .filter(file => 
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="file-library">
      <div className="fl-header">
        <div className="fl-header-content">
          <div>
            <h2 className="fl-title">{t('knowledge.fileLibrary')}</h2>
            <p className="fl-description">{t('knowledge.fileLibraryDescription')}</p>
          </div>
          <div className="webhook-mode-toggle">
            <button
              onClick={toggleDevMode}
              className={`mode-toggle-btn ${isDevMode ? 'dev-mode' : 'prod-mode'}`}
            >
              {isDevMode ? '🔧 DEV Mode' : '🚀 PROD Mode'}
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="fl-upload-section">
        <div
          className={`fl-upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
          <div className="upload-content">
            {isUploading ? (
              <div className="upload-loading">
                <div className="spinner"></div>
                <p>{t('knowledge.uploadingFiles')}</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">↑</div>
                <p className="upload-text">{t('knowledge.dragFilesHere')}</p>
                <p className="upload-formats">{t('knowledge.supportedFormats')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File List Controls */}
      <div className="fl-controls">
        <div className="fl-search">
          <input
            type="text"
            placeholder={t('knowledge.searchByFilename')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
          <span className="refresh-icon">↻</span>
          {isLoading ? t('knowledge.loading') || 'Loading...' : t('knowledge.refresh')}
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

      {/* File List Table */}
      <div className="fl-table-container">
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
            Loading files from n8n...
          </div>
        ) : (
          <table className="fl-table" style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '25%' }}>{t('knowledge.fileName')}</th>
                <th style={{ width: '10%' }}>{t('knowledge.size')}</th>
                <th style={{ width: '18%' }}>{t('knowledge.lastModified')}</th>
                <th style={{ width: '15%' }}>{t('knowledge.contentType')}</th>
                <th style={{ width: '12%', textAlign: 'center' }}>{t('knowledge.syncStatus')}</th>
                <th style={{ width: '20%' }}>{t('knowledge.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Failed to load files' : 'No files found. Upload some files to get started.'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedFiles.map(file => (
                  <tr key={file.id}>
                    <td className="file-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                      {file.name}
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                    <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.type}>{file.type}</td>
                    <td className="sync-status-cell">
                      <span 
                        style={{
                          color: file.syncStatus === 'synced' ? '#10b981' : '#f59e0b',
                          fontWeight: file.syncStatus === 'pending' ? 'bold' : 'normal',
                          fontSize: '14px'
                        }}
                      >
                        {file.syncStatus === 'synced' ? '✓ Synced' : '⚠ Not Indexed'}
                      </span>
                    </td>
                    <td>
                      <div className="file-actions">
                        {file.syncStatus === 'pending' && (
                          <button 
                            className="icon-action-btn index-btn" 
                            title="Index this file"
                            onClick={() => handleIndexFile(file.name)}
                            disabled={actionLoading === file.name}
                            style={{
                              backgroundColor: 'var(--admin-primary, #3b82f6)',
                              color: 'white',
                              borderColor: 'var(--admin-primary, #3b82f6)'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                          </button>
                        )}
                        <button 
                          className="icon-action-btn" 
                          title={t('knowledge.download')}
                          onClick={() => handleDownloadFile(file.name)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                          </svg>
                        </button>
                        <button 
                          className="icon-action-btn delete-icon-btn" 
                          title={t('knowledge.delete')}
                          onClick={() => handleDeleteFile(file.id, file.name)}
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
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default FileLibrary;
