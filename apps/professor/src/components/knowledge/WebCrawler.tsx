import React, { useState } from 'react';
import { useTranslation } from '../../i18n/I18nProvider';
import { useTheme } from '../../theme/ThemeProvider';
import { getSession } from '../../services/auth';
import { getUserRoleForGroup } from '../../services/auth';
import { getGroupIdFromUrl } from '../../utils/navigation';
import { uploadFilesToSupabase, indexFileToVector } from '../../services/ragManagement';
import { IconChevronDown, IconChevronUp } from '../../ui/icons';

interface CrawledFile {
  fileName: string;
  content: string;
  url: string;
  openaiFileId?: string | null; // OpenAI file ID after upload
  filePath?: string; // Supabase storage path
  dbFileName?: string; // Actual file name in database (may differ due to unique naming)
}

const WebCrawler: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [urls, setUrls] = useState<string[]>(['']);
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawledFiles, setCrawledFiles] = useState<CrawledFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<CrawledFile | null>(null);
  const [isIndexing, setIsIndexing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInputSectionCollapsed, setIsInputSectionCollapsed] = useState(false);

  // Check if user is admin
  React.useEffect(() => {
    const checkAdmin = async () => {
      const session = getSession();
      if (!session) return;
      
      const groupId = getGroupIdFromUrl();
      if (!groupId) return;
      
      try {
        const role = await getUserRoleForGroup(groupId);
        setIsAdmin(role === 'admin');
      } catch (error) {
      }
    };
    checkAdmin();
  }, []);

  const handleAddUrl = () => {
    setUrls([...urls, '']);
  };

  const handleRemoveUrl = (index: number) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const handleUrlChange = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleCrawl = async () => {
    // Filter out empty URLs
    const urlList = urls
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) {
      setError('Please enter at least one valid URL');
      return;
    }

    setIsCrawling(true);
    setError(null);
    setCrawledFiles([]);
    setSelectedFile(null);

    try {
      // Create comma-separated string from URLs
      const urlsString = urlList.join(',');
      
      // Make GET request to web crawler API through proxy
      const apiUrl = `/api/web-crawler/run-crawl?urls=${encodeURIComponent(urlsString)}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but received ${contentType}`);
      }

      const responseData = await response.json();
      
      // Validate response structure
      if (!responseData || responseData.status !== 'success' || !Array.isArray(responseData.data)) {
        throw new Error('Invalid response format from crawler - expected success status with data array');
      }

      const transformedFiles: CrawledFile[] = [];
      
      // Process each file: upload to Supabase and OpenAI
      for (let index = 0; index < responseData.data.length; index++) {
        const item = responseData.data[index];
        
        // Generate fileName from URL
        // Format: domain_path-segments.txt
        // Root URL (/) → domain_home.txt
        // Single path (/about) → domain_about.txt
        // Multiple paths (/job-postings/sales-director) → domain_job-postings_sales-director.txt
        let fileName = '';
        try {
          const urlObj = new URL(item.url);
          // Extract domain without www
          const domain = urlObj.hostname.replace(/^www\./, '');
          
          // Extract pathname and filter out empty parts
          const pathParts = urlObj.pathname.split('/').filter(p => p);
          
          if (pathParts.length === 0) {
            // Root URL - use "home"
            fileName = `${domain}_home.txt`;
          } else {
            // Join path parts with underscores
            const pathSegment = pathParts.join('_');
            fileName = `${domain}_${pathSegment}.txt`;
          }
        } catch {
          // Fallback if URL parsing fails
          fileName = `crawled_file_${index + 1}.txt`;
        }
        
        // Convert content to File object and upload to Supabase and OpenAI
        try {
          const fileBlob = new Blob([item.content], { type: 'text/plain' });
          const fileObj = new File([fileBlob], fileName, { type: 'text/plain' });
          
          // Upload to Supabase and OpenAI
          const uploadResults = await uploadFilesToSupabase([fileObj]);
          
          if (uploadResults.length > 0 && uploadResults[0].success) {
            // Get the uploaded file info from database
            const { getSupabaseClient } = await import('../../services/supabaseUserSpecific');
            const supabase = getSupabaseClient();
            const groupId = getGroupIdFromUrl();
            const session = getSession();
            
            if (groupId && session) {
              // Find the file that was just uploaded
              // Get the actual uploaded filename from the upload result
              const uploadedFileName = uploadResults[0].fileName || fileName;
              const baseFileName = uploadedFileName.replace(/\.(txt|md)$/i, '').replace(/\s*\(\d+\)$/, '');
              
              const { data: uploadedFiles, error: queryError } = await supabase
                .from('files')
                .select('file_name, openai_file_id, file_path')
                .eq('group_id', groupId)
                .eq('user_id', session.userId)
                .order('created_at', { ascending: false })
                .limit(20);
              
              if (uploadedFiles && uploadedFiles.length > 0) {
                // Find matching file - try exact match first, then base name match
                let uploadedFile = uploadedFiles.find(f => 
                  f.file_name.toLowerCase() === uploadedFileName.toLowerCase()
                );
                
                if (!uploadedFile) {
                  // Try base name match (without extension and duplicate suffix)
                  uploadedFile = uploadedFiles.find(f => {
                    const dbBaseName = f.file_name.replace(/\.(txt|md)$/i, '').replace(/\s*\(\d+\)$/, '');
                    return dbBaseName.toLowerCase() === baseFileName.toLowerCase();
                  });
                }
                
                // Fallback to most recent if still not found
                if (!uploadedFile) {
                  uploadedFile = uploadedFiles[0];
                }
                
                transformedFiles.push({
                  fileName: fileName,
                  content: item.content,
                  url: item.url,
                  openaiFileId: uploadedFile.openai_file_id,
                  filePath: uploadedFile.file_path,
                  dbFileName: uploadedFile.file_name
                });
              } else {
                // If database query fails, still add file but without IDs
                transformedFiles.push({
                  fileName: fileName,
                  content: item.content,
                  url: item.url
                });
              }
            } else {
              // If no group/session, still add file but without IDs
              transformedFiles.push({
                fileName: fileName,
                content: item.content,
                url: item.url
              });
            }
          } else {
            // Upload failed, but still add to list for user to see
            transformedFiles.push({
              fileName: fileName,
              content: item.content,
              url: item.url
            });
          }
        } catch (uploadError) {
          // Still add file to list even if upload fails
          transformedFiles.push({
            fileName: fileName,
            content: item.content,
            url: item.url
          });
        }
      }
      
      setCrawledFiles(transformedFiles);
      if (transformedFiles.length > 0) {
        setSelectedFile(transformedFiles[0]);
        setIsInputSectionCollapsed(true); // Collapse input section when files are shown
      }
    } catch (err: any) {
      setError(err.message || 'Failed to crawl URLs. Please check the console for details.');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleIndexFile = async (file: CrawledFile) => {
    if (!isAdmin) {
      setError('Only administrators can index files');
      return;
    }

    setIsIndexing(file.fileName);
    setError(null);

    try {
      // File should already be uploaded during crawl, so use the dbFileName if available
      const fileNameToIndex = file.dbFileName || file.fileName;
      
      if (!file.dbFileName && !file.openaiFileId) {
        // File wasn't uploaded during crawl, upload it now
        const fileBlob = new Blob([file.content], { type: 'text/plain' });
        const fileObj = new File([fileBlob], file.fileName, { type: 'text/plain' });

        const uploadResults = await uploadFilesToSupabase([fileObj]);
        
        if (uploadResults.length === 0 || !uploadResults[0].success) {
          throw new Error(uploadResults[0]?.error || 'Failed to upload file');
        }

        // Get the actual file name from the upload result
        const { getSupabaseClient } = await import('../../services/supabaseUserSpecific');
        const supabase = getSupabaseClient();
        const groupId = getGroupIdFromUrl();
        const session = getSession();
        
        if (!groupId || !session) {
          throw new Error('Group ID or session not found');
        }

        const baseFileName = file.fileName.replace(/\.(txt|md)$/i, '');
        const { data: uploadedFiles } = await supabase
          .from('files')
          .select('file_name, openai_file_id, file_path')
          .eq('group_id', groupId)
          .eq('user_id', session.userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!uploadedFiles || uploadedFiles.length === 0) {
          throw new Error('Failed to find uploaded file in database');
        }

        const uploadedFile = uploadedFiles.find(f => {
          const dbBaseName = f.file_name.replace(/\.(txt|md)$/i, '').replace(/\s*\(\d+\)$/, '');
          return dbBaseName.toLowerCase() === baseFileName.toLowerCase();
        }) || uploadedFiles[0];

        // Update the file object with the database info
        file.dbFileName = uploadedFile.file_name;
        file.openaiFileId = uploadedFile.openai_file_id;
        file.filePath = uploadedFile.file_path;
      }

      // Index the file to vector store
      const indexResult = await indexFileToVector(fileNameToIndex);
      
      if (!indexResult.success) {
        throw new Error(indexResult.message || 'Failed to index file');
      }

      // Remove file from crawled files list after successful indexing
      setCrawledFiles(prev => prev.filter(f => f.fileName !== file.fileName));
      if (selectedFile?.fileName === file.fileName) {
        setSelectedFile(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to index file');
    } finally {
      setIsIndexing(null);
    }
  };

  const handleIndexAll = async () => {
    if (!isAdmin) {
      setError('Only administrators can index files');
      return;
    }

    if (crawledFiles.length === 0) {
      setError('No files to index');
      return;
    }

    for (const file of crawledFiles) {
      await handleIndexFile(file);
    }
  };

  const handleDeleteFile = async (file: CrawledFile, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent file selection when clicking delete
    
    // If file was uploaded to Supabase/OpenAI, delete it
    if (file.dbFileName || file.openaiFileId) {
      try {
        const { deleteFileFromSupabase } = await import('../../services/ragManagement');
        const fileNameToDelete = file.dbFileName || file.fileName;
        const deleteResult = await deleteFileFromSupabase(fileNameToDelete);
        
        if (!deleteResult.success) {
          setError(`Failed to delete file: ${deleteResult.message}`);
          return;
        }
      } catch (deleteError) {
        setError('Failed to delete file from Supabase/OpenAI');
        return;
      }
    }
    
    // Remove file from crawled files list
    setCrawledFiles(prev => prev.filter(f => f.fileName !== file.fileName));
    
    // Clear selected file if it's the one being deleted
    if (selectedFile?.fileName === file.fileName) {
      const remainingFiles = crawledFiles.filter(f => f.fileName !== file.fileName);
      setSelectedFile(remainingFiles.length > 0 ? remainingFiles[0] : null);
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Web Crawler is only available to administrators.</p>
      </div>
    );
  }

  return (
    <div className="web-crawler">
      <div className="wc-header">
        <h2 className="wc-title">Web Crawler</h2>
        <p className="wc-description">
          Enter one or more URLs to crawl and generate text files for indexing.
        </p>
      </div>

      <div className="wc-input-section">
        <div 
          className="wc-input-header"
          onClick={() => setIsInputSectionCollapsed(!isInputSectionCollapsed)}
        >
          <h3 className="wc-input-header-title">Crawl URLs</h3>
          {isInputSectionCollapsed ? (
            <IconChevronDown className="wc-input-header-icon" />
          ) : (
            <IconChevronUp className="wc-input-header-icon" />
          )}
        </div>
        
        {!isInputSectionCollapsed && (
          <div className="wc-input-content">
            <label className="wc-input-label">
              URLs
            </label>
            {urls.map((url, index) => (
              <div key={index} className="wc-url-input-row">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => handleUrlChange(index, e.target.value)}
                  placeholder="https://example.com/page"
                  className="wc-url-input"
                  disabled={isCrawling}
                />
                {urls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUrl(index)}
                    className="wc-remove-url-btn"
                    disabled={isCrawling}
                    title="Remove URL"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
            
            <div className="wc-buttons-row">
              <button
                type="button"
                onClick={handleAddUrl}
                disabled={isCrawling}
                className="wc-add-url-btn"
              >
                + Add URL
              </button>

              <button
                onClick={handleCrawl}
                disabled={isCrawling}
                className="wc-crawl-btn"
              >
                {isCrawling && <span className="wc-crawl-spinner"></span>}
                {isCrawling ? 'Crawling...' : 'Crawl'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="wc-error">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Display */}
      {crawledFiles.length > 0 && (
        <div className="wc-files-section">
          <div className="wc-files-header">
            <h3 className="wc-files-title">
              Crawled Files ({crawledFiles.length})
            </h3>
            <button
              onClick={handleIndexAll}
              disabled={isIndexing !== null || crawledFiles.length === 0}
              className="wc-index-all-btn"
            >
              {isIndexing !== null ? 'Indexing...' : 'Index All'}
            </button>
          </div>

          <div className="wc-files-layout">
            {/* File List */}
            <div className="wc-file-list">
              {crawledFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedFile(file)}
                  className={`wc-file-item ${selectedFile?.fileName === file.fileName ? 'selected' : ''}`}
                >
                  <div className="wc-file-item-content">
                    <div className="wc-file-item-name">
                      {file.fileName}
                    </div>
                    <div className="wc-file-item-url">
                      {file.url}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFile(file, e)}
                    className="wc-file-delete-btn"
                    title="Delete file"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* File Editor */}
            {selectedFile && (
              <div className="wc-file-editor">
                <div className="wc-editor-header">
                  <div>
                    <div className="wc-editor-title">
                      {selectedFile.fileName}
                    </div>
                    <div className="wc-editor-url">
                      {selectedFile.url}
                    </div>
                  </div>
                  <button
                    onClick={() => handleIndexFile(selectedFile)}
                    disabled={isIndexing === selectedFile.fileName}
                    className="wc-index-btn"
                  >
                    {isIndexing === selectedFile.fileName ? 'Indexing...' : 'Index'}
                  </button>
                </div>
                <div className="wc-editor-content">
                  {selectedFile.content || '(No content)'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebCrawler;
