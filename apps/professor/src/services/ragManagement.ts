import axios from 'axios';
import { getSupabaseClient } from './supabase';

// RAG Management API configuration
const N8N_BASE_URL = import.meta.env.VITE_N8N_BASE_URL || 'https://n8n.srv978041.hstgr.cloud';
const UPLOAD_WEBHOOK_ID = import.meta.env.VITE_N8N_UPLOAD_WEBHOOK_ID || '1f18f1aa-44c4-467f-b299-c87c9b6f9459';

// n8n webhook endpoints for different operations
const ENDPOINTS = {
  UPLOAD: `${N8N_BASE_URL}/webhook/${UPLOAD_WEBHOOK_ID}`,
  LIST_FILES: `${N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_LIST_FILES_WEBHOOK_ID || 'list-files'}`,
  DELETE_FILE: `${N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_DELETE_FILE_WEBHOOK_ID || 'delete-file'}`,
  REINDEX_FILE: `${N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_REINDEX_FILE_WEBHOOK_ID || 'reindex-file'}`,
  GET_FILE_STATUS: `${N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_FILE_STATUS_WEBHOOK_ID || 'file-status'}`,
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

// ============================================================================
// SUPABASE STORAGE FUNCTIONS
// ============================================================================

const SUPABASE_BUCKET = 'knowledge-base';

/**
 * Get unique filename by checking for duplicates (macOS style)
 */
async function getUniqueFileName(supabase: any, originalName: string): Promise<string> {
  try {
    // Get all files in the folder
    const { data: existingFiles, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list('files', {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      console.error('Error listing files:', error);
      // If we can't check, just use original name
      return originalName;
    }

    if (!existingFiles || existingFiles.length === 0) {
      // No files yet, use original name
      return originalName;
    }

    // Check if original name exists
    const fileExists = existingFiles.some(f => f.name === originalName);
    
    if (!fileExists) {
      // No duplicate, use original name
      return originalName;
    }

    // File exists, add (1), (2), etc.
    const nameParts = originalName.split('.');
    const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');

    let counter = 1;
    let newName = `${baseName} (${counter})${extension}`;

    // Keep checking until we find a unique name
    while (existingFiles.some(f => f.name === newName)) {
      counter++;
      newName = `${baseName} (${counter})${extension}`;
    }

    console.log(`📝 Duplicate file detected: ${originalName} → ${newName}`);
    return newName;
  } catch (error) {
    console.error('Error in getUniqueFileName:', error);
    // Fallback to original name
    return originalName;
  }
}

/**
 * Upload files to Supabase Storage
 */
export async function uploadFilesToSupabase(files: File[]): Promise<FileUploadResult[]> {
  const results: FileUploadResult[] = [];
  const supabase = getSupabaseClient();
  
  for (const file of files) {
    try {
      // Validate file first
      const validation = validateFile(file);
      if (!validation.valid) {
        results.push({
          success: false,
          message: 'File validation failed',
          fileName: file.name,
          error: validation.error,
        });
        continue;
      }

      // Get unique filename (macOS style - add (1), (2) if duplicate)
      const uniqueFileName = await getUniqueFileName(supabase, file.name);
      const filePath = `files/${uniqueFileName}`;

      console.log(`Uploading file to Supabase Storage: ${filePath}`);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        results.push({
          success: false,
          message: 'Failed to upload file',
          fileName: file.name,
          error: error.message,
        });
        continue;
      }

      console.log('File uploaded successfully:', data);

      results.push({
        success: true,
        message: 'File uploaded successfully',
        fileName: uniqueFileName, // Return the unique filename
      });

    } catch (error: any) {
      console.error('Error uploading file to Supabase:', error);
      results.push({
        success: false,
        message: 'Failed to upload file',
        fileName: file.name,
        error: error.message || 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Upload a single file to Supabase Storage
 */
export async function uploadSingleFileToSupabase(file: File): Promise<FileUploadResult> {
  const results = await uploadFilesToSupabase([file]);
  return results[0];
}

/**
 * Fetch list of files from Supabase Storage
 */
export async function fetchFilesFromSupabase(): Promise<FileListResponse> {
  try {
    console.log('Fetching files from Supabase Storage...');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .list('files', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Supabase list error:', error);
      return {
        success: false,
        files: [],
        total: 0,
        message: error.message,
      };
    }

    console.log('Files fetched from Supabase:', data);

    // Transform Supabase file objects to RAGFile format
    const files: RAGFile[] = data.map((file: any) => ({
      id: file.id || file.name,
      name: file.name,
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || 'application/octet-stream',
      uploadedAt: file.created_at || new Date().toISOString(),
      status: 'ready',
      lastModified: file.updated_at || file.created_at,
      syncStatus: 'synced',
    }));

    return {
      success: true,
      files,
      total: files.length,
      message: 'Files fetched successfully',
    };

  } catch (error: any) {
    console.error('Error fetching files from Supabase:', error);
    return {
      success: false,
      files: [],
      total: 0,
      message: error.message || 'Failed to fetch files',
    };
  }
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFileFromSupabase(fileName: string): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`Deleting file from Supabase Storage: ${fileName}`);
    const supabase = getSupabaseClient();

    const filePath = `files/${fileName}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        success: false,
        message: error.message,
      };
    }

    console.log('File deleted successfully from Supabase');

    return {
      success: true,
      message: 'File deleted successfully',
    };

  } catch (error: any) {
    console.error('Error deleting file from Supabase:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete file',
    };
  }
}

/**
 * Get public URL for a file in Supabase Storage
 */
export async function getSupabaseFileUrl(fileName: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const filePath = `files/${fileName}`;

    const { data } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;

  } catch (error: any) {
    console.error('Error getting file URL:', error);
    return null;
  }
}

/**
 * Validate file with extended format support
 */
export function validateFileExtended(file: File): { valid: boolean; error?: string } {
  // Check file size (max 50MB for Supabase)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 50MB'
    };
  }

  // Check file extension
  const allowedExtensions = [
    '.pdf', '.docx', '.doc',
    '.xlsx', '.xls',
    '.pptx', '.ppt',
    '.txt', '.md', '.csv',
    '.json', '.html', '.rtf',
    '.xml', '.css', '.js', '.ts'
  ];

  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`
    };
  }

  return { valid: true };
}

// ============================================================================
// VECTOR INDEXING FUNCTIONS
// ============================================================================

export interface VectorDocument {
  id: number;
  content: string;
  metadata: {
    source?: string;
    fileName?: string;
    chunkIndex?: number;
    [key: string]: any;
  };
  embedding?: number[];
}

/**
 * Fetch all documents from Supabase documents table
 */
export async function fetchVectorDocuments(): Promise<{ success: boolean; documents: VectorDocument[]; total: number; message?: string }> {
  try {
    console.log('Fetching vector documents from Supabase...');
    const supabase = getSupabaseClient();

    const { data, error, count } = await supabase
      .from('documents')
      .select('*', { count: 'exact' })
      .order('id', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return {
        success: false,
        documents: [],
        total: 0,
        message: error.message,
      };
    }

    console.log(`✅ Fetched ${data?.length || 0} documents from Supabase`);

    return {
      success: true,
      documents: data || [],
      total: count || 0,
      message: 'Documents fetched successfully',
    };

  } catch (error: any) {
    console.error('Error fetching vector documents:', error);
    return {
      success: false,
      documents: [],
      total: 0,
      message: error.message || 'Failed to fetch documents',
    };
  }
}

/**
 * Send file to n8n for indexing
 */
export async function indexFileToVector(fileName: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabaseClient();
    
    // Get signed URL for the file
    const filePath = `files/${fileName}`;
    const { data: urlData, error: urlError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour

    if (urlError || !urlData?.signedUrl) {
      console.error('Error getting file URL:', urlError);
      return {
        success: false,
        message: 'Failed to get file URL',
      };
    }

    console.log(`📤 Sending file to n8n for indexing: ${fileName}`);

    // Send to n8n webhook
    const n8nWebhookUrl = import.meta.env.VITE_N8N_BASE_URL 
      ? `${import.meta.env.VITE_N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_UPLOAD_WEBHOOK_ID}`
      : `${N8N_BASE_URL}/webhook/${UPLOAD_WEBHOOK_ID}`;

    const response = await axios.post(n8nWebhookUrl, {
      fileUrl: urlData.signedUrl,
      fileName: fileName,
      source: 'supabase-storage',
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('✅ File sent to n8n for indexing:', response.data);

    return {
      success: true,
      message: 'File sent for indexing successfully',
    };

  } catch (error: any) {
    console.error('Error indexing file:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Failed to index file',
    };
  }
}

/**
 * Unindex (delete) all chunks for a specific filename
 */
export async function unindexFileByFilename(fileName: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    const n8nBaseUrl = import.meta.env.VITE_N8N_BASE_URL || N8N_BASE_URL;
    const webhookId = import.meta.env.VITE_N8N_UNINDEX_WEBHOOK_ID || 'unindex-file';
    
    const webhookUrl = `${n8nBaseUrl}/webhook/${webhookId}`;
    
    console.log('🗑️ Sending unindex request for filename:', fileName);
    
    const response = await axios.post(webhookUrl, {
      fileName: fileName
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ File unindexed successfully:', response.data);
    
    return {
      success: true,
      message: `File ${fileName} unindexed successfully`,
      deletedCount: response.data.deletedCount || 0
    };
  } catch (error) {
    console.error('❌ Failed to unindex file:', error);
    return {
      success: false,
      message: `Failed to unindex file: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
