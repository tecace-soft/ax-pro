import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import '../../styles/rag-management.css';
import { 
  uploadFilesToRAG, 
  validateFile, 
  formatFileSize, 
  getFileIcon,
  reindexFile,
  deleteFileFromRAG,
  FileUploadResult,
  RAGFile 
} from '../../services/ragManagement';

interface RAGManagementProps {
  className?: string;
}

const RAGManagement: React.FC<RAGManagementProps> = ({ className = '' }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<FileUploadResult[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<RAGFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    fileArray.forEach(file => {
      const validation = validateFile(file);
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
  }, []);

  // Upload files to RAG system
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadResults([]);

    try {
      const results = await uploadFilesToRAG(files);
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

  // Clear upload results
  const clearResults = () => {
    setUploadResults([]);
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Re-index file
  const handleReindexFile = async (fileId: string) => {
    try {
      const result = await reindexFile(fileId);
      if (result.success) {
        // Update file status to processing
        setUploadedFiles(prev => prev.map(file => 
          file.id === fileId 
            ? { ...file, status: 'processing' as const }
            : file
        ));
        
        // Simulate processing completion
        setTimeout(() => {
          setUploadedFiles(prev => prev.map(file => 
            file.id === fileId 
              ? { ...file, status: 'ready' as const }
              : file
          ));
        }, 2000);
      }
    } catch (error) {
      console.error('Re-index error:', error);
    }
  };

  // Delete file from RAG system
  const handleDeleteFile = async (fileId: string) => {
    if (!window.confirm(t('admin.confirmDeleteFile'))) {
      return;
    }

    try {
      const result = await deleteFileFromRAG(fileId);
      if (result.success) {
        removeFile(fileId);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert(t('admin.deleteError'));
    }
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

  // Handle sort change
  const handleSortChange = (newSortBy: 'name' | 'date' | 'size') => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  return (
    <div className={`rag-management ${className}`}>
      <div className="rag-header">
        <h2 className="rag-title">{t('admin.ragManagement')}</h2>
        <p className="rag-description">
          {t('admin.ragDescription')}
        </p>
      </div>

      {/* File Upload Area */}
      <div className="rag-upload-section">
        <div
          className={`rag-upload-area ${dragActive ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
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
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.md,.json,.html"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
            disabled={isUploading}
          />
          
          <div className="upload-content">
            {isUploading ? (
              <div className="upload-loading">
                <div className="spinner"></div>
                <p>{t('admin.uploadingFiles')}</p>
              </div>
            ) : (
              <div className="upload-prompt">
                <div className="upload-icon">📁</div>
                <p className="upload-text">
                  {dragActive ? t('admin.dropFilesHere') : t('admin.clickToUpload')}
                </p>
                <p className="upload-hint">
                  {t('admin.supportedFormats')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {uploadResults.length > 0 && (
        <div className="rag-results">
          <div className="results-header">
            <h3>{t('admin.uploadResults')}</h3>
            <button 
              className="clear-results-btn"
              onClick={clearResults}
            >
              {t('admin.clear')}
            </button>
          </div>
          <div className="results-list">
            {uploadResults.map((result, index) => (
              <div 
                key={index} 
                className={`result-item ${result.success ? 'success' : 'error'}`}
              >
                <div className="result-icon">
                  {result.success ? '✅' : '❌'}
                </div>
                <div className="result-content">
                  <p className="result-file">{result.fileName}</p>
                  <p className="result-message">{result.message}</p>
                  {result.error && (
                    <p className="result-error">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="rag-files">
          <div className="files-header">
            <h3>{t('admin.uploadedFiles')} ({filteredAndSortedFiles.length})</h3>
            <div className="files-controls">
              <div className="search-box">
                <input
                  type="text"
                  placeholder={t('admin.searchFiles')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="sort-controls">
                <button
                  className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                  onClick={() => handleSortChange('name')}
                >
                  {t('admin.name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  className={`sort-btn ${sortBy === 'date' ? 'active' : ''}`}
                  onClick={() => handleSortChange('date')}
                >
                  {t('admin.date')} {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  className={`sort-btn ${sortBy === 'size' ? 'active' : ''}`}
                  onClick={() => handleSortChange('size')}
                >
                  {t('admin.size')} {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
          </div>
          <div className="files-list">
            {filteredAndSortedFiles.map(file => (
              <div key={file.id} className="file-item">
                <div className="file-icon">
                  {getFileIcon(file.type)}
                </div>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <p className="file-details">
                    {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="file-status">
                  <span className={`status-badge ${file.status}`}>
                    {t(`admin.status.${file.status}`)}
                  </span>
                </div>
                <div className="file-actions">
                  <button 
                    className="action-btn reindex-btn"
                    onClick={() => handleReindexFile(file.id)}
                    title={t('admin.reindexFile')}
                    disabled={file.status === 'processing'}
                  >
                    🔄
                  </button>
                  <button 
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteFile(file.id)}
                    title={t('admin.deleteFile')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rag-instructions">
        <h3>{t('admin.instructions')}</h3>
        <ul>
          <li>{t('admin.instruction1')}</li>
          <li>{t('admin.instruction2')}</li>
          <li>{t('admin.instruction3')}</li>
          <li>{t('admin.instruction4')}</li>
        </ul>
      </div>
    </div>
  );
};

export default RAGManagement;
