import axios from 'axios';
import { getSupabaseClient } from './supabaseUserSpecific';

// RAG Management API configuration
const N8N_BASE_URL = (import.meta as any).env?.VITE_N8N_BASE_URL || 'https://n8n.srv1153481.hstgr.cloud';
const UPLOAD_WEBHOOK_ID = (import.meta as any).env?.VITE_N8N_UPLOAD_WEBHOOK_ID || '30de76ac-a5bf-41a4-a151-ee9f8ec5c19a';

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
  syncStatus?: 'synced' | 'pending' | 'index_started' | 'error';
  indexRequestedAt?: string; // Timestamp when indexing was requested
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
/**
 * Sanitize filename to avoid unicode/encoding issues
 */
export function sanitizeFileName(fileName: string): string {
  // Replace problematic characters
  let sanitized = fileName
    .normalize('NFD') // Normalize unicode
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\x00-\x7F]/g, '_') // Replace non-ASCII with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid file system chars
    .replace(/_+/g, '_') // Collapse multiple underscores
    .trim();
  
  // Ensure file has extension
  if (!sanitized.includes('.')) {
    sanitized += '.txt';
  }
  
  return sanitized;
}

export function validateFile(file: File): { valid: boolean; error?: string; warning?: string } {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size must be less than 50MB'
    };
  }

  // Check for problematic characters in filename
  const hasNonASCII = /[^\x00-\x7F]/.test(file.name);
  const warning = hasNonASCII 
    ? 'Filename contains special characters that may cause issues. Will be sanitized during upload.'
    : undefined;

  // Check file extension (more reliable than MIME type)
  // Docling supported formats: docx, pptx, html, image, pdf, asciidoc, md, csv, xlsx, xml, json_docling, vtt
  // Note: .txt is allowed but will be renamed to .md during upload (Docling doesn't support .txt)
  // Audio formats are NOT supported by Docling, so they are excluded
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
  const fileName = file.name.toLowerCase();
  
  // Check if file is an audio format (block immediately)
  if (audioExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: '오디오 파일은 문서 변환이 지원되지 않습니다. 텍스트 기반 문서를 업로드하세요.'
    };
  }

  const allowedExtensions = [
    // Documents
    '.docx', '.pptx', '.html', '.pdf', '.asciidoc', '.adoc', '.md', '.txt', '.csv', '.xlsx', '.xml', '.json',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp',
    // Video/Subtitle
    '.vtt'
  ];

  const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed extensions: ${allowedExtensions.join(', ')}`
    };
  }

  return { valid: true, warning };
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
    const fileExists = existingFiles.some((f: RAGFile) => f.name === originalName);
    
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
    while (existingFiles.some((f: RAGFile) => f.name === newName)) {
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

      // Sanitize filename to avoid unicode issues
      let sanitizedName = sanitizeFileName(file.name);
      
      // Convert .txt to .md (Docling doesn't support .txt format)
      let renamedToMd = false;
      let contentType = file.type || 'application/octet-stream';
      
      if (sanitizedName.toLowerCase().endsWith('.txt')) {
        sanitizedName = sanitizedName.slice(0, -4) + '.md';
        renamedToMd = true;
        contentType = 'text/markdown'; // Set content type to markdown for .txt files converted to .md
        console.log(`📝 .txt file detected: "${file.name}" → "${sanitizedName}" (Docling requires .md format)`);
      }
      
      // Normalize .md files to always use text/markdown (not text/x-markdown or other variants)
      if (sanitizedName.toLowerCase().endsWith('.md')) {
        contentType = 'text/markdown';
      }
      
      // Show warning if filename was changed
      if (sanitizedName !== file.name) {
        if (renamedToMd) {
          console.warn(`⚠️ File renamed from .txt to .md: "${file.name}" → "${sanitizedName}" (Docling doesn't support .txt)`);
        } else {
          console.warn(`⚠️ Filename sanitized: "${file.name}" → "${sanitizedName}"`);
        }
      }
      
      // Get unique filename (macOS style - add (1), (2) if duplicate)
      const uniqueFileName = await getUniqueFileName(supabase, sanitizedName);
      const filePath = `files/${uniqueFileName}`;

      console.log(`Uploading file to Supabase Storage: ${filePath}`);

      // Create a new File object with updated content type if needed
      let fileToUpload: File = file;
      if (sanitizedName.toLowerCase().endsWith('.md') && file.type !== 'text/markdown') {
        // Create a new File with markdown content type (normalize text/x-markdown to text/markdown)
        fileToUpload = new File([file], uniqueFileName, { type: 'text/markdown' });
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
          contentType: contentType, // Explicitly set content type
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

      // Save file metadata to database table with group_id
      const { getSession } = await import('./auth');
      const { getGroupIdFromUrl } = await import('../utils/navigation');
      const session = getSession();
      const groupId = getGroupIdFromUrl();
      
      if (groupId && session?.userId) {
        try {
          const { error: dbError } = await supabase
            .from('files')
            .insert([{
              file_name: uniqueFileName,
              group_id: groupId,
              user_id: session.userId,
              file_path: filePath,
              file_size: file.size,
              file_type: contentType, // Use the determined content type (text/markdown for .txt files)
              is_indexed: false
            }]);
          
          if (dbError) {
            console.warn('⚠️ Failed to save file metadata to database:', dbError);
            // Don't fail the upload if DB insert fails
          } else {
            console.log('✅ File metadata saved to database with group_id:', groupId);
          }
        } catch (dbErr) {
          console.warn('⚠️ Error saving file metadata:', dbErr);
          // Don't fail the upload if DB insert fails
        }
      } else {
        console.warn('⚠️ No group_id or userId in session, file metadata not saved to database');
      }

      results.push({
        success: true,
        message: renamedToMd 
          ? `File uploaded successfully (renamed from .txt to .md for Docling compatibility)`
          : 'File uploaded successfully',
        fileName: uniqueFileName, // Return the unique filename (may be .md if originally .txt)
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
 * Fetch list of files from Supabase Storage, filtered by group_id
 */
export async function fetchFilesFromSupabase(
  onProgress?: (current: number, total: number, status: string) => void
): Promise<FileListResponse> {
  try {
    console.log('🔍 [fetchFilesFromSupabase] Starting file fetch...');
    const supabase = getSupabaseClient();
    
    // Get group_id from URL
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();
    const userId = session?.userId;
    
    console.log('🔍 [fetchFilesFromSupabase] Session check:', {
      hasSession: !!session,
      groupId: groupId || 'MISSING',
      userId: userId || 'MISSING',
      sessionKeys: session ? Object.keys(session) : []
    });
    
    if (!groupId) {
      console.warn('⚠️ [fetchFilesFromSupabase] No group_id in session, cannot fetch group-specific files');
      return {
        success: false,
        files: [],
        total: 0,
        message: 'No group selected. Please select a group first.',
      };
    }

    console.log(`🔍 [fetchFilesFromSupabase] Querying files table for group_id: ${groupId}`);
    
    // Query files table filtered by group_id
    const { data: fileRecords, error: dbError } = await supabase
      .from('files')
      .select('*')
      .eq('group_id', groupId)
      .order('uploaded_at', { ascending: false });

    if (dbError) {
      console.error('❌ [fetchFilesFromSupabase] Database error:', {
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint
      });
      
      // If files table doesn't exist, return empty list with helpful message
      // We can't filter files by group from storage alone, so we need the table
      // PGRST205 = PostgREST error: table not found in schema cache
      // 42P01 = PostgreSQL error: relation does not exist
      if (dbError.code === '42P01' || dbError.code === 'PGRST205' || dbError.message?.includes('does not exist') || dbError.message?.includes('schema cache')) {
        console.warn('⚠️ [fetchFilesFromSupabase] Files table does not exist. Please run the migration to create it.');
        return {
          success: false,
          files: [],
          total: 0,
          message: 'Files table not found. Please run the database migration (docs/database/files_table_setup.sql) in Supabase SQL Editor to create the table.',
        };
      }
      
      // Check for RLS policy errors
      if (dbError.code === '42501' || dbError.message?.includes('permission denied') || dbError.message?.includes('policy')) {
        console.warn('⚠️ [fetchFilesFromSupabase] RLS policy may be blocking access');
        return {
          success: false,
          files: [],
          total: 0,
          message: `Permission denied. Check Row Level Security (RLS) policies on the 'files' table. Error: ${dbError.message}`,
        };
      }
      
      // For other errors, return empty list rather than showing all files
      console.warn('⚠️ [fetchFilesFromSupabase] Error querying files table, returning empty list to prevent showing all files');
      return {
        success: false,
        files: [],
        total: 0,
        message: `Error fetching files: ${dbError.message} (Code: ${dbError.code || 'unknown'}). Files must be tracked in the database table to filter by group.`,
      };
    }

    const totalFiles = fileRecords?.length || 0;
    console.log(`✅ [fetchFilesFromSupabase] Found ${totalFiles} files in database for group ${groupId}`);

    if (onProgress) {
      onProgress(0, totalFiles, `Found ${totalFiles} files. Checking sync status...`);
    }

    // Transform database file records to RAGFile format
    const files: RAGFile[] = (fileRecords || []).map((file: any) => ({
      id: file.id?.toString() || file.file_name,
      name: file.file_name,
      size: file.file_size || 0,
      type: file.file_type || 'application/octet-stream',
      uploadedAt: file.uploaded_at || file.created_at || new Date().toISOString(),
      status: 'ready',
      lastModified: file.updated_at || file.uploaded_at || file.created_at,
      syncStatus: file.is_indexed ? 'synced' : 'pending',
    }));

    // Check sync status for each file by comparing with indexed documents
    // Only check files that aren't already marked as indexed
    const filesToCheck = files.filter(f => f.syncStatus !== 'synced');
    
    if (filesToCheck.length > 0) {
      console.log(`🔍 Checking sync status for ${filesToCheck.length} files (optimized query)...`);
      try {
        // OPTIMIZED: Fetch only unique fileNames from documents (much faster than fetching all metadata)
        // Use a more efficient approach: get distinct fileName values
        let allFileNames = new Set<string>();
        let hasMore = true;
        let page = 0;
        const pageSize = 1000;
        let totalChunksChecked = 0;
        
        // Get total count for progress tracking
        const { count: totalChunksCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('metadata->>groupId', groupId)
          .not('metadata->>fileName', 'is', null);
        
        const totalChunks = totalChunksCount || 0;
        
        if (onProgress) {
          onProgress(0, totalFiles, `Scanning ${totalChunks.toLocaleString()} chunks for indexed files...`);
        }
      
        // Fetch all indexed file names with retry logic to ensure consistency
        let retryCount = 0;
        const maxRetries = 3;
        let allPagesLoaded = false;
        
        while (!allPagesLoaded && retryCount < maxRetries) {
          // Reset for retry
          if (retryCount > 0) {
            console.log(`🔄 Retrying to fetch all indexed files (attempt ${retryCount + 1}/${maxRetries})...`);
            allFileNames.clear();
            page = 0;
            totalChunksChecked = 0;
            hasMore = true;
          }
          
          while (hasMore) {
            const { data: pageData, error: pageError } = await supabase
              .from('documents')
              .select('metadata->>fileName')
              .eq('metadata->>groupId', groupId)
              .not('metadata->>fileName', 'is', null)
              .order('id', { ascending: true }) // Add ordering for consistency
              .range(page * pageSize, (page + 1) * pageSize - 1);
          
            if (pageError) {
              console.warn(`⚠️ Error fetching page ${page}:`, pageError);
              // Don't break on error, try to continue or retry
              if (retryCount < maxRetries - 1) {
                retryCount++;
                break; // Break inner loop to retry
              } else {
                console.error(`❌ Failed to fetch all pages after ${maxRetries} attempts`);
                break;
              }
            }
            
            if (pageData && pageData.length > 0) {
              pageData.forEach((row: any) => {
                const fileName = row.fileName;
                if (fileName && typeof fileName === 'string') {
                  // Store raw fileName first, will normalize later
                  allFileNames.add(fileName);
                }
              });
              totalChunksChecked += pageData.length;
              hasMore = pageData.length === pageSize;
              page++;
              
              // Update progress
              if (onProgress && totalChunks > 0) {
                const percentage = Math.round((totalChunksChecked / totalChunks) * 100);
                onProgress(
                  Math.min(totalFiles, Math.round((totalChunksChecked / totalChunks) * totalFiles)),
                  totalFiles,
                  `Scanning chunks... ${percentage}% (${totalChunksChecked.toLocaleString()} / ${totalChunks.toLocaleString()} chunks)`
                );
              }
              
              if (page % 10 === 0) {
                console.log(`📄 Checked ${page} pages: ${totalChunksChecked} chunks, ${allFileNames.size} unique files`);
              }
            } else {
              hasMore = false;
            }
          }
          
          // Verify we got all chunks
          if (totalChunksChecked >= totalChunks || !hasMore) {
            allPagesLoaded = true;
            console.log(`✅ All pages loaded: ${totalChunksChecked} chunks checked, ${allFileNames.size} unique files found`);
          } else {
            retryCount++;
            if (retryCount < maxRetries) {
              console.warn(`⚠️ Incomplete data: expected ${totalChunks} chunks, got ${totalChunksChecked}. Retrying...`);
              // Small delay before retry
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        }
        
        console.log(`📊 Final: Checked ${totalChunksChecked} chunks, found ${allFileNames.size} unique indexed files (before normalization)`);
        
        if (onProgress) {
          onProgress(totalFiles, totalFiles, `Matching ${totalFiles} files with indexed chunks...`);
        }

      // Normalize file names for comparison (handle URL encoding, spaces, etc.)
      // IMPORTANT: This function must be identical to the one in fetchFileSummaries
      const normalizeFileName = (name: string): string => {
        try {
          // Try URL decoding first
          let decoded = decodeURIComponent(name);
          // If decoding didn't change anything, use the original
          if (decoded === name) {
            decoded = name;
          }
          // Normalize: lowercase, trim, replace multiple spaces with single space
          return decoded.toLowerCase().trim().replace(/\s+/g, ' ');
        } catch (e) {
          // If decoding fails, just normalize the original
          return name.toLowerCase().trim().replace(/\s+/g, ' ');
        }
      };
      
      // Normalize all indexed file names (ensure we have all before comparing)
      const normalizedIndexedNames = new Set<string>();
      const normalizationMap = new Map<string, string>(); // original -> normalized for debugging
      
      allFileNames.forEach(name => {
        const normalized = normalizeFileName(name);
        normalizedIndexedNames.add(normalized);
        normalizationMap.set(name, normalized);
      });
      
      console.log(`📋 After normalization: ${normalizedIndexedNames.size} unique indexed files (from ${allFileNames.size} raw names)`);
      console.log(`📋 Sample indexed names:`, Array.from(normalizedIndexedNames).slice(0, 5));

      // Count synced files for debugging
      let syncedCount = 0;
      let pendingCount = 0;
      
      // Update sync status for each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const normalizedFileName = normalizeFileName(file.name);
        
        // Update progress
        if (onProgress && ((i + 1) % 5 === 0 || i === files.length - 1)) {
          const percentage = Math.round(((i + 1) / files.length) * 100);
          onProgress(
            i + 1,
            files.length,
            `Checking sync status... ${percentage}% (${i + 1} / ${files.length} files)`
          );
        }
        
        // Check if normalized file name matches
        const isIndexed = normalizedIndexedNames.has(normalizedFileName);
        
        if (isIndexed) {
          file.syncStatus = 'synced';
          syncedCount++;
          
          // Update database record to mark as indexed
          const fileRecord = fileRecords?.find((fr: any) => fr.file_name === file.name);
          if (fileRecord && !fileRecord.is_indexed) {
            try {
              await supabase
                .from('files')
                .update({ 
                  is_indexed: true, 
                  indexed_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .eq('id', fileRecord.id);
            } catch (updateError) {
              console.warn('⚠️ Failed to update file record:', updateError);
            }
          }
        } else {
          file.syncStatus = 'pending';
          pendingCount++;
          
          // Debug: log mismatches to help identify the issue
          if (i < 10) { // Log first 10 mismatches
            const closeMatches = Array.from(normalizedIndexedNames).filter(indexedName => {
              const fileBase = normalizedFileName.replace(/\.[^.]+$/, '');
              const indexedBase = indexedName.replace(/\.[^.]+$/, '');
              return fileBase === indexedBase || 
                     fileBase.includes(indexedBase.substring(0, 20)) ||
                     indexedBase.includes(fileBase.substring(0, 20));
            });
            
            if (closeMatches.length > 0) {
              console.log(`⚠️ [FileLibrary] File mismatch (close matches found):`, {
                storage: file.name,
                normalized: normalizedFileName,
                closeMatches: closeMatches.slice(0, 3)
              });
            } else {
              console.log(`⚠️ [FileLibrary] File not indexed:`, {
                storage: file.name,
                normalized: normalizedFileName
              });
            }
          }
        }
      }
      
      console.log(`📊 [FileLibrary] Sync status summary: ${syncedCount} synced, ${pendingCount} pending out of ${files.length} total files`);
      } catch (syncError) {
        console.warn('⚠️ Error during sync status calculation:', syncError);
        for (let i = 0; i < files.length; i++) {
          files[i].syncStatus = 'error';
        }
      }
    }

    console.log(`✅ [fetchFilesFromSupabase] Successfully returning ${files.length} files`);
    return {
      success: true,
      files,
      total: files.length,
      message: files.length === 0 
        ? 'No files found. Upload files to get started.' 
        : `Found ${files.length} file(s)`,
    };

  } catch (error: any) {
    console.error('❌ [fetchFilesFromSupabase] Unexpected error:', error);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      files: [],
      total: 0,
      message: `Failed to fetch files: ${error.message || 'Unknown error'}. Check browser console for details.`,
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
    
    // Get group_id from URL to delete the correct database record
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();

    const filePath = `files/${fileName}`;

    // Delete from storage
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

    // Delete from database table if group_id is available
    if (groupId) {
      try {
        const { error: dbError } = await supabase
          .from('files')
          .delete()
          .eq('file_name', fileName)
          .eq('group_id', groupId);
        
        if (dbError) {
          console.warn('⚠️ Failed to delete file record from database:', dbError);
          // Don't fail if DB delete fails (file already deleted from storage)
        } else {
          console.log('✅ File record deleted from database');
        }
      } catch (dbErr) {
        console.warn('⚠️ Error deleting file record:', dbErr);
        // Don't fail if DB delete fails
      }
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
  // Docling supported formats: docx, pptx, html, image, pdf, asciidoc, md, csv, xlsx, xml, json_docling, vtt
  // Note: .txt is allowed but will be renamed to .md during upload (Docling doesn't support .txt)
  // Audio formats are NOT supported by Docling, so they are excluded
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac'];
  const fileName = file.name.toLowerCase();
  
  // Check if file is an audio format (block immediately)
  if (audioExtensions.some(ext => fileName.endsWith(ext))) {
    return {
      valid: false,
      error: '오디오 파일은 문서 변환이 지원되지 않습니다. 텍스트 기반 문서를 업로드하세요.'
    };
  }

  const allowedExtensions = [
    // Documents
    '.docx', '.pptx', '.html', '.pdf', '.asciidoc', '.adoc', '.md', '.txt', '.csv', '.xlsx', '.xml', '.json',
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp',
    // Video/Subtitle
    '.vtt'
  ];

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
 * Fetch file summaries (fileName + chunk count) without fetching all chunk content
 * This is much faster for initial load
 */
export interface FileSummary {
  fileName: string;
  chunkCount: number;
  firstChunkId?: number;
  firstChunkCreatedAt?: string;
  syncStatus?: 'synced' | 'orphaned';
}

export async function fetchFileSummaries(
  onProgress?: (current: number, total: number, status: string) => void
): Promise<{ success: boolean; files: FileSummary[]; total: number; message?: string }> {
  try {
    console.log(`📋 Fetching file summaries (fast mode)...`);
    const supabase = getSupabaseClient();
    
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return {
        success: false,
        files: [],
        total: 0,
        message: 'No group selected.',
      };
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>groupId', groupId);
    
    if (countError) {
      console.error('Error getting count:', countError);
      return { success: false, files: [], total: 0, message: countError.message };
    }

    // Fetch only metadata (no content) to get file summaries
    // Use retry logic to ensure we get all data consistently
    let allMetas: any[] = [];
    let retryCount = 0;
    const maxRetries = 3;
    let allPagesLoaded = false;
    let page = 0;
    let hasMore = true;
    const pageSize = 1000;
    
    // Get total count for progress tracking
    const totalCount = count || 0;
    
    if (onProgress) {
      onProgress(0, totalCount, 'Fetching document metadata...');
    }
    
    while (!allPagesLoaded && retryCount < maxRetries) {
      // Reset for retry
      if (retryCount > 0) {
        console.log(`🔄 [KnowledgeIndex] Retrying to fetch all metadata (attempt ${retryCount + 1}/${maxRetries})...`);
        allMetas = [];
        page = 0;
        hasMore = true;
      }
      
      while (hasMore) {
        const { data: pageData, error: pageError } = await supabase
          .from('documents')
          .select('id, metadata, created_at')
          .eq('metadata->>groupId', groupId)
          .order('id', { ascending: false }) // Consistent ordering
          .range(page * pageSize, (page + 1) * pageSize - 1);
        
        if (pageError) {
          console.error('Error fetching page:', pageError);
          if (retryCount < maxRetries - 1) {
            retryCount++;
            break; // Break inner loop to retry
          } else {
            console.error(`❌ [KnowledgeIndex] Failed to fetch all pages after ${maxRetries} attempts`);
            break;
          }
        }
        
        if (pageData && pageData.length > 0) {
          allMetas = [...allMetas, ...pageData];
          hasMore = pageData.length === pageSize;
          page++;
          
          // Update progress
          if (onProgress) {
            const percentage = totalCount > 0 ? Math.round((allMetas.length / totalCount) * 100) : 0;
            onProgress(allMetas.length, totalCount, `Processing metadata... ${percentage}%`);
          }
          
          // Log progress every 10 pages
          if (page % 10 === 0) {
            console.log(`📄 [KnowledgeIndex] Fetched ${page} pages: ${allMetas.length.toLocaleString()} / ${totalCount.toLocaleString()} metadata records (${Math.round((allMetas.length / totalCount) * 100)}%)`);
          }
        } else {
          hasMore = false;
        }
      }
      
      // Verify we got all chunks
      if (allMetas.length >= totalCount || !hasMore) {
        allPagesLoaded = true;
        console.log(`✅ [KnowledgeIndex] All pages loaded: ${allMetas.length.toLocaleString()} metadata records`);
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(`⚠️ [KnowledgeIndex] Incomplete data: expected ${totalCount} records, got ${allMetas.length}. Retrying...`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    if (onProgress) {
      onProgress(allMetas.length, totalCount, 'Grouping by file...');
    }
    
    console.log(`✅ Fetched ${allMetas.length.toLocaleString()} metadata records`);
    
    if (onProgress) {
      onProgress(allMetas.length, totalCount, 'Grouping by file...');
    }
    
    // Group by fileName and count chunks
    const fileMap = new Map<string, { count: number; firstChunkId?: number; firstChunkCreatedAt?: string }>();
    
    let processedCount = 0;
    for (const doc of allMetas) {
      processedCount++;
      if (onProgress && processedCount % 1000 === 0) {
        onProgress(allMetas.length, totalCount, `Grouping by file... ${processedCount.toLocaleString()} / ${allMetas.length.toLocaleString()}`);
      }
      const meta = doc.metadata || {};
      const fileName = meta.fileName || 'Unknown';
      
      if (!fileMap.has(fileName)) {
        fileMap.set(fileName, { 
          count: 0, 
          firstChunkId: doc.id,
          firstChunkCreatedAt: doc.created_at 
        });
      }
      
      const entry = fileMap.get(fileName)!;
      entry.count++;
      // Keep the first (most recent) chunk's ID and date
      if (!entry.firstChunkId || (doc.created_at && doc.created_at > (entry.firstChunkCreatedAt || ''))) {
        entry.firstChunkId = doc.id;
        entry.firstChunkCreatedAt = doc.created_at;
      }
    }
    
    if (onProgress) {
      onProgress(allMetas.length, totalCount, 'Checking sync status...');
    }
    
    // Get list of files from files table to check sync status (optimized - direct query)
    const { data: fileRecords, error: filesError } = await supabase
      .from('files')
      .select('file_name')
      .eq('group_id', groupId);
    
    // Normalize file names for comparison (handle URL encoding, spaces, etc.)
    const normalizeFileName = (name: string): string => {
      try {
        // Try URL decoding first
        let decoded = decodeURIComponent(name);
        // If decoding didn't change anything, try the original
        if (decoded === name) {
          decoded = name;
        }
        // Normalize: lowercase, trim, replace multiple spaces with single space
        return decoded.toLowerCase().trim().replace(/\s+/g, ' ');
      } catch (e) {
        // If decoding fails, just normalize the original
        return name.toLowerCase().trim().replace(/\s+/g, ' ');
      }
    };
    
    const fileNames = new Set<string>();
    const fileNamesOriginal = new Map<string, string>(); // normalized -> original
    
    if (!filesError && fileRecords) {
      fileRecords.forEach((fr: any) => {
        if (fr.file_name) {
          const normalized = normalizeFileName(fr.file_name);
          fileNames.add(normalized);
          // Store original for debugging
          if (!fileNamesOriginal.has(normalized)) {
            fileNamesOriginal.set(normalized, fr.file_name);
          }
        }
      });
    }
    
    console.log(`📋 [KnowledgeIndex] Found ${fileNames.size} files in storage for sync status check`);
    console.log(`📋 [KnowledgeIndex] Sample storage file names:`, Array.from(fileNames).slice(0, 5));
    
    // Count synced vs orphaned for debugging
    let syncedCount = 0;
    let orphanedCount = 0;
    
    // Convert to FileSummary array with improved matching
    const files: FileSummary[] = Array.from(fileMap.entries()).map(([fileName, data]) => {
      // Normalize the fileName from metadata
      const normalizedMetadataName = normalizeFileName(fileName);
      
      // Check if it matches
      const isSynced = fileNames.has(normalizedMetadataName);
      
      if (isSynced) {
        syncedCount++;
      } else {
        orphanedCount++;
        
        // Debug logging for mismatches
        // Try to find close matches
        const closeMatches = Array.from(fileNames).filter(storageName => {
          // Check if they're similar (same base name)
          const metaBase = normalizedMetadataName.replace(/\.[^.]+$/, '');
          const storageBase = storageName.replace(/\.[^.]+$/, '');
          return metaBase === storageBase || 
                 metaBase.includes(storageBase.substring(0, 20)) ||
                 storageBase.includes(metaBase.substring(0, 20));
        });
        
        if (closeMatches.length > 0) {
          console.log(`⚠️ [KnowledgeIndex] File name mismatch (close matches found):`, {
            metadata: fileName,
            normalized: normalizedMetadataName,
            closeMatches: closeMatches.slice(0, 3),
            storageOriginals: closeMatches.map(m => fileNamesOriginal.get(m)).filter(Boolean)
          });
        } else {
          console.log(`⚠️ [KnowledgeIndex] Orphaned file (no match in storage):`, {
            metadata: fileName,
            normalized: normalizedMetadataName
          });
        }
      }
      
      return {
        fileName,
        chunkCount: data.count,
        firstChunkId: data.firstChunkId,
        firstChunkCreatedAt: data.firstChunkCreatedAt,
        syncStatus: isSynced ? 'synced' : 'orphaned'
      };
    });
    
    console.log(`📊 [KnowledgeIndex] Found ${files.length} unique files with ${allMetas.length} total chunks`);
    console.log(`📊 [KnowledgeIndex] Sync status summary: ${syncedCount} synced, ${orphanedCount} orphaned`);
    
    return {
      success: true,
      files,
      total: count || 0,
      message: 'File summaries fetched successfully',
    };
  } catch (error: any) {
    console.error('Error fetching file summaries:', error);
    return {
      success: false,
      files: [],
      total: 0,
      message: error.message || 'Failed to fetch file summaries',
    };
  }
}

/**
 * Fetch chunks for a specific fileName (lazy loading when file is expanded)
 * @param fileName - The name of the file to fetch chunks for
 * @param limit - Maximum number of chunks to fetch (default: 10)
 * @param offset - Number of chunks to skip (default: 0)
 */
export async function fetchChunksForFile(
  fileName: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ success: boolean; documents: VectorDocument[]; total?: number; message?: string }> {
  try {
    console.log(`📄 Fetching chunks for file: ${fileName} (limit: ${limit}, offset: ${offset})`);
    const supabase = getSupabaseClient();
    
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return {
        success: false,
        documents: [],
        message: 'No group selected.',
      };
    }

    // Get total count for this file
    const { count, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>groupId', groupId)
      .eq('metadata->>fileName', fileName);
    
    if (countError) {
      console.error('Error getting chunk count:', countError);
    }

    // Fetch chunks for this specific file with pagination
    const { data, error } = await supabase
      .from('documents')
      .select('id, content, metadata, created_at')
      .eq('metadata->>groupId', groupId)
      .eq('metadata->>fileName', fileName)
      .order('id', { ascending: true })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('Error fetching chunks:', error);
      return {
        success: false,
        documents: [],
        message: error.message,
      };
    }
    
    const documents: VectorDocument[] = (data || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata || {},
      embedding: undefined,
    }));
    
    console.log(`✅ Fetched ${documents.length} chunks for ${fileName} (${offset + documents.length} / ${count || '?'} total)`);
    
    return {
      success: true,
      documents,
      total: count || undefined,
      message: 'Chunks fetched successfully',
    };
  } catch (error: any) {
    console.error('Error fetching chunks for file:', error);
    return {
      success: false,
      documents: [],
      message: error.message || 'Failed to fetch chunks',
    };
  }
}

/**
 * Fetch all documents from Supabase documents table, filtered by groupId
 * Note: This function now fetches ALL documents for the group (not paginated) to ensure we get all unique files
 * @deprecated Use fetchFileSummaries() + fetchChunksForFile() for better performance
 */
export async function fetchVectorDocuments(limit: number = 50, offset: number = 0): Promise<{ success: boolean; documents: VectorDocument[]; total: number; message?: string }> {
  try {
    console.log(`Fetching vector documents from Supabase (limit: ${limit}, offset: ${offset})...`);
    const supabase = getSupabaseClient();
    
    // Get group_id from URL
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      console.warn('⚠️ No group_id in URL, cannot fetch group-specific documents');
      return {
        success: false,
        documents: [],
        total: 0,
        message: 'No group selected. Please select a group first.',
      };
    }

    // First, get the total count for this group
    const { count, error: countError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('metadata->>groupId', groupId);
    
    if (countError) {
      console.error('Error getting count:', countError);
      return {
        success: false,
        documents: [],
        total: 0,
        message: countError.message,
      };
    }

    // Fetch ALL documents for this group (not paginated) to ensure we get all unique files
    // We'll handle pagination in the UI by grouping by fileName
    let allData: any[] = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000; // Fetch in batches of 1000
    
    while (hasMore) {
      const { data: pageData, error: pageError } = await supabase
        .from('documents')
        .select('id, content, metadata, created_at')
        .eq('metadata->>groupId', groupId)
        .order('id', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      
      if (pageError) {
        console.error('Error fetching page:', pageError);
        break;
      }
      
      if (pageData && pageData.length > 0) {
        allData = [...allData, ...pageData];
        hasMore = pageData.length === pageSize;
        page++;
        console.log(`📄 Fetched page ${page}: ${pageData.length} documents (total so far: ${allData.length})`);
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Fetched ${allData.length} total documents for groupId: ${groupId}`);
    
    // Extract unique fileNames to verify we're getting all files
    const uniqueFileNames = [...new Set(allData.map(d => {
      const meta = d.metadata || {};
      return meta.fileName || 'Unknown';
    }).filter(f => f !== 'Unknown'))];
    console.log(`📋 Found ${uniqueFileNames.length} unique files:`, uniqueFileNames);
    
    // Group by fileName to show distribution
    const fileDistribution = allData.reduce((acc, d) => {
      const meta = d.metadata || {};
      const fileName = meta.fileName || 'Unknown';
      acc[fileName] = (acc[fileName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 Documents per file:`, fileDistribution);
    
    // If limit is >= 10000, treat it as "fetch all" and return all documents
    // Otherwise, apply pagination for backward compatibility
    const shouldReturnAll = limit >= 10000;
    const paginatedData = shouldReturnAll ? allData : allData.slice(offset, offset + limit);
    
    console.log(`📦 Returning ${paginatedData.length} documents (${shouldReturnAll ? 'all' : `paginated: offset=${offset}, limit=${limit}`})`);
    
    return {
      success: true,
      documents: paginatedData || [],
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
export async function indexFileToVector(fileName: string): Promise<{ success: boolean; message: string; workflowId?: string; estimatedTime?: string }> {
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
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://qpyteahuynkgkbmdasbv.supabase.co';
      
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

    // Send to n8n webhook - UNIVERSAL ENDPOINT (hardcoded)
    // Get current user for group context
    const { getSession } = await import('./auth');
    const session = getSession();
    
    // Hardcoded universal endpoint for document indexing (same for all users)
    const INDEXING_WEBHOOK_URL = 'https://n8n.srv1153481.hstgr.cloud/webhook/30de76ac-a5bf-41a4-a151-ee9f8ec5c19a';
    const n8nWebhookUrl = INDEXING_WEBHOOK_URL;
    
    console.log(`🔧 Webhook mode: UNIVERSAL (hardcoded)`);
    console.log(`🌐 Using webhook: ${n8nWebhookUrl}`);
    console.log(`👤 User: ${session?.email || 'Unknown'} (${session?.userId || 'Unknown'})`);

    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupIdFromSession = getGroupIdFromUrl();
    
    // Fetch group data to get chunking options
    let chunkingOptions: { chunk_size: number; chunk_overlap: number } | undefined;
    if (groupIdFromSession) {
      try {
        const { defaultSupabase } = await import('./groupService');
        const { data: groupData, error: groupError } = await defaultSupabase
          .from('group')
          .select('chunk_size, chunk_overlap')
          .eq('group_id', groupIdFromSession)
          .single();
        
        if (!groupError && groupData) {
          const chunkSize = groupData.chunk_size;
          const chunkOverlap = groupData.chunk_overlap;
          
          if (chunkSize !== null && chunkSize !== undefined && chunkOverlap !== null && chunkOverlap !== undefined) {
            chunkingOptions = {
              chunk_size: Number(chunkSize),
              chunk_overlap: Number(chunkOverlap)
            };
            console.log(`📊 Using chunking options from group:`, chunkingOptions);
          } else {
            console.warn(`⚠️ Group ${groupIdFromSession} has missing chunk_size or chunk_overlap values`);
          }
        } else {
          console.warn(`⚠️ Failed to fetch group data for ${groupIdFromSession}:`, groupError);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching group chunking options:`, error);
      }
    }
    
    // Map file extension to Docling format
    // Note: json_docling is the Docling API format name for .json files
    const getDoclingFormat = (fileName: string): string => {
      const ext = fileName.toLowerCase().split('.').pop() || '';
      const formatMap: Record<string, string> = {
        // Documents
        'pdf': 'pdf',
        'docx': 'docx',
        'pptx': 'pptx',
        'html': 'html',
        'htm': 'html',
        'md': 'md',
        'json': 'json_docling',  // .json files → json_docling format
        'csv': 'csv',
        'xlsx': 'xlsx',
        'xml': 'xml_uspto',  // Default XML type, can be xml_jats or mets_gbs based on content
        'asciidoc': 'asciidoc',
        'adoc': 'asciidoc',
        // Images
        'png': 'image',
        'jpg': 'image',
        'jpeg': 'image',
        'gif': 'image',
        'bmp': 'image',
        'tiff': 'image',
        'webp': 'image',
        // Audio
        'mp3': 'audio',
        'wav': 'audio',
        'ogg': 'audio',
        'm4a': 'audio',
        'flac': 'audio',
        // Video/Subtitle
        'vtt': 'vtt',
      };
      return formatMap[ext] || 'pdf'; // Default to pdf if unknown
    };
    
    const detectedFormat = getDoclingFormat(fileName);
    console.log(`📄 Detected file format: ${detectedFormat} for ${fileName}`);
    
    const payload: any = {
      fileUrl: fullFileUrl,
      fileName: fileName,
      source: 'supabase-storage',
      groupId: groupIdFromSession,
    };
    
    // Load Docling options from group if available
    let doclingOptions: any = null;
    if (groupIdFromSession) {
      try {
        const { defaultSupabase } = await import('./groupService');
        const { data: groupData, error: groupError } = await defaultSupabase
          .from('group')
          .select('docling_options')
          .eq('group_id', groupIdFromSession)
          .single();
        
        if (!groupError && groupData?.docling_options) {
          try {
            doclingOptions = typeof groupData.docling_options === 'string'
              ? JSON.parse(groupData.docling_options)
              : groupData.docling_options;
            console.log(`📊 Loaded Docling options from group:`, doclingOptions);
          } catch (e) {
            console.warn(`⚠️ Failed to parse docling_options:`, e);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching Docling options:`, error);
      }
    }
    
    // Build parser_options: start with detected format, then merge enabled options
    const parserOptions: any = {
      from_formats: [detectedFormat]
    };
    
    // Merge enabled Docling options
    if (doclingOptions) {
      // OCR Options
      if (doclingOptions.do_ocr_enabled) {
        parserOptions.do_ocr = doclingOptions.do_ocr;
        if (doclingOptions.ocr_engine_enabled) {
          parserOptions.ocr_engine = doclingOptions.ocr_engine;
        }
        if (doclingOptions.ocr_lang_enabled && doclingOptions.ocr_lang) {
          parserOptions.ocr_lang = doclingOptions.ocr_lang.split(',').map((lang: string) => lang.trim()).filter(Boolean);
        }
        if (doclingOptions.force_ocr_enabled) {
          parserOptions.force_ocr = doclingOptions.force_ocr;
        }
      }
      
      // PDF Options
      if (doclingOptions.pdf_backend_enabled) {
        parserOptions.pdf_backend = doclingOptions.pdf_backend;
      }
      if (doclingOptions.pipeline_enabled) {
        parserOptions.pipeline = doclingOptions.pipeline;
      }
      
      // Table Options
      if (doclingOptions.table_mode_enabled) {
        parserOptions.table_mode = doclingOptions.table_mode;
      }
      if (doclingOptions.table_cell_matching_enabled) {
        parserOptions.table_cell_matching = doclingOptions.table_cell_matching;
      }
      if (doclingOptions.do_table_structure_enabled) {
        parserOptions.do_table_structure = doclingOptions.do_table_structure;
      }
      
      // Image Options
      if (doclingOptions.include_images_enabled) {
        parserOptions.include_images = doclingOptions.include_images;
      }
      if (doclingOptions.images_scale_enabled && doclingOptions.images_scale) {
        parserOptions.images_scale = parseFloat(doclingOptions.images_scale) || 2.0;
      }
      if (doclingOptions.image_export_mode_enabled) {
        parserOptions.image_export_mode = doclingOptions.image_export_mode;
      }
      
      // Page Range
      if (doclingOptions.page_range_enabled) {
        const start = parseInt(doclingOptions.page_range_start) || 1;
        const end = parseInt(doclingOptions.page_range_end) || 999999999;
        parserOptions.page_range = [start, end];
      }
      
      // Timeout
      if (doclingOptions.document_timeout_enabled && doclingOptions.document_timeout) {
        parserOptions.document_timeout = parseInt(doclingOptions.document_timeout) || 600;
      }
      if (doclingOptions.abort_on_error_enabled) {
        parserOptions.abort_on_error = doclingOptions.abort_on_error;
      }
      
      // Markdown
      if (doclingOptions.md_page_break_placeholder_enabled) {
        parserOptions.md_page_break_placeholder = doclingOptions.md_page_break_placeholder || '';
      }
      
      // Advanced Options
      if (doclingOptions.do_code_enrichment_enabled) {
        parserOptions.do_code_enrichment = doclingOptions.do_code_enrichment;
      }
      if (doclingOptions.do_formula_enrichment_enabled) {
        parserOptions.do_formula_enrichment = doclingOptions.do_formula_enrichment;
      }
      if (doclingOptions.do_picture_classification_enabled) {
        parserOptions.do_picture_classification = doclingOptions.do_picture_classification;
      }
      if (doclingOptions.do_picture_description_enabled) {
        parserOptions.do_picture_description = doclingOptions.do_picture_description;
      }
    }
    
    payload.parser_options = parserOptions;
    
    // Add chunking_options if available
    if (chunkingOptions) {
      payload.chunking_options = chunkingOptions;
    }

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
        ...(workflowId && { workflowId }),
        ...(estimatedTime && { estimatedTime })
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
            message: `File sent for indexing (CORS bypassed). Processing time: 30-60 seconds`
          };
        } else {
          console.warn(`⚠️ Unexpected status in no-cors mode: ${fetchResponse.status}`);
          return {
            success: true,
            message: `File sent for indexing (CORS bypassed, status: ${fetchResponse.status}). Processing time: 30-60 seconds`
          };
        }
      } catch (fetchError: any) {
        console.error('❌ Both axios and fetch failed:', fetchError);
        
        // Check if it's a 404 error
        if (fetchError?.message?.includes('404') || fetchError?.message?.includes('ERR_ABORTED')) {
          return {
            success: false,
            message: `Webhook URL not found (404). Please check if the webhook is active: ${n8nWebhookUrl}`,
          };
        }
        
        throw fetchError;
      }
    }

  } catch (error: unknown) {
    const msg = (error instanceof Error) ? error.message : 'Failed to index file';
    console.error('Error indexing file:', error);
    return {
      success: false,
      message: msg,
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
    
    // Get group_id from URL
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return {
        success: false,
        message: 'No group selected',
        status: 'failed'
      };
    }
    
    // Check if chunks exist for this file, filtered by groupId
    const { data: chunks, error } = await supabase
      .from('documents')
      .select('id, created_at, metadata')
      .ilike('metadata->>fileName', fileName)
      .eq('metadata->>groupId', groupId) // Filter by groupId
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
    
    // Get group_id from URL
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return {
        success: false,
        message: 'No group selected. Please select a group first.',
        deletedCount: 0
      };
    }
    
    console.log(`🗑️ Direct Supabase deletion for filename: "${fileName}" (group: ${groupId})`);
    console.log(`🔍 Filename length: ${fileName.length}`);
    console.log(`🔍 Filename characters: ${fileName.split('').map(c => c.charCodeAt(0)).join(',')}`);
    
    // Try multiple query approaches to handle different filename formats, all filtered by groupId
    let records: any[] = [];
    let recordCount = 0;
    
    // Approach 1: Exact match
    console.log('🔍 Trying exact match...');
    let { data: exactRecords, error: exactError } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('metadata->>fileName', fileName)
      .eq('metadata->>groupId', groupId); // Filter by groupId
    
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
        .ilike('metadata->>fileName', fileName)
        .eq('metadata->>groupId', groupId); // Filter by groupId
      
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
          .ilike('metadata->>fileName', `%${fileName}%`)
          .eq('metadata->>groupId', groupId); // Filter by groupId
        
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
    
    // Delete the records using the same query that found them, filtered by groupId
    let deleteQuery = supabase.from('documents').delete();
    
    // Use the same query approach that worked for finding records
    if (records.length > 0) {
      const recordIds = records.map(r => r.id);
      deleteQuery = deleteQuery.in('id', recordIds);
    } else {
      // Fallback to ilike with groupId filter
      deleteQuery = deleteQuery
        .ilike('metadata->>fileName', fileName)
        .eq('metadata->>groupId', groupId);
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
    
    // Get group_id from URL
    const { getSession } = await import('./auth');
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const session = getSession();
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return {
        success: false,
        syncStatus: 'error',
        message: 'No group selected. Please select a group first.'
      };
    }
    
    console.log(`🔍 Checking sync status for: ${fileName} (group: ${groupId})`);
    
    // Check if file is indexed in documents table, filtered by groupId
    const { data: indexedDocs, error: indexError } = await supabase
      .from('documents')
      .select('id, metadata')
      .ilike('metadata->>fileName', fileName)
      .eq('metadata->>groupId', groupId); // Filter by groupId
    
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
