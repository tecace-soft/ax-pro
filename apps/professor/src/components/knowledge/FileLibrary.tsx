import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { 
  uploadFilesToRAG, 
  fetchFilesFromRAG,
  deleteFileFromRAG,
  reindexFile,
  uploadFilesToSupabase,
  fetchFilesFromSupabase,
  deleteFileFromSupabase,
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
  const [storageType, setStorageType] = useState<'supabase' | 'local'>('supabase');

  // Fetch files on component mount
  useEffect(() => {
    loadFiles();
  }, [storageType]);

  // Load files from selected storage
  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (storageType === 'supabase') {
        // Load from Supabase Storage
        const response = await fetchFilesFromSupabase();
        if (response.success) {
          setUploadedFiles(response.files);
          console.log(`Loaded ${response.files.length} files from Supabase`);
        } else {
          setError(response.message || 'Failed to load files from Supabase');
          console.error('Failed to load files:', response.message);
        }
      } else {
        // Load from n8n (local server)
        const response = await fetchFilesFromRAG();
        if (response.success) {
          setUploadedFiles(response.files);
          console.log(`Loaded ${response.files.length} files from n8n`);
        } else {
          if (response.message?.includes('404') || response.message?.includes('Not Found')) {
            setError('n8n file management endpoints not configured yet. Please set up the following webhooks in n8n: list-files, delete-file, reindex-file');
          } else {
            setError(response.message || 'Failed to load files');
          }
          console.error('Failed to load files:', response.message);
        }
      }
    } catch (err) {
      const errorMessage = storageType === 'supabase' 
        ? 'Failed to connect to Supabase Storage. Please check your configuration.'
        : 'Failed to connect to n8n service. Please ensure n8n webhooks are configured.';
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
      const result = storageType === 'supabase'
        ? await deleteFileFromSupabase(fileName)
        : await deleteFileFromRAG(fileId);
        
      if (result.success) {
        // Remove file from local state
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
        console.log(`File ${fileName} deleted successfully`);
      } else {
        alert(`Failed to delete file: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file');
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

  // Upload files to selected storage
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadResults([]);

    try {
      const results = storageType === 'supabase'
        ? await uploadFilesToSupabase(files)
        : await uploadFilesToRAG(files);
        
      setUploadResults(results);

      // Add successful uploads to file list
      const newFiles: RAGFile[] = results
        .filter(result => result.success)
        .map((result, index) => ({
          id: `file-${Date.now()}-${index}`,
          name: result.fileName || files[index].name,
          size: files[index].size,
          type: files[index].type,
          uploadedAt: new Date().toISOString(),
          status: 'ready' as const,
        }));

      setUploadedFiles(prev => [...newFiles, ...prev]);
      
      // Refresh the file list to get the actual uploaded files
      setTimeout(() => {
        loadFiles();
      }, 1000);
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
        <h2 className="fl-title">{t('knowledge.fileLibrary')}</h2>
        <p className="fl-description">{t('knowledge.fileLibraryDescription')}</p>
        
        {/* Storage Type Selector */}
        <div className="storage-selector" style={{ marginTop: '16px', marginBottom: '16px' }}>
          <label style={{ 
            fontSize: '14px', 
            fontWeight: '500', 
            marginRight: '12px',
            color: 'var(--text)'
          }}>
            Storage:
          </label>
          <button
            onClick={() => setStorageType('supabase')}
            className={`storage-btn ${storageType === 'supabase' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              marginRight: '8px',
              borderRadius: '6px',
              border: storageType === 'supabase' ? '2px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: storageType === 'supabase' ? 'var(--primary)' : 'var(--card)',
              color: storageType === 'supabase' ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            ☁️ Supabase Storage
          </button>
          <button
            onClick={() => setStorageType('local')}
            className={`storage-btn ${storageType === 'local' ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: storageType === 'local' ? '2px solid var(--primary)' : '1px solid var(--border)',
              backgroundColor: storageType === 'local' ? 'var(--primary)' : 'var(--card)',
              color: storageType === 'local' ? 'white' : 'var(--text)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            💾 Local Server (n8n)
          </button>
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
          <table className="fl-table">
            <thead>
              <tr>
                <th>{t('knowledge.fileName')}</th>
                <th>{t('knowledge.size')}</th>
                <th>{t('knowledge.lastModified')}</th>
                <th>{t('knowledge.contentType')}</th>
                <th>{t('knowledge.syncStatus')}</th>
                <th>{t('knowledge.actions')}</th>
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
                    <td className="file-name">
                      <span className="file-icon">{getFileIcon(file.type)}</span>
                      {file.name}
                    </td>
                    <td>{formatFileSize(file.size)}</td>
                    <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                    <td>{file.type}</td>
                    <td>
                      <span className={`sync-status ${file.syncStatus || 'synced'}`}>
                        {file.syncStatus === 'synced' ? '✓' : 
                         file.syncStatus === 'pending' ? '⏳' : 
                         file.syncStatus === 'error' ? '❌' : '✓'}
                      </span>
                    </td>
                    <td>
                      <div className="file-actions">
                        <button 
                          className="action-btn reindex-btn" 
                          title="Re-index file"
                          onClick={() => handleReindexFile(file.id, file.name)}
                        >
                          🔄
                        </button>
                        <button 
                          className="action-btn download-btn" 
                          title={t('knowledge.download')}
                          onClick={() => file.url && window.open(file.url, '_blank')}
                          disabled={!file.url}
                        >
                          ↓
                        </button>
                        <button 
                          className="action-btn delete-btn" 
                          title={t('knowledge.delete')}
                          onClick={() => handleDeleteFile(file.id, file.name)}
                        >
                          🗑️
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
    </div>
  );
};

export default FileLibrary;
