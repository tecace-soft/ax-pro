import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { ToastContainer } from '../ui/Toast';
import { IconSettings, IconX, IconDatabase, IconSearch } from '../../ui/icons';
import { getSession } from '../../services/auth';
import { defaultSupabase } from '../../services/groupService';
import { updateGroupChunkingOptions, updateGroupTopK } from '../../services/groupService';
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
  const { theme } = useTheme();
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
  // Load pollingFiles and request times from localStorage on mount
  const getStoredPollingFiles = (): Set<string> => {
    try {
      const { getGroupIdFromUrl } = require('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      if (!groupId) return new Set();
      
      const stored = localStorage.getItem(`pollingFiles_${groupId}`);
      if (stored) {
        const files = JSON.parse(stored) as string[];
        return new Set(files);
      }
    } catch (error) {
      console.warn('Failed to load pollingFiles from localStorage:', error);
    }
    return new Set();
  };

  const getStoredRequestTimes = (): Map<string, string> => {
    try {
      const { getGroupIdFromUrl } = require('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      if (!groupId) return new Map();
      
      const stored = localStorage.getItem(`indexRequestTimes_${groupId}`);
      if (stored) {
        const times = JSON.parse(stored) as Record<string, string>;
        return new Map(Object.entries(times));
      }
    } catch (error) {
      console.warn('Failed to load indexRequestTimes from localStorage:', error);
    }
    return new Map();
  };

  const [pollingFiles, setPollingFiles] = useState<Set<string>>(getStoredPollingFiles());
  const [indexRequestTimes, setIndexRequestTimes] = useState<Map<string, string>>(getStoredRequestTimes());
  
  // Save pollingFiles to localStorage whenever it changes
  useEffect(() => {
    try {
      const { getGroupIdFromUrl } = require('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      if (!groupId) return;
      
      const filesArray = Array.from(pollingFiles);
      localStorage.setItem(`pollingFiles_${groupId}`, JSON.stringify(filesArray));
    } catch (error) {
      console.warn('Failed to save pollingFiles to localStorage:', error);
    }
  }, [pollingFiles]);

  // Save indexRequestTimes to localStorage whenever it changes
  useEffect(() => {
    try {
      const { getGroupIdFromUrl } = require('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      if (!groupId) return;
      
      const timesObj = Object.fromEntries(indexRequestTimes);
      localStorage.setItem(`indexRequestTimes_${groupId}`, JSON.stringify(timesObj));
    } catch (error) {
      console.warn('Failed to save indexRequestTimes to localStorage:', error);
    }
  }, [indexRequestTimes]);
  const [showIndexingModal, setShowIndexingModal] = useState(false);
  const [showRetrievalModal, setShowRetrievalModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set()); // file.id를 저장
  const [chunkSize, setChunkSize] = useState<string>('');
  const [chunkOverlap, setChunkOverlap] = useState<string>('');
  const [topK, setTopK] = useState<string>('');
  const [isLoadingChunking, setIsLoadingChunking] = useState(false);
  const [isSavingChunking, setIsSavingChunking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true); // Auto-refresh enabled by default
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Docling Parser Options
  const [doclingOptions, setDoclingOptions] = useState<{
    // OCR Options
    do_ocr_enabled: boolean;
    do_ocr: boolean;
    force_ocr_enabled: boolean;
    force_ocr: boolean;
    ocr_engine_enabled: boolean;
    ocr_engine: string;
    ocr_lang_enabled: boolean;
    ocr_lang: string;
    // PDF Options
    pdf_backend_enabled: boolean;
    pdf_backend: string;
    pipeline_enabled: boolean;
    pipeline: string;
    // Table Options
    table_mode_enabled: boolean;
    table_mode: string;
    table_cell_matching_enabled: boolean;
    table_cell_matching: boolean;
    do_table_structure_enabled: boolean;
    do_table_structure: boolean;
    // Image Options
    include_images_enabled: boolean;
    include_images: boolean;
    images_scale_enabled: boolean;
    images_scale: string;
    image_export_mode_enabled: boolean;
    image_export_mode: string;
    // Page Options
    page_range_enabled: boolean;
    page_range_start: string;
    page_range_end: string;
    // Timeout Options
    document_timeout_enabled: boolean;
    document_timeout: string;
    abort_on_error_enabled: boolean;
    abort_on_error: boolean;
    // Markdown Options
    md_page_break_placeholder_enabled: boolean;
    md_page_break_placeholder: string;
    // Advanced Options
    do_code_enrichment_enabled: boolean;
    do_code_enrichment: boolean;
    do_formula_enrichment_enabled: boolean;
    do_formula_enrichment: boolean;
    do_picture_classification_enabled: boolean;
    do_picture_classification: boolean;
    do_picture_description_enabled: boolean;
    do_picture_description: boolean;
  }>({
    // Defaults (all disabled) - values match backend defaults from n8n
    do_ocr_enabled: false,
    do_ocr: false, // Backend default: false
    force_ocr_enabled: false,
    force_ocr: false,
    ocr_engine_enabled: false,
    ocr_engine: 'auto', // Backend default: 'auto'
    ocr_lang_enabled: false,
    ocr_lang: 'en', // Backend default: ['en']
    pdf_backend_enabled: false,
    pdf_backend: 'dlparse_v4', // Not in backend defaults, but common
    pipeline_enabled: false,
    pipeline: 'standard', // Backend doesn't set this (commented out)
    table_mode_enabled: false,
    table_mode: 'fast', // Backend default: 'fast'
    table_cell_matching_enabled: false,
    table_cell_matching: false, // Backend default: false
    do_table_structure_enabled: false,
    do_table_structure: false, // Backend default: false
    include_images_enabled: false,
    include_images: false, // Backend default: false
    images_scale_enabled: false,
    images_scale: '1', // Backend default: 1
    image_export_mode_enabled: false,
    image_export_mode: 'embedded', // Not in backend defaults
    page_range_enabled: false,
    page_range_start: '1', // Backend default: [1, 999999999]
    page_range_end: '999999999',
    document_timeout_enabled: false,
    document_timeout: '600', // Backend default: 600
    abort_on_error_enabled: false,
    abort_on_error: false, // Backend default: false
    md_page_break_placeholder_enabled: false,
    md_page_break_placeholder: '<!-- page-break -->', // Backend default: '<!-- page-break -->'
    do_code_enrichment_enabled: false,
    do_code_enrichment: false, // Backend default: false
    do_formula_enrichment_enabled: false,
    do_formula_enrichment: false, // Backend default: false
    do_picture_classification_enabled: false,
    do_picture_classification: false, // Backend default: false
    do_picture_description_enabled: false,
    do_picture_description: false, // Backend default: false
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

  // Fetch files on component mount and restore index_started status
  useEffect(() => {
    const loadAndRestore = async () => {
      await loadFiles();
      // After loading files, restore index_started status for files in pollingFiles
      // Also check if any files in pollingFiles are already synced (completed)
      if (pollingFiles.size > 0) {
        const filesToRemove: string[] = [];
        setUploadedFiles(prev => prev.map(file => {
          if (pollingFiles.has(file.name)) {
            // If file is already synced, remove from pollingFiles
            if (file.syncStatus === 'synced') {
              filesToRemove.push(file.name);
              return file;
            }
            // Otherwise, restore index_started status
            if (file.syncStatus === 'pending') {
              const requestTime = indexRequestTimes.get(file.name);
              return { 
                ...file, 
                syncStatus: 'index_started' as const,
                indexRequestedAt: requestTime
              };
            }
          }
          return file;
        }));
        
        // Remove completed files from pollingFiles
        if (filesToRemove.length > 0) {
          setPollingFiles(prev => {
            const newSet = new Set(prev);
            filesToRemove.forEach(fileName => newSet.delete(fileName));
            return newSet;
          });
        }
      }
    };
    loadAndRestore();
  }, [storageType]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (autoRefresh) {
      // Clear any existing interval
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      
      // Set up new interval
      autoRefreshIntervalRef.current = setInterval(() => {
        console.log('🔄 Auto-refreshing file list...');
        loadFiles();
      }, 15000); // 15 seconds
      
      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current);
        }
      };
    } else {
      // Clear interval if auto-refresh is disabled
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
        autoRefreshIntervalRef.current = null;
      }
    }
  }, [autoRefresh]);

  // Load options when modals open
  useEffect(() => {
    if (showIndexingModal || showRetrievalModal) {
      loadChunkingOptions();
    }
  }, [showIndexingModal, showRetrievalModal]);

  // Load chunking options from current group
  const loadChunkingOptions = async () => {
    setIsLoadingChunking(true);
    try {
      // Get groupId from URL (consistent with other parts of the app)
      const { getGroupIdFromUrl } = await import('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      
      if (!groupId) {
        // Don't close modal, just show warning and use defaults
        console.warn('No group selected, using default values');
        // Reset to defaults
        setChunkSize('');
        setChunkOverlap('');
        setTopK('');
        // doclingOptions already has defaults
        return;
      }

      const { data: groupData, error: groupError } = await defaultSupabase
        .from('group')
        .select('chunk_size, chunk_overlap, top_k, docling_options')
        .eq('group_id', groupId)
        .single();

      if (groupError) {
        // If docling_options field doesn't exist, try without it
        if (groupError.message?.includes('docling_options') || groupError.code === 'PGRST116') {
          console.warn('docling_options field not found, loading without it:', groupError);
          const { data: fallbackData, error: fallbackError } = await defaultSupabase
            .from('group')
            .select('chunk_size, chunk_overlap, top_k')
            .eq('group_id', groupId)
            .single();
          
          if (fallbackError) {
            console.error('Error loading chunking options:', fallbackError);
            showToast('Failed to load chunking options', 'error');
            return;
          }
          
          if (fallbackData) {
            setChunkSize(fallbackData.chunk_size !== null && fallbackData.chunk_size !== undefined ? String(fallbackData.chunk_size) : '');
            setChunkOverlap(fallbackData.chunk_overlap !== null && fallbackData.chunk_overlap !== undefined ? String(fallbackData.chunk_overlap) : '');
            setTopK(fallbackData.top_k !== null && fallbackData.top_k !== undefined ? String(fallbackData.top_k) : '');
            // docling_options will use defaults
          }
          return;
        }
        
        console.error('Error loading chunking options:', groupError);
        showToast('Failed to load chunking options', 'error');
        return;
      }

      if (groupData) {
        setChunkSize(groupData.chunk_size !== null && groupData.chunk_size !== undefined ? String(groupData.chunk_size) : '');
        setChunkOverlap(groupData.chunk_overlap !== null && groupData.chunk_overlap !== undefined ? String(groupData.chunk_overlap) : '');
        setTopK(groupData.top_k !== null && groupData.top_k !== undefined ? String(groupData.top_k) : '');
        
        // Load Docling options if available
        if (groupData.docling_options) {
          try {
            const savedOptions = typeof groupData.docling_options === 'string' 
              ? JSON.parse(groupData.docling_options) 
              : groupData.docling_options;
            setDoclingOptions(prev => ({ ...prev, ...savedOptions }));
          } catch (e) {
            console.warn('Failed to parse docling_options:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error loading chunking options:', error);
      showToast('Failed to load chunking options', 'error');
    } finally {
      setIsLoadingChunking(false);
    }
  };

  // Save chunking options
  const handleSaveChunkingOptions = async () => {
    setIsSavingChunking(true);
    try {
      // Get groupId from URL (consistent with other parts of the app)
      const { getGroupIdFromUrl } = await import('../../utils/navigation');
      const groupId = getGroupIdFromUrl();
      
      if (!groupId) {
        showToast('No group selected. Please select a group first.', 'error');
        setIsSavingChunking(false);
        return;
      }

      // Parse values - allow null/empty
      const parsedChunkSize = chunkSize.trim() === '' ? null : parseInt(chunkSize.trim(), 10);
      const parsedChunkOverlap = chunkOverlap.trim() === '' ? null : parseInt(chunkOverlap.trim(), 10);
      const parsedTopK = topK.trim() === '' ? null : parseInt(topK.trim(), 10);

      // Validate chunking options only if both values are provided
      if (parsedChunkSize !== null && parsedChunkOverlap !== null) {
        if (isNaN(parsedChunkSize) || isNaN(parsedChunkOverlap)) {
          showToast('Please enter valid numbers for chunking options', 'error');
          return;
        }

        if (parsedChunkSize <= 0) {
          showToast('Chunk size must be greater than 0', 'error');
          return;
        }

        if (parsedChunkOverlap < 0) {
          showToast('Chunk overlap must be 0 or greater', 'error');
          return;
        }

        if (parsedChunkOverlap >= parsedChunkSize) {
          showToast('Chunk overlap must be less than chunk size', 'error');
          return;
        }
      } else if (parsedChunkSize !== null || parsedChunkOverlap !== null) {
        // If only one chunking value is provided, show error
        showToast('Please provide both chunking values or leave both empty', 'error');
        return;
      }

      // Validate top_k if provided
      if (parsedTopK !== null) {
        if (isNaN(parsedTopK)) {
          showToast('Please enter a valid number for Top K', 'error');
          return;
        }

        if (parsedTopK <= 0) {
          showToast('Top K must be greater than 0', 'error');
          return;
        }
      }

      await updateGroupChunkingOptions(groupId, parsedChunkSize, parsedChunkOverlap);
      await updateGroupTopK(groupId, parsedTopK);
      
      // Save Docling options (only if field exists)
      try {
        const { error: doclingError } = await defaultSupabase
          .from('group')
          .update({ docling_options: doclingOptions })
          .eq('group_id', groupId);
        
        if (doclingError) {
          // If field doesn't exist, it's okay - we'll just skip saving docling_options
          if (doclingError.message?.includes('docling_options') || doclingError.code === 'PGRST116') {
            console.warn('docling_options field not found in database, skipping save. This is okay for now.');
          } else {
            console.warn('Failed to save Docling options:', doclingError);
          }
          // Don't fail the whole operation if docling_options save fails
        }
      } catch (e) {
        console.warn('Error saving Docling options (field may not exist):', e);
        // Continue anyway
      }
      
      showToast('Options saved successfully', 'success');
      setShowIndexingModal(false);
      setShowRetrievalModal(false);
    } catch (error: any) {
      console.error('Error saving chunking options:', error);
      showToast(error.message || 'Failed to save chunking options', 'error');
    } finally {
      setIsSavingChunking(false);
    }
  };

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
              
              // Update localStorage when polling stops
              try {
                const { getGroupIdFromUrl } = require('../../utils/navigation');
                const groupId = getGroupIdFromUrl();
                if (groupId) {
                  const filesArray = Array.from(newSet);
                  localStorage.setItem(`pollingFiles_${groupId}`, JSON.stringify(filesArray));
                }
              } catch (error) {
                console.warn('Failed to update pollingFiles in localStorage:', error);
              }
              
              return newSet;
            });
            
            // Update syncStatus when indexing completes
            if (status.status === 'completed') {
              // Remove from request times
              setIndexRequestTimes(prev => {
                const newMap = new Map(prev);
                newMap.delete(fileName);
                return newMap;
              });
              
              setUploadedFiles(prev => prev.map(file => 
                file.name === fileName 
                  ? { ...file, syncStatus: 'synced' as const }
                  : file
              ));
              // Refresh files to get updated status from database
              loadFiles();
            } else if (status.status === 'failed') {
              // Remove from request times
              setIndexRequestTimes(prev => {
                const newMap = new Map(prev);
                newMap.delete(fileName);
                return newMap;
              });
              
              // On failure, revert to pending - user can retry indexing
              // No need to show error - user can just reindex if needed
              setUploadedFiles(prev => prev.map(file => 
                file.name === fileName 
                  ? { ...file, syncStatus: 'pending' as const }
                  : file
              ));
              console.log(`⚠️ Indexing failed for ${fileName}, reverted to pending. User can retry.`);
            }
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
        // Preserve 'index_started' status for files that are currently being polled
        setUploadedFiles(prevFiles => {
          const newFiles = response.files.map(newFile => {
            // If this file is in pollingFiles, keep it as 'index_started'
            if (pollingFiles.has(newFile.name)) {
              const requestTime = indexRequestTimes.get(newFile.name);
              return { 
                ...newFile, 
                syncStatus: 'index_started' as const,
                indexRequestedAt: requestTime
              };
            }
            // Otherwise, check if we had it as 'index_started' before and it's still pending
            const prevFile = prevFiles.find(f => f.name === newFile.name);
            if (prevFile?.syncStatus === 'index_started' && newFile.syncStatus === 'pending') {
              const requestTime = indexRequestTimes.get(newFile.name) || prevFile.indexRequestedAt;
              return { 
                ...newFile, 
                syncStatus: 'index_started' as const,
                indexRequestedAt: requestTime
              };
            }
            return newFile;
          });
          return newFiles;
        });
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
    if (!confirm(t('knowledge.deleteConfirm', { fileName }))) {
      return;
    }

    try {
      const result = await deleteFileFromSupabase(fileName);
        
      if (result.success) {
        // Remove file from local state
        setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
        // Remove from selected files if selected
        setSelectedFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
        console.log(`✅ File ${fileName} deleted successfully`);
        showToast(t('knowledge.deleteSuccess', { fileName }), 'success');
      } else {
        showToast(t('knowledge.deleteFailed', { message: result.message }), 'error');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showToast(t('knowledge.deleteFailed', { message: 'Unknown error' }), 'error');
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) {
      showToast(t('knowledge.noFilesSelected'), 'warning');
      return;
    }

    const selectedFileNames = uploadedFiles
      .filter(file => selectedFiles.has(file.id))
      .map(file => file.name);

    const fileCount = selectedFiles.size;
    const fileList = selectedFileNames.slice(0, 5).join(', ');
    const moreFiles = fileCount > 5 ? ` and ${fileCount - 5} more file(s)` : '';
    const fullFileList = fileList + moreFiles;

    // Double confirmation for batch delete
    const confirmMessage = t('knowledge.batchDeleteConfirm', { count: fileCount, fileList: fullFileList });
    
    if (!confirm(confirmMessage)) {
      return;
    }

    // Second confirmation for safety
    if (!confirm(t('knowledge.batchDeleteFinalConfirm', { count: fileCount, fileList: fullFileList }))) {
      return;
    }

    setActionLoading('batch-delete');
    let successCount = 0;
    let failCount = 0;
    const failedFiles: string[] = [];

    try {
      // Delete files one by one
      for (const fileId of selectedFiles) {
        const file = uploadedFiles.find(f => f.id === fileId);
        if (!file) continue;

        try {
          const result = await deleteFileFromSupabase(file.name);
          if (result.success) {
            successCount++;
            // Remove from local state
            setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
          } else {
            failCount++;
            failedFiles.push(file.name);
          }
        } catch (error) {
          failCount++;
          failedFiles.push(file.name);
          console.error(`Error deleting ${file.name}:`, error);
        }
      }

      // Clear selection
      setSelectedFiles(new Set());

      // Show results
      if (successCount > 0) {
        showToast(t('knowledge.batchDeleteSuccess', { count: successCount }), 'success');
      }
      if (failCount > 0) {
        showToast(t('knowledge.batchDeleteFailed', { count: failCount, errors: failedFiles.join(', ') }), 'error');
      }

      // Refresh file list
      await loadFiles();
    } catch (error) {
      console.error('Error in batch delete:', error);
      showToast('Error during batch delete', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Toggle select all
  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length) {
      // Deselect all
      setSelectedFiles(new Set());
    } else {
      // Select all visible files
      setSelectedFiles(new Set(filteredAndSortedFiles.map(file => file.id)));
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
        // Save request time
        const requestTime = new Date().toISOString();
        setIndexRequestTimes(prev => {
          const newMap = new Map(prev);
          newMap.set(fileName, requestTime);
          return newMap;
        });
        
        // Update file syncStatus to 'index_started' immediately
        setUploadedFiles(prev => prev.map(file => 
          file.name === fileName 
            ? { ...file, syncStatus: 'index_started' as const, indexRequestedAt: requestTime }
            : file
        ));
        
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
    // Check for .txt files and show confirmation
    const txtFiles = files.filter(f => f.name.toLowerCase().endsWith('.txt'));
    if (txtFiles.length > 0) {
      const fileNames = txtFiles.map(f => f.name).join(', ');
      const confirmMessage = txtFiles.length === 1
        ? t('knowledge.txtConvertConfirmSingle', { fileName: fileNames })
        : t('knowledge.txtConvertConfirmMultiple', { count: txtFiles.length, fileNames });
      
      if (!confirm(confirmMessage)) {
        return; // User cancelled
      }
    }

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
        // Check if any files were renamed from .txt to .md
        const renamedFiles = results.filter(r => r.success && r.message?.includes('renamed from .txt to .md'));
        if (renamedFiles.length > 0) {
          showToast(t('knowledge.uploadSuccessWithConvert', { count: successCount, renamedCount: renamedFiles.length }), 'success');
        } else {
          showToast(t('knowledge.uploadSuccess', { count: successCount }), 'success');
        }
      }
      if (failCount > 0) {
        const errorMessages = failedResults.map(r => r.message).join(', ');
        showToast(t('knowledge.uploadFailed', { count: failCount, errors: errorMessages }), 'error');
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowIndexingModal(true)}
              className="settings-icon-btn"
              title="Indexing Options"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--admin-text-muted, #666)',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--admin-primary, #3b82f6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--admin-text-muted, #666)';
              }}
            >
              <IconDatabase size={20} />
            </button>
            <button
              onClick={() => setShowRetrievalModal(true)}
              className="settings-icon-btn"
              title="Retrieval Options"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--admin-text-muted, #666)',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--admin-primary, #3b82f6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--admin-text-muted, #666)';
              }}
            >
              <IconSearch size={20} />
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
            accept=".docx,.pptx,.html,.pdf,.asciidoc,.adoc,.md,.txt,.csv,.xlsx,.xml,.json,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.webp,.vtt"
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selectedFiles.size > 0 && (
            <button 
              className="refresh-btn" 
              onClick={handleBatchDelete}
              disabled={isLoading || actionLoading === 'batch-delete'}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none'
              }}
            >
              {actionLoading === 'batch-delete' ? 'Deleting...' : `Delete ${selectedFiles.size} file(s)`}
            </button>
          )}
          <button className="refresh-btn" onClick={handleRefresh} disabled={isLoading}>
            <span className="refresh-icon">↻</span>
            {isLoading ? t('knowledge.loading') || 'Loading...' : t('knowledge.refresh')}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="refresh-btn"
            style={{
              backgroundColor: autoRefresh ? '#10b981' : 'var(--bg-secondary, #2a2a2a)',
              color: autoRefresh ? '#ffffff' : 'var(--text-secondary, #9ca3af)',
              border: `1px solid ${autoRefresh ? '#10b981' : 'var(--border, #404040)'}`,
              padding: '6px 12px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: autoRefresh ? '600' : '400',
              opacity: autoRefresh ? 1 : 0.8
            }}
            onMouseEnter={(e) => {
              if (!autoRefresh) {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary, #333)';
                e.currentTarget.style.color = 'var(--text, #e5e7eb)';
                e.currentTarget.style.borderColor = 'var(--border, #555)';
              }
            }}
            onMouseLeave={(e) => {
              if (!autoRefresh) {
                e.currentTarget.style.backgroundColor = 'var(--bg-secondary, #2a2a2a)';
                e.currentTarget.style.color = 'var(--text-secondary, #9ca3af)';
                e.currentTarget.style.borderColor = 'var(--border, #404040)';
              }
            }}
            title={autoRefresh ? 'Auto-refresh enabled (15s)' : 'Auto-refresh disabled'}
          >
            <span style={{ fontSize: '14px' }}>{autoRefresh ? '⏱' : '⏸'}</span>
            <span>{autoRefresh ? 'Auto' : 'Manual'}</span>
          </button>
        </div>
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
          <table className="fl-table" style={{ width: '100%', minWidth: '900px', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center', padding: '8px' }}>
                  <input
                    type="checkbox"
                    checked={filteredAndSortedFiles.length > 0 && selectedFiles.size === filteredAndSortedFiles.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ width: '30%', minWidth: '200px' }}>{t('knowledge.fileName')}</th>
                <th style={{ width: '10%', minWidth: '80px' }}>{t('knowledge.size')}</th>
                <th style={{ width: '15%', minWidth: '150px' }}>{t('knowledge.lastModified')}</th>
                <th style={{ width: '15%', minWidth: '120px' }}>{t('knowledge.contentType')}</th>
                <th style={{ width: '10%', minWidth: '100px', textAlign: 'center' }}>{t('knowledge.syncStatus')}</th>
                <th style={{ width: '20%', minWidth: '150px', textAlign: 'right', paddingRight: '16px' }}>{t('knowledge.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedFiles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    {error ? 'Failed to load files' : 'No files found. Upload some files to get started.'}
                  </td>
                </tr>
              ) : (
                filteredAndSortedFiles.map(file => (
                  <tr key={file.id} style={{ backgroundColor: selectedFiles.has(file.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                    <td style={{ textAlign: 'center', padding: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td className="file-name" style={{ wordBreak: 'break-word' }}>
                      {file.name}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatFileSize(file.size)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(file.uploadedAt).toLocaleString()}</td>
                    <td style={{ wordBreak: 'break-word' }}>{file.type}</td>
                    <td className="sync-status-cell" style={{ whiteSpace: 'nowrap' }}>
                      <span 
                        style={{
                          color: file.syncStatus === 'synced' ? '#10b981' 
                            : file.syncStatus === 'index_started' ? '#3b82f6' 
                            : '#f59e0b',
                          fontWeight: file.syncStatus === 'pending' || file.syncStatus === 'index_started' ? 'bold' : 'normal',
                          fontSize: '14px'
                        }}
                      >
                        {file.syncStatus === 'synced' ? '✓ Synced' 
                          : file.syncStatus === 'index_started' ? (() => {
                            const requestTime = indexRequestTimes.get(file.name) || file.indexRequestedAt;
                            const formattedTime = requestTime 
                              ? new Date(requestTime).toLocaleString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric',
                                  hour: 'numeric', 
                                  minute: '2-digit',
                                  hour12: true 
                                })
                              : '';
                            return `⏳ Index Started${formattedTime ? ` (Request at ${formattedTime})` : ''}`;
                          })()
                          : '⚠ Not Indexed'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                      <div className="file-actions" style={{ justifyContent: 'flex-end' }}>
                        {(file.syncStatus === 'pending' || file.syncStatus === undefined) && (
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
      
      {/* Chunking Options Modal */}
      {/* Indexing Options Modal */}
      {showIndexingModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Don't close if clicking inside the modal
            if (e.target !== e.currentTarget) {
              return;
            }
            // Don't close if user is selecting text
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
              return;
            }
            setShowIndexingModal(false);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-2 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseUp={(e) => {
              // Prevent backdrop click when releasing mouse after text selection
              e.stopPropagation();
            }}
            style={{
              backgroundColor: 'var(--card, #2f2f2f)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                Indexing Options
              </h3>
              <button
                onClick={() => setShowIndexingModal(false)}
                className="rounded-full p-2 transition-colors"
                style={{ 
                  color: 'var(--admin-text-muted)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text, #111827)';
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-secondary, rgba(0, 0, 0, 0.05))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-muted, #6b7280)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <IconX size={20} />
              </button>
            </div>
            
            {isLoadingChunking ? (
              <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
                Loading chunking options...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
                    Indexing Options
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label 
                        htmlFor="chunk-size" 
                        className="block text-xs font-medium mb-1"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        Chunk Size
                      </label>
                      <input
                        id="chunk-size"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={chunkSize}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string or numbers only
                          if (value === '' || /^\d+$/.test(value)) {
                            setChunkSize(value);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: 'var(--admin-bg)',
                          borderColor: 'var(--admin-border)',
                          color: 'var(--admin-text)'
                        }}
                      />
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                        Characters per chunk (empty to disable)
                      </p>
                    </div>

                    <div>
                      <label 
                        htmlFor="chunk-overlap" 
                        className="block text-xs font-medium mb-1"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        Chunk Overlap
                      </label>
                      <input
                        id="chunk-overlap"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={chunkOverlap}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string or numbers only
                          if (value === '' || /^\d+$/.test(value)) {
                            setChunkOverlap(value);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: 'var(--admin-bg)',
                          borderColor: 'var(--admin-border)',
                          color: 'var(--admin-text)'
                        }}
                      />
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                        Overlapping characters (empty to disable)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Docling Parser Options Section */}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--admin-border)' }}>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
                    Docling Parser Options
                  </h4>
                  <p className="text-xs mb-3" style={{ color: 'var(--admin-text-muted)' }}>
                    Configure Docling document parser options. Only enabled options will override defaults. 
                    Default values are shown when options are disabled.
                  </p>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {/* OCR Options */}
                    <div className="space-y-2 pb-2 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                      <h5 className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>OCR Options</h5>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Enable OCR</label>
                          {!doclingOptions.do_ocr_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: do_ocr=false, ocr_engine='auto', ocr_lang=['en']
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.do_ocr_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, do_ocr_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.do_ocr_enabled && (
                        <div className="ml-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Do OCR</span>
                            <input
                              type="checkbox"
                              checked={doclingOptions.do_ocr}
                              onChange={(e) => setDoclingOptions(prev => ({ ...prev, do_ocr: e.target.checked }))}
                              className="w-4 h-4"
                            />
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: 'var(--admin-text)' }}>OCR Engine</label>
                            <select
                              value={doclingOptions.ocr_engine}
                              onChange={(e) => setDoclingOptions(prev => ({ ...prev, ocr_engine: e.target.value }))}
                              className="w-full px-2 py-1 text-xs border rounded"
                              style={{
                                backgroundColor: 'var(--admin-bg)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)'
                              }}
                            >
                              <option value="auto">auto</option>
                              <option value="easyocr">easyocr</option>
                              <option value="ocrmac">ocrmac</option>
                              <option value="rapidocr">rapidocr</option>
                              <option value="tesserocr">tesserocr</option>
                              <option value="tesseract">tesseract</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs block mb-1" style={{ color: 'var(--admin-text)' }}>OCR Languages (comma-separated)</label>
                            <input
                              type="text"
                              value={doclingOptions.ocr_lang}
                              onChange={(e) => setDoclingOptions(prev => ({ ...prev, ocr_lang: e.target.value }))}
                              placeholder="en, ko, fr"
                              className="w-full px-2 py-1 text-xs border rounded"
                              style={{
                                backgroundColor: 'var(--admin-bg)',
                                borderColor: 'var(--admin-border)',
                                color: 'var(--admin-text)'
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PDF Options */}
                    <div className="space-y-2 pb-2 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                      <h5 className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>PDF Options</h5>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>PDF Backend</label>
                          {!doclingOptions.pdf_backend_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: Not set (uses system default)
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.pdf_backend_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, pdf_backend_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.pdf_backend_enabled && (
                        <div className="ml-4">
                          <select
                            value={doclingOptions.pdf_backend}
                            onChange={(e) => setDoclingOptions(prev => ({ ...prev, pdf_backend: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border rounded"
                            style={{
                              backgroundColor: 'var(--admin-bg)',
                              borderColor: 'var(--admin-border)',
                              color: 'var(--admin-text)'
                            }}
                          >
                            <option value="pypdfium2">pypdfium2</option>
                            <option value="dlparse_v1">dlparse_v1</option>
                            <option value="dlparse_v2">dlparse_v2</option>
                            <option value="dlparse_v4">dlparse_v4</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Pipeline</label>
                          {!doclingOptions.pipeline_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: Not set (commented out in backend)
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.pipeline_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, pipeline_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.pipeline_enabled && (
                        <div className="ml-4">
                          <select
                            value={doclingOptions.pipeline}
                            onChange={(e) => setDoclingOptions(prev => ({ ...prev, pipeline: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border rounded"
                            style={{
                              backgroundColor: 'var(--admin-bg)',
                              borderColor: 'var(--admin-border)',
                              color: 'var(--admin-text)'
                            }}
                          >
                            <option value="legacy">legacy</option>
                            <option value="standard">standard</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Table Options */}
                    <div className="space-y-2 pb-2 border-b" style={{ borderColor: 'var(--admin-border)' }}>
                      <h5 className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>Table Options</h5>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Table Mode</label>
                          {!doclingOptions.table_mode_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: 'fast'
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.table_mode_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, table_mode_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.table_mode_enabled && (
                        <div className="ml-4">
                          <select
                            value={doclingOptions.table_mode}
                            onChange={(e) => setDoclingOptions(prev => ({ ...prev, table_mode: e.target.value }))}
                            className="w-full px-2 py-1 text-xs border rounded"
                            style={{
                              backgroundColor: 'var(--admin-bg)',
                              borderColor: 'var(--admin-border)',
                              color: 'var(--admin-text)'
                            }}
                          >
                            <option value="fast">fast</option>
                            <option value="accurate">accurate</option>
                          </select>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Do Table Structure</label>
                          {!doclingOptions.do_table_structure_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: false
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.do_table_structure_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, do_table_structure_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.do_table_structure_enabled && (
                        <div className="ml-4">
                          <input
                            type="checkbox"
                            checked={doclingOptions.do_table_structure}
                            onChange={(e) => setDoclingOptions(prev => ({ ...prev, do_table_structure: e.target.checked }))}
                            className="w-4 h-4"
                          />
                        </div>
                      )}
                    </div>

                    {/* Image Options */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium" style={{ color: 'var(--admin-text)' }}>Image Options</h5>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Include Images</label>
                          {!doclingOptions.include_images_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: false
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.include_images_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, include_images_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.include_images_enabled && (
                        <div className="ml-4">
                          <input
                            type="checkbox"
                            checked={doclingOptions.include_images}
                            onChange={(e) => setDoclingOptions(prev => ({ ...prev, include_images: e.target.checked }))}
                            className="w-4 h-4"
                          />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="text-xs" style={{ color: 'var(--admin-text)' }}>Images Scale</label>
                          {!doclingOptions.images_scale_enabled && (
                            <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                              Default: 1
                            </p>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={doclingOptions.images_scale_enabled}
                          onChange={(e) => setDoclingOptions(prev => ({ ...prev, images_scale_enabled: e.target.checked }))}
                          className="w-4 h-4"
                        />
                      </div>
                      {doclingOptions.images_scale_enabled && (
                        <div className="ml-4">
                          <input
                            type="text"
                            value={doclingOptions.images_scale}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                setDoclingOptions(prev => ({ ...prev, images_scale: value }));
                              }
                            }}
                            placeholder="2.0"
                            className="w-full px-2 py-1 text-xs border rounded"
                            style={{
                              backgroundColor: 'var(--admin-bg)',
                              borderColor: 'var(--admin-border)',
                              color: 'var(--admin-text)'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowIndexingModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'var(--admin-border)',
                      color: 'var(--admin-text)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--admin-bg-secondary, rgba(0, 0, 0, 0.05))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChunkingOptions}
                    disabled={isSavingChunking}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--admin-primary, #3b82f6)',
                      boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingChunking) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingChunking) {
                        e.currentTarget.style.backgroundColor = 'var(--admin-primary, #3b82f6)';
                      }
                    }}
                  >
                    {isSavingChunking ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Retrieval Options Modal */}
      {showRetrievalModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            // Don't close if clicking inside the modal
            if (e.target !== e.currentTarget) {
              return;
            }
            // Don't close if user is selecting text
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
              return;
            }
            setShowRetrievalModal(false);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full border-2"
            onClick={(e) => e.stopPropagation()}
            onMouseUp={(e) => {
              // Prevent backdrop click when releasing mouse after text selection
              e.stopPropagation();
            }}
            style={{
              backgroundColor: 'var(--card, #2f2f2f)',
              borderColor: 'var(--admin-border)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
                Retrieval Options
              </h3>
              <button
                onClick={() => setShowRetrievalModal(false)}
                className="rounded-full p-2 transition-colors"
                style={{ 
                  color: 'var(--admin-text-muted)',
                  backgroundColor: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text, #111827)';
                  e.currentTarget.style.backgroundColor = 'var(--admin-bg-secondary, rgba(0, 0, 0, 0.05))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--admin-text-muted, #6b7280)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <IconX size={20} />
              </button>
            </div>
            
            {isLoadingChunking ? (
              <div className="text-center py-8" style={{ color: 'var(--admin-text-muted)' }}>
                Loading retrieval options...
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--admin-text)' }}>
                    Retrieval Options
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label 
                        htmlFor="top-k" 
                        className="block text-xs font-medium mb-1"
                        style={{ color: 'var(--admin-text)' }}
                      >
                        Top K
                      </label>
                      <input
                        id="top-k"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={topK}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow empty string or numbers only
                          if (value === '' || /^\d+$/.test(value)) {
                            setTopK(value);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        style={{
                          backgroundColor: 'var(--admin-bg)',
                          borderColor: 'var(--admin-border)',
                          color: 'var(--admin-text)'
                        }}
                      />
                      <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                        Number of top results to retrieve (empty to use default)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRetrievalModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg font-medium transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: 'var(--admin-border)',
                      color: 'var(--admin-text)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--admin-bg-secondary, rgba(0, 0, 0, 0.05))';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChunkingOptions}
                    disabled={isSavingChunking}
                    className="flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--admin-primary, #3b82f6)',
                      boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingChunking) {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingChunking) {
                        e.currentTarget.style.backgroundColor = 'var(--admin-primary, #3b82f6)';
                      }
                    }}
                  >
                    {isSavingChunking ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default FileLibrary;
