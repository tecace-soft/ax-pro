import axios from 'axios';

// RAG Management API configuration
const RAG_WEBHOOK_URL = 'https://n8n.srv978041.hstgr.cloud/webhook/1f18f1aa-44c4-467f-b299-c87c9b6f9459';
const RAG_API_BASE_URL = 'https://n8n.srv978041.hstgr.cloud/api/v1';

// n8n endpoints for different operations
const ENDPOINTS = {
  UPLOAD: RAG_WEBHOOK_URL,
  LIST_FILES: `${RAG_API_BASE_URL}/files`,
  DELETE_FILE: `${RAG_API_BASE_URL}/files`,
  REINDEX_FILE: `${RAG_API_BASE_URL}/files/reindex`,
  GET_FILE_STATUS: `${RAG_API_BASE_URL}/files/status`,
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

    const response = await axios.post(RAG_WEBHOOK_URL, formData, {
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
    
    const response = await axios.get(ENDPOINTS.LIST_FILES, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('Files fetched successfully:', response.data);
    
    // Transform the response to match our interface
    const files: RAGFile[] = response.data.files?.map((file: any) => ({
      id: file.id || file.fileId || `file-${Date.now()}`,
      name: file.name || file.fileName || 'Unknown',
      size: file.size || file.fileSize || 0,
      type: file.type || file.contentType || 'application/octet-stream',
      uploadedAt: file.uploadedAt || file.createdAt || file.uploadDate || new Date().toISOString(),
      status: file.status || 'ready',
      url: file.url || file.downloadUrl,
      lastModified: file.lastModified || file.updatedAt,
      syncStatus: file.syncStatus || 'synced',
    })) || [];

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
 * Re-index a file via n8n API
 */
export async function reindexFile(fileId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Re-indexing file via n8n: ${fileId}`);
    
    const response = await axios.post(`${ENDPOINTS.REINDEX_FILE}/${fileId}`, {}, {
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
 * Delete a file from the RAG system via n8n API
 */
export async function deleteFileFromRAG(fileId: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Deleting file from RAG via n8n: ${fileId}`);
    
    const response = await axios.delete(`${ENDPOINTS.DELETE_FILE}/${fileId}`, {
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
