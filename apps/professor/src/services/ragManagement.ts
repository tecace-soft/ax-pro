import axios from 'axios';

// RAG Management API configuration
const N8N_BASE_URL = (import.meta as any).env?.VITE_N8N_BASE_URL || 'https://n8n.srv978041.hstgr.cloud';
const UPLOAD_WEBHOOK_ID = (import.meta as any).env?.VITE_N8N_UPLOAD_WEBHOOK_ID || '1f18f1aa-44c4-467f-b299-c87c9b6f9459';

// n8n webhook endpoints for different operations
const ENDPOINTS = {
  UPLOAD: `${N8N_BASE_URL}/webhook/${UPLOAD_WEBHOOK_ID}`,
  LIST_FILES: `${N8N_BASE_URL}/webhook/${(import.meta as any).env?.VITE_N8N_LIST_FILES_WEBHOOK_ID || 'list-files'}`,
  DELETE_FILE: `${N8N_BASE_URL}/webhook/${(import.meta as any).env?.VITE_N8N_DELETE_FILE_WEBHOOK_ID || 'delete-file'}`,
  REINDEX_FILE: `${N8N_BASE_URL}/webhook/${(import.meta as any).env?.VITE_N8N_REINDEX_FILE_WEBHOOK_ID || 'reindex-file'}`,
  GET_FILE_STATUS: `${N8N_BASE_URL}/webhook/${(import.meta as any).env?.VITE_N8N_FILE_STATUS_WEBHOOK_ID || 'file-status'}`,
};

export interface FileUploadResult {
  success: boolean;
  message: string;
  fileName?: string;
  error?: string;
}

export interface RAGFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  url?: string;
  lastModified?: string;
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface FileListResponse {
  success: boolean;
  files: RAGFile[];
  total: number;
  message?: string;
}

/**
 * Upload files to the RAG system via n8n webhook
 */
export async function uploadFilesToRAG(files: File[]): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = [];
  
  try {
    const formData = new FormData();
    
    // Append all files to FormData
    files.forEach(file => {
      formData.append('Files', file);
    });

    const response = await axios.post(ENDPOINTS.UPLOAD, formData, {
      headers: {
        'Accept': '*/*',
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout
    });

    // If we get here, the upload was successful
    files.forEach(file => {
      results.push({
        success: true,
        message: 'File uploaded successfully',
        fileName: file.name,
      });
    });

    console.log('RAG upload response:', response.data);
    
  } catch (error: any) {
    console.error('Error uploading files to RAG:', error);
    
    // Create error results for all files
    files.forEach(file => {
      results.push({
        success: false,
        message: 'Failed to upload file',
        fileName: file.name,
        error: error.response?.data?.message || error.message || 'Unknown error',
      });
    });
  }

  return results;
}

/**
 * Upload a single file to the RAG system
 */
export async function uploadSingleFileToRAG(file: File): Promise<FileUploadResult> {
  const results = await uploadFilesToRAG([file]);
  return results[0];
}

/**
 * Fetch list of files from n8n RAG system
 */
export async function fetchFilesFromRAG(): Promise<FileListResponse> {
  try {
    console.log('Fetching files from n8n RAG system...');
    
    const response = await axios.post(ENDPOINTS.LIST_FILES, {}, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('Files fetched successfully:', response.data);
    
    // Handle different response formats from n8n
    let filesData = [];
    if (Array.isArray(response.data)) {
      filesData = response.data;
    } else if (response.data.files && Array.isArray(response.data.files)) {
      filesData = response.data.files;
    } else if (response.data.data && Array.isArray(response.data.data)) {
      filesData = response.data.data;
    } else {
      console.warn('Unexpected response format from n8n:', response.data);
      filesData = [];
    }
    
    // Transform the response to match our interface
    const files: RAGFile[] = filesData.map((file: any, index: number) => ({
      id: file.id || file.fileId || file.file_id || `file-${Date.now()}-${index}`,
      name: file.name || file.fileName || file.file_name || 'Unknown',
      size: file.size || file.fileSize || file.file_size || 0,
      type: file.type || file.contentType || file.content_type || 'application/octet-stream',
      uploadedAt: file.uploadedAt || file.createdAt || file.uploadDate || file.created_at || new Date().toISOString(),
      status: file.status || 'ready',
      url: file.url || file.downloadUrl || file.download_url,
      lastModified: file.lastModified || file.updatedAt || file.updated_at,
      syncStatus: file.syncStatus || file.sync_status || 'synced',
    }));

    return {
      success: true,
      files,
      total: files.length,
      message: 'Files fetched successfully'
    };
    
  } catch (error: any) {
    console.error('Error fetching files from RAG:', error);
    
    // Return empty list on error
    return {
      success: false,
      files: [],
      total: 0,
      message: error.response?.data?.message || error.message || 'Failed to fetch files'
    };
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 10MB'
    };
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown',
    'application/json',
    'text/html',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload PDF, Word, Excel, CSV, TXT, MD, JSON, or HTML files.'
    };
  }

  return { valid: true };
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file icon based on file type
 */
export function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('csv')) return '📈';
  if (fileType.includes('text')) return '📃';
  if (fileType.includes('markdown')) return '📋';
  if (fileType.includes('json')) return '🔧';
  if (fileType.includes('html')) return '🌐';
  return '📁';
}

/**
 * Re-index a file via n8n webhook
 */
export async function reindexFile(fileId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Re-indexing file via n8n: ${fileId}`);
    
    const response = await axios.post(ENDPOINTS.REINDEX_FILE, {
      fileId: fileId
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 15000, // 15 second timeout for reindexing
    });

    console.log('Re-index response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'File re-indexed successfully'
    };
  } catch (error: any) {
    console.error('Error re-indexing file:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to re-index file'
    };
  }
}

/**
 * Delete a file from the RAG system via n8n webhook
 */
export async function deleteFileFromRAG(fileId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Deleting file from RAG via n8n: ${fileId}`);
    
    const response = await axios.post(ENDPOINTS.DELETE_FILE, {
      fileId: fileId
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('Delete response:', response.data);
    
    return {
      success: true,
      message: response.data.message || 'File deleted successfully'
    };
  } catch (error: any) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to delete file'
    };
  }
}
