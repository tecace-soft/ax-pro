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
      syncStatus: 'pending', // Default to pending - files are uploaded but not indexed
    }));

    // Check sync status for each file by comparing with indexed documents (batched)
    console.log('🔍 Checking sync status for files (batched by filename)...');
    try {
      const supabase = getSupabaseClient();
      // Fetch only explicit fileName metadata and build a set (lowercased)
      const { data: fileNameRows, error: metasError } = await supabase
        .from('documents')
        .select('metadata->>fileName as fileName');

      if (metasError) {
        console.warn('⚠️ Failed to fetch document filenames for sync check:', metasError);
      }

      const indexedNameSet = new Set<string>();
      if (fileNameRows && fileNameRows.length > 0) {
        for (const row of fileNameRows as Array<{ fileName?: string }>) {
          const metaName = row.fileName as string | undefined;
          if (metaName && typeof metaName === 'string') {
            indexedNameSet.add(metaName.trim().toLowerCase());
          }
        }
      }

      // Debug: log counts and a sample
      console.log('[SyncCheck] Indexed filenames count:', indexedNameSet.size);
      if (indexedNameSet.size > 0) {
        console.log('[SyncCheck] Example indexed name:', Array.from(indexedNameSet)[0]);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const raw = (file.name || '').trim();
        const base = raw.includes('/') ? raw.substring(raw.lastIndexOf('/') + 1) : raw;
        const normalized = base.toLowerCase();
        file.syncStatus = indexedNameSet.has(normalized) ? 'synced' : 'pending';
      }
    } catch (error) {
      console.warn('⚠️ Error during batched sync status calculation:', error);
      // If check fails, mark as error but do not crash the listing
      for (let i = 0; i < files.length; i++) {
        files[i].syncStatus = 'error';
      }
    }

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
    console.log(`🔍 Requesting signed URL for: ${filePath}`);
    
    const { data: urlData, error: urlError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(filePath, 3600); // 1 hour
      
    console.log(`🔍 Signed URL response:`, { urlData, urlError });

    if (urlError || !urlData?.signedUrl) {
      console.error('Error getting file URL:', urlError);
      return {
        success: false,
        message: 'Failed to get file URL',
      };
    }

    // Also try getPublicUrl to compare
    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(filePath);
    console.log(`🔍 Public URL for comparison:`, publicUrlData);

    console.log(`📤 Sending file to n8n for indexing: ${fileName}`);
    
    // Ensure we have a full URL for n8n
    let fullFileUrl = urlData.signedUrl;
    
    // Check if we have a relative path that needs to be converted to full URL
    if (!urlData.signedUrl.startsWith('http')) {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qpyteahuynkgkbmdasbv.supabase.co';
      
      if (urlData.signedUrl.startsWith('/object/')) {
        // Format: /object/sign/bucket/path?token=...
        fullFileUrl = `${supabaseUrl}/storage/v1${urlData.signedUrl}`;
        console.log(`🔧 Converted relative URL to full URL`);
      } else if (urlData.signedUrl.startsWith('/storage/')) {
        // Format: /storage/v1/object/sign/bucket/path?token=...
        fullFileUrl = `${supabaseUrl}${urlData.signedUrl}`;
        console.log(`🔧 Converted /storage/ URL to full URL`);
      } else {
        // Fallback: assume it needs the full path
        fullFileUrl = `${supabaseUrl}/storage/v1/object/sign/${SUPABASE_BUCKET}/${filePath}?token=${urlData.signedUrl.split('token=')[1] || ''}`;
        console.log(`🔧 Used fallback URL construction`);
      }
    } else {
      console.log(`✅ URL already full, no conversion needed`);
    }
    
    console.log(`🔗 FINAL URL SENT TO N8N: ${fullFileUrl}`);
    console.log(`⏰ Request time: ${new Date().toISOString()}`);

    // Send to n8n webhook - DEV/PRODUCTION SELECTOR
    // Default to PRODUCTION mode, only use DEV if explicitly enabled
    const isDevMode = import.meta.env.VITE_N8N_DEV_MODE === 'true' || 
                     localStorage.getItem('n8n-dev-mode') === 'true';
    
    const n8nWebhookUrl = isDevMode 
      ? 'https://n8n.srv978041.hstgr.cloud/webhook-test/1f18f1aa-44c4-467f-b299-c87c9b6f9459'
      : (import.meta.env.VITE_N8N_BASE_URL 
          ? `${import.meta.env.VITE_N8N_BASE_URL}/webhook/${import.meta.env.VITE_N8N_UPLOAD_WEBHOOK_ID}`
          : `${N8N_BASE_URL}/webhook/${UPLOAD_WEBHOOK_ID}`);
    
    console.log(`🔧 Webhook mode: ${isDevMode ? 'DEV (test)' : 'PRODUCTION'}`);
    console.log(`🌐 Using webhook: ${n8nWebhookUrl}`);
    
    // Warn if using test webhook
    if (isDevMode) {
      console.warn(`⚠️ Using TEST webhook - this may not be active!`);
    }

    console.log(`🌐 n8n Webhook URL: ${n8nWebhookUrl}`);

    const payload = [{
      fileUrl: fullFileUrl,
      fileName: fileName,
      source: 'supabase-storage',
    }];

    console.log(`📦 Payload being sent:`, payload);

    // Try axios first, fallback to fetch with no-cors if CORS fails
    try {
      const response = await axios.post(n8nWebhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });

      console.log('✅ File sent to n8n for indexing:', response.data);
      console.log('📊 Response status:', response.status);
      console.log('📋 Response headers:', response.headers);

      // Check if n8n provided a workflow ID or status
      const workflowId = response.data.workflowId || response.data.executionId;
      const estimatedTime = response.data.estimatedTime || '30-60 seconds';

      return {
        success: true,
        message: `File sent for indexing successfully. Processing time: ${estimatedTime}`,
        workflowId: workflowId,
        estimatedTime: estimatedTime
      };
    } catch (axiosError) {
      console.warn('⚠️ Axios failed (likely CORS), trying fetch with no-cors:', axiosError);
      
      // Fallback to fetch with no-cors to bypass CORS
      try {
        const fetchResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          mode: 'no-cors', // This bypasses CORS but we can't read the response
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        console.log(`✅ Fetch request sent (no-cors mode) - status: ${fetchResponse.status}`);
        console.log(`🔍 Response type: ${fetchResponse.type}`);
        
        // Check if it's a 404 or other error
        if (fetchResponse.status === 0) {
          // In no-cors mode, status 0 usually means success or network error
          console.log(`✅ Request sent successfully (no-cors mode)`);
          return {
            success: true,
            message: `File sent for indexing (CORS bypassed). Processing time: 30-60 seconds`,
            workflowId: 'unknown',
            estimatedTime: '30-60 seconds'
          };
        } else {
          console.warn(`⚠️ Unexpected status in no-cors mode: ${fetchResponse.status}`);
          return {
            success: true,
            message: `File sent for indexing (CORS bypassed, status: ${fetchResponse.status}). Processing time: 30-60 seconds`,
            workflowId: 'unknown',
            estimatedTime: '30-60 seconds'
          };
        }
      } catch (fetchError) {
        console.error('❌ Both axios and fetch failed:', fetchError);
        
        // Check if it's a 404 error
        if (fetchError.message?.includes('404') || fetchError.message?.includes('ERR_ABORTED')) {
          return {
            success: false,
            message: `Webhook URL not found (404). Please check if the webhook is active: ${n8nWebhookUrl}`,
          };
        }
        
        throw fetchError;
      }
    }

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
/**
 * Check indexing status for a file
 */
