import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import '../../styles/rag-management.css';
import { 
  uploadFilesToRAG, 
  validateFile, 
  formatFileSize, 
  getFileIcon,
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
          <h3>{t('admin.uploadedFiles')}</h3>
          <div className="files-list">
            {uploadedFiles.map(file => (
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
                <button 
                  className="remove-file-btn"
                  onClick={() => removeFile(file.id)}
                  title={t('admin.removeFile')}
                >
                  🗑️
                </button>
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
