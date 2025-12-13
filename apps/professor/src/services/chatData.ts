import { getSupabaseClient } from './supabaseUserSpecific';
import type { ChatData, SessionData } from './supabaseUserSpecific';
import { getSession } from './auth';

/**
 * Fetch all chat data ordered by most recent first, filtered by group_id
 */
export async function fetchAllChatData(limit: number = 100): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      console.warn('No group_id in URL, cannot fetch group-specific chat data');
      return [];
    }
    
    console.log('Fetching chat data from Supabase for group_id:', groupId);
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} chat records for group_id: ${groupId}`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat data:', error);
    throw error;
  }
}

/**
 * Fetch chat data for a specific session, filtered by group_id
 */
export async function fetchChatDataBySession(sessionId: string): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      console.warn('No group_id in URL, cannot fetch group-specific chat data');
      return [];
    }
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat data by session:', error);
    throw error;
  }
}

/**
 * Fetch chat data by date range, filtered by group_id
 */
export async function fetchChatDataByDateRange(startDate: string, endDate: string): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      console.warn('No group_id in URL, cannot fetch group-specific chat data');
      return [];
    }
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('group_id', groupId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat data by date range:', error);
    throw error;
  }
}

/**
 * Get chat data for a specific request
 */
export async function getChatData(requestId: string): Promise<ChatData | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching chat data:', error);
    throw error;
  }
}

/**
 * Fetch chat data by ID (for linking with feedback)
 * Matches against the chat_id column, not the id column
 */
export async function fetchChatById(chatId: string): Promise<ChatData | null> {
  try {
    const supabase = getSupabaseClient();
    
    console.log(`Looking for chat with chat_id: ${chatId}`);
    
    // Match against the chat_id column (string), not the id column (numeric)
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching chat data:', error);
    throw error;
  }
}

/**
 * Fetch sessions from Supabase filtered by group_id
 */
export async function fetchSessionsByGroup(groupId: string): Promise<SessionData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log(`Fetching sessions for group_id: ${groupId}`);
    
    // Only select columns that definitely exist
    const { data, error } = await supabase
      .from('session')
      .select('session_id, group_id, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array (sessions are created by backend)
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.warn('Session table does not exist or has schema issues (this is okay - sessions are created by backend)');
        return [];
      }
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} sessions for group_id: ${groupId}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    // Return empty array instead of throwing - sessions are created by backend
    return [];
  }
}

/**
 * Fetch a single session by session_id and group_id
 * Returns null if session table doesn't exist (sessions are created by backend)
 */
export async function fetchSessionById(sessionId: string, groupId: string): Promise<SessionData | null> {
  try {
    const supabase = getSupabaseClient();
    
    // Only select columns that definitely exist
    const { data, error } = await supabase
      .from('session')
      .select('session_id, group_id, created_at')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) {
      // If table doesn't exist, return null (sessions are created by backend)
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return null;
      }
      console.error('Supabase error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

/**
 * Fetch chat messages for a session, converted to ChatMessage format
 */
export async function fetchChatMessagesForSession(sessionId: string, groupId: string): Promise<any[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat messages: ${error.message}`);
    }
    
    // Log raw data for debugging
    if (data && data.length > 0) {
      console.log('📊 Raw chat data from database:', data.map(chat => ({
        chat_id: chat.chat_id,
        has_response: !!chat.response,
        response_type: typeof chat.response,
        response_value: chat.response, // Show full value to see if it's actually "undefined" string
        response_is_undefined_string: chat.response === 'undefined',
        response_length: typeof chat.response === 'string' ? chat.response.length : 'N/A',
        chat_message: chat.chat_message?.substring(0, 50),
        created_at: chat.created_at,
        all_keys: Object.keys(chat) // Show all available fields
      })));
    }

    // Convert ChatData to ChatMessage format
    const messages: any[] = [];
    if (data) {
      console.log(`📥 Fetched ${data.length} chat records from database`);
      for (const chat of data) {
        // Log raw data for debugging - show ALL fields
        console.log(`🔍 Processing chat ${chat.chat_id}:`, {
          chat_id: chat.chat_id,
          has_response: !!chat.response,
          response_type: typeof chat.response,
          response_value: chat.response,
          response_length: chat.response?.length,
          chat_message: chat.chat_message,
          created_at: chat.created_at,
          ALL_FIELDS: chat  // Show all fields to see what's actually in the database
        });
        
        // Safely extract and parse content
        // Try multiple possible field names for response
        let userContent = chat.chat_message;
        let assistantContent = chat.response || (chat as any).answer || (chat as any).output_text || (chat as any).outputText;
        
        // Early filter: if response is the string "undefined" or "null", treat it as empty
        if (assistantContent === 'undefined' || assistantContent === 'null' || 
            (typeof assistantContent === 'string' && assistantContent.trim() === 'undefined') ||
            (typeof assistantContent === 'string' && assistantContent.trim() === 'null')) {
          console.warn(`⚠️ Chat ${chat.chat_id} has invalid response (string "undefined"/"null"):`, {
            chat_id: chat.chat_id,
            response: assistantContent,
            responseType: typeof assistantContent,
            chat_message: userContent,
            all_chat_keys: Object.keys(chat)
          });
          assistantContent = null; // Set to null so it will be filtered out later
        }
        
        // Debug logging for troubleshooting
        if (!assistantContent) {
          console.warn(`⚠️ Chat ${chat.chat_id} has no valid response:`, {
            chat_id: chat.chat_id,
            original_response: chat.response,
            responseType: typeof chat.response,
            chat_message: userContent,
            all_chat_keys: Object.keys(chat)
          });
        }
        
        // Handle different response formats
        if (assistantContent !== null && assistantContent !== undefined) {
          const originalContent = assistantContent;
          
          // If response is already an object (shouldn't happen but handle it)
          if (typeof assistantContent === 'object' && assistantContent !== null) {
            console.log(`📦 Response is object for ${chat.chat_id}:`, assistantContent);
            assistantContent = assistantContent.answer || assistantContent.content || assistantContent.response || JSON.stringify(assistantContent);
          }
          // If response is a JSON string
          else if (typeof assistantContent === 'string') {
            const trimmed = assistantContent.trim();
            // Try to parse if it looks like JSON
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const parsed = JSON.parse(assistantContent);
                console.log(`📦 Parsed JSON response for ${chat.chat_id}:`, parsed);
                // If parsed is an object with an 'answer' or 'content' field, use that
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  assistantContent = parsed.answer || parsed.content || parsed.response || assistantContent;
                  console.log(`✅ Extracted content from JSON object:`, assistantContent?.substring(0, 100));
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                  // Handle array responses (take first element)
                  const first = parsed[0];
                  assistantContent = first?.answer || first?.content || first?.response || assistantContent;
                  console.log(`✅ Extracted content from JSON array:`, assistantContent?.substring(0, 100));
                }
              } catch (e) {
                // Not valid JSON, use as-is
                console.warn(`⚠️ Failed to parse response as JSON for ${chat.chat_id}, using as string:`, e);
                console.warn(`   Response was:`, assistantContent?.substring(0, 200));
              }
            } else {
              // Regular string, use as-is
              console.log(`📝 Response is plain string for ${chat.chat_id}, length:`, assistantContent.length);
            }
          }
          
          if (originalContent !== assistantContent) {
            console.log(`🔄 Transformed response for ${chat.chat_id}:`, {
              original: typeof originalContent === 'string' ? originalContent.substring(0, 100) : originalContent,
              transformed: typeof assistantContent === 'string' ? assistantContent.substring(0, 100) : assistantContent
            });
          }
        } else {
          console.error(`❌ Chat ${chat.chat_id} has null/undefined response!`);
        }
        
        // Ensure content is a string, not null, undefined, or the string "undefined"
        // Also check for common invalid values
        userContent = (userContent && 
                      userContent !== 'undefined' && 
                      userContent !== 'null' && 
                      userContent !== 'null' &&
                      String(userContent).trim() !== '' &&
                      String(userContent).trim() !== 'undefined') 
                      ? String(userContent).trim() 
                      : '';
        
        assistantContent = (assistantContent && 
                           assistantContent !== 'undefined' && 
                           assistantContent !== 'null' &&
                           String(assistantContent).trim() !== '' &&
                           String(assistantContent).trim() !== 'undefined') 
                           ? String(assistantContent).trim() 
                           : '';
        
        // If assistantContent is still empty or "undefined", log detailed info
        if (!assistantContent || assistantContent === 'undefined') {
          console.error(`❌ Chat ${chat.chat_id} has empty/invalid response after processing:`, {
            chat_id: chat.chat_id,
            original_response: chat.response,
            response_type: typeof chat.response,
            processed_content: assistantContent,
            all_fields: Object.keys(chat).reduce((acc, key) => {
              acc[key] = chat[key];
              return acc;
            }, {} as any)
          });
        }
        
        // Add user message (only if content exists)
        if (userContent) {
          messages.push({
            id: `user_${chat.chat_id}`,
            sessionId: chat.session_id || sessionId,
            role: 'user' as const,
            content: String(userContent),
            createdAt: chat.created_at || new Date().toISOString()
          });
        }
        
        // Add assistant message with citations if available (only if content exists)
        if (assistantContent) {
          const assistantMessage: any = {
            id: `assistant_${chat.chat_id}`,
            sessionId: chat.session_id || sessionId,
            role: 'assistant' as const,
            content: String(assistantContent),
            createdAt: chat.created_at || new Date().toISOString()
          };

          // Add citations if they exist in the database
          // Parse citationTitle and citationContent by splitting on delimiters
          // citationTitle uses ';;;' separator, citationContent uses '<|||>' separator
          if (chat.citation_title || chat.citation_content) {
            const citationTitle = chat.citation_title || '';
            const citationContent = chat.citation_content || '';
            
            // Log RAW data for debugging
            console.log('📋 RAW citation data from DB:', {
              citationTitle,
              citationContent,
              chat_id: chat.chat_id
            });
            
            // Split citationTitle by ';;;' separator
            const titles = citationTitle.split(';;;').map(t => t.trim()).filter(t => t.length > 0);
            
            // Split citationContent by '<|||>' separator
            const contents = citationContent.split('<|||>').map(c => c.trim()).filter(c => c.length > 0);
            
            console.log('🔪 Split results from DB:', {
              titlesCount: titles.length,
              contentsCount: contents.length,
              titles,
              contents
            });
            
            // Use the shorter length to avoid mismatched pairs (no fallback to first item only)
            const count = Math.min(titles.length, contents.length);
            
            assistantMessage.citations = [];
            for (let i = 0; i < count; i++) {
              assistantMessage.citations.push({
                id: `citation_${chat.chat_id}_${i}`,
                messageId: chat.chat_id,
                sourceType: 'document' as const,
                title: titles[i] || 'Untitled Source',
                snippet: contents[i] || '',
                sourceId: `doc_${chat.chat_id}_${i}`,
                metadata: {}
              });
            }
            
            console.log('✅ Parsed citations from DB:', assistantMessage.citations.length, assistantMessage.citations);
          }

          messages.push(assistantMessage);
        }
      }
    }

    console.log(`✅ Fetched ${messages.length} messages for session: ${sessionId}`);
    return messages;
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    throw error;
  }
}

