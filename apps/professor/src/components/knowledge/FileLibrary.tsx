import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { 
  uploadFilesToRAG, 
  validateFile, 
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
        <button className="refresh-btn">
          <span className="refresh-icon">↻</span>
          {t('knowledge.refresh')}
        </button>
      </div>

      {/* File List Table */}
      <div className="fl-table-container">
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
            {filteredAndSortedFiles.map(file => (
              <tr key={file.id}>
                <td className="file-name">
                  <span className="file-icon">{getFileIcon(file.type)}</span>
                  {file.name}
                </td>
                <td>{formatFileSize(file.size)}</td>
                <td>{new Date(file.uploadedAt).toLocaleString()}</td>
                <td>{file.type}</td>
                <td>
                  <span className="sync-status synced">✓</span>
                </td>
                <td>
                  <div className="file-actions">
                    <button className="action-btn download-btn" title={t('knowledge.download')}>
                      ↓
                    </button>
                    <button className="action-btn delete-btn" title={t('knowledge.delete')}>
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FileLibrary;