export async function checkIndexingStatus(fileName: string): Promise<{ 
  success: boolean; 
  message: string; 
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunksCount?: number;
  lastUpdated?: string;
}> {
  try {
    const supabase = getSupabaseClient();
    
    // Check if chunks exist for this file
    const { data: chunks, error } = await supabase
      .from('documents')
      .select('id, created_at, metadata')
      .ilike('metadata->>fileName', fileName)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error checking indexing status:', error);
      return {
        success: false,
        message: 'Failed to check indexing status',
        status: 'failed'
      };
    }
    
    if (chunks && chunks.length > 0) {
      const latestChunk = chunks[0];
      return {
        success: true,
        message: `File indexed successfully with ${chunks.length} chunks`,
        status: 'completed',
        chunksCount: chunks.length,
        lastUpdated: latestChunk.created_at
      };
    } else {
      return {
        success: true,
        message: 'File not yet indexed or indexing in progress',
        status: 'pending'
      };
    }
  } catch (error) {
    console.error('Error checking indexing status:', error);
    return {
      success: false,
      message: 'Failed to check indexing status',
      status: 'failed'
    };
  }
}

/**
 * Direct Supabase deletion fallback for unindexing
 */
async function deleteDocumentsByFilename(fileName: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
  try {
    const supabase = getSupabaseClient();
    
    console.log(`🗑️ Direct Supabase deletion for filename: "${fileName}"`);
    console.log(`🔍 Filename length: ${fileName.length}`);
    console.log(`🔍 Filename characters: ${fileName.split('').map(c => c.charCodeAt(0)).join(',')}`);
    
    // Try multiple query approaches to handle different filename formats
    let records: any[] = [];
    let recordCount = 0;
    
    // Approach 1: Exact match
    console.log('🔍 Trying exact match...');
    let { data: exactRecords, error: exactError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('metadata->>fileName', fileName);
    
    if (!exactError && exactRecords && exactRecords.length > 0) {
      records = exactRecords;
      recordCount = exactRecords.length;
      console.log(`✅ Found ${recordCount} records with exact match`);
    } else {
      console.log('❌ Exact match failed, trying ilike...');
      
      // Approach 2: Case-insensitive match
      let { data: ilikeRecords, error: ilikeError } = await supabase
        .from('documents')
        .select('id, metadata')
        .ilike('metadata->>fileName', fileName);
      
      if (!ilikeError && ilikeRecords && ilikeRecords.length > 0) {
        records = ilikeRecords;
        recordCount = ilikeRecords.length;
        console.log(`✅ Found ${recordCount} records with ilike match`);
      } else {
        console.log('❌ ilike match failed, trying contains...');
        
        // Approach 3: Contains match (for partial filenames)
        let { data: containsRecords, error: containsError } = await supabase
          .from('documents')
          .select('id, metadata')
          .ilike('metadata->>fileName', `%${fileName}%`);
        
        if (!containsError && containsRecords && containsRecords.length > 0) {
          records = containsRecords;
          recordCount = containsRecords.length;
          console.log(`✅ Found ${recordCount} records with contains match`);
        } else {
          console.log('❌ All query approaches failed');
          
          // Debug: Show some sample metadata to understand the format
          let { data: sampleRecords } = await supabase
            .from('documents')
            .select('metadata')
            .limit(10);
          
          console.log('🔍 Sample metadata from database:', sampleRecords);
          
          // Show all unique filenames in the database
          let { data: allRecords } = await supabase
            .from('documents')
            .select('metadata->>fileName')
            .not('metadata->>fileName', 'is', null);
          
          if (allRecords) {
            const uniqueFilenames = [...new Set(allRecords.map(r => r.fileName))];
            console.log('🔍 All unique filenames in database:', uniqueFilenames);
            console.log('🔍 Looking for filename containing "PM-Marketing":', 
              uniqueFilenames.filter(f => f && f.includes('PM-Marketing')));
            console.log('🔍 Looking for filename containing "Team Notebook":', 
              uniqueFilenames.filter(f => f && f.includes('Team Notebook')));
          }
          return { success: false, message: `No records found for filename: ${fileName}. Check console for debugging info.`, deletedCount: 0 };
        }
      }
    }
    
    console.log(`📊 Found ${recordCount} records to delete for filename: ${fileName}`);
    
    if (recordCount === 0) {
      return { success: true, message: `No records found for filename: ${fileName}`, deletedCount: 0 };
    }
    
    // Delete the records using the same query that found them
    let deleteQuery = supabase.from('documents').delete();
    
    // Use the same query approach that worked for finding records
    if (records.length > 0) {
      const recordIds = records.map(r => r.id);
      deleteQuery = deleteQuery.in('id', recordIds);
    } else {
      // Fallback to ilike
      deleteQuery = deleteQuery.ilike('metadata->>fileName', fileName);
    }
    
    const { error: deleteError } = await deleteQuery;
    
    if (deleteError) {
      console.error('Error deleting records:', deleteError);
      return { success: false, message: `Failed to delete documents: ${deleteError.message}`, deletedCount: 0 };
    }
    
    console.log(`✅ Successfully deleted ${recordCount} records for filename: ${fileName}`);
    
    return {
      success: true,
      message: `File ${fileName} unindexed successfully (${recordCount} chunks removed)`,
      deletedCount: recordCount
    };
  } catch (error: any) {
    console.error('Error in direct Supabase deletion:', error);
    return { success: false, message: `Failed to delete documents: ${error.message}`, deletedCount: 0 };
  }
}

export async function unindexFileByFilename(fileName: string): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  try {
    console.log('🗑️ Unindexing file using direct Supabase deletion:', fileName);
    
    // Use direct Supabase deletion as primary method (following documentation)
    const result = await deleteDocumentsByFilename(fileName);
    return result;
    
  } catch (error: any) {
    console.error('❌ Failed to unindex file:', error);
    return {
      success: false,
      message: `Failed to unindex file: ${error.message || 'Unknown error'}`
    };
  }
}