/**
 * Delete a session and all associated chat data from Supabase
 */
export async function deleteSessionAndChatData(sessionId: string, groupId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    console.log(`Deleting session ${sessionId} and all chat data for group ${groupId}`);
    
    // First, delete all chat data for this session
    // Use a more aggressive delete to ensure all related records are removed
    const { data: chatData, error: chatSelectError } = await supabase
      .from('chat')
      .select('chat_id')
      .eq('session_id', sessionId)
      .eq('group_id', groupId);

    if (chatSelectError) {
      console.warn('Could not query chat data (may not exist):', chatSelectError);
    } else if (chatData && chatData.length > 0) {
      console.log(`Found ${chatData.length} chat records to delete`);
      
      // Delete all chat records
      const { error: chatError } = await supabase
        .from('chat')
        .delete()
        .eq('session_id', sessionId)
        .eq('group_id', groupId);

      if (chatError) {
        console.error('Error deleting chat data:', chatError);
        throw new Error(`Failed to delete chat data: ${chatError.message}`);
      }

      console.log(`✅ Deleted ${chatData.length} chat records for session: ${sessionId}`);
      
      // Wait a bit to ensure the deletion is committed
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
      console.log('No chat records found for this session');
    }

    // Then, delete the session itself
    const { error: sessionError } = await supabase
      .from('session')
      .delete()
      .eq('session_id', sessionId)
      .eq('group_id', groupId);

    if (sessionError) {
      // If session table doesn't exist or has issues, that's okay - chat data is already deleted
      if (sessionError.code === 'PGRST116' || sessionError.message.includes('does not exist') || sessionError.message.includes('schema cache')) {
        console.warn('Session table does not exist or has schema issues, but chat data was deleted successfully');
        return;
      }
      
      // Check if it's a foreign key constraint error
      if (sessionError.message.includes('foreign key constraint') || sessionError.code === '23503') {
        console.error('Foreign key constraint error - chat data may still exist:', sessionError);
        // Try to delete chat data again more aggressively
        const { error: retryChatError } = await supabase
          .from('chat')
          .delete()
          .eq('session_id', sessionId);
        
        if (!retryChatError) {
          // Retry session deletion
          const { error: retrySessionError } = await supabase
            .from('session')
            .delete()
            .eq('session_id', sessionId)
            .eq('group_id', groupId);
          
          if (retrySessionError) {
            throw new Error(`Failed to delete session after retry: ${retrySessionError.message}`);
          }
          console.log(`✅ Successfully deleted session after retry: ${sessionId}`);
          return;
        }
      }
      
      console.error('Error deleting session:', sessionError);
      throw new Error(`Failed to delete session: ${sessionError.message}`);
    }

    console.log(`✅ Deleted session: ${sessionId}`);
  } catch (error) {
    console.error('Failed to delete session and chat data:', error);
    throw error;
  }
}