/**
 * Direct unindex using Supabase (primary method)
 * This is the recommended approach based on the documentation
 */
export async function unindexFileDirect(fileName: string): Promise<{ success: boolean; message: string; deletedCount: number }> {
  return await deleteDocumentsByFilename(fileName);
}

/**
 * Check sync status for a specific file
 */
export async function checkFileSyncStatus(fileName: string): Promise<{ 
  success: boolean; 
  syncStatus: 'synced' | 'pending' | 'error'; 
  message: string; 
  chunksCount?: number;
}> {
  try {
    const supabase = getSupabaseClient();
    
    console.log(`🔍 Checking sync status for: ${fileName}`);
    
    // Check if file is indexed in documents table
    const { data: indexedDocs, error: indexError } = await supabase
      .from('documents')
      .select('id, metadata')
      .ilike('metadata->>fileName', fileName);
    
    if (indexError) {
      console.error('Error checking sync status:', indexError);
      return {
        success: false,
        syncStatus: 'error',
        message: `Error checking sync status: ${indexError.message}`
      };
    }
    
    if (indexedDocs && indexedDocs.length > 0) {
      return {
        success: true,
        syncStatus: 'synced',
        message: `File is indexed (${indexedDocs.length} chunks)`,
        chunksCount: indexedDocs.length
      };
    } else {
      return {
        success: true,
        syncStatus: 'pending',
        message: 'File is not indexed (pending)'
      };
    }
  } catch (error: any) {
    console.error('Error checking sync status:', error);
    return {
      success: false,
      syncStatus: 'error',
      message: `Error checking sync status: ${error.message}`
    };
  }
}
