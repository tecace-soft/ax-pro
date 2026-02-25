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
      return [];
    }
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }
    return data || [];
  } catch (error) {
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
      return [];
    }
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('session_id', sessionId)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data || [];
  } catch (error) {
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
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data || [];
  } catch (error) {
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
    // Match against the chat_id column (string), not the id column (numeric)
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('chat_id', chatId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch sessions from Supabase filtered by group_id
 */
export async function fetchSessionsByGroup(groupId: string): Promise<SessionData[]> {
  try {
    const supabase = getSupabaseClient();
    // Only select columns that definitely exist
    const { data, error } = await supabase
      .from('session')
      .select('session_id, group_id, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array (sessions are created by backend)
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        return [];
      }
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }
    return data || [];
  } catch (error) {
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
      return null;
    }

    return data;
  } catch (error) {
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
      throw new Error(`Failed to fetch chat messages: ${error.message}`);
    }
    
    // Process chat data
    if (data && data.length > 0) {
      // Data processing continues
    }

    // Convert ChatData to ChatMessage format
    const messages: any[] = [];
    if (data) {
      for (const chat of data) {
        // Log raw data for debugging - show ALL fields
        // Safely extract and parse content
        // Try multiple possible field names for response
        let userContent = chat.chat_message;
        let assistantContent = chat.response || (chat as any).answer || (chat as any).output_text || (chat as any).outputText;
        
        // Early filter: if response is the string "undefined" or "null", treat it as empty
        if (assistantContent === 'undefined' || assistantContent === 'null' || 
            (typeof assistantContent === 'string' && assistantContent.trim() === 'undefined') ||
            (typeof assistantContent === 'string' && assistantContent.trim() === 'null')) {
          assistantContent = null; // Set to null so it will be filtered out later
        }
        
        // Handle different response formats
        if (assistantContent !== null && assistantContent !== undefined) {
          const originalContent = assistantContent;
          
          // If response is already an object (shouldn't happen but handle it)
          if (typeof assistantContent === 'object' && assistantContent !== null) {
            assistantContent = assistantContent.answer || assistantContent.content || assistantContent.response || JSON.stringify(assistantContent);
          }
          // If response is a JSON string
          else if (typeof assistantContent === 'string') {
            const trimmed = assistantContent.trim();
            // Try to parse if it looks like JSON
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                const parsed = JSON.parse(assistantContent);
                // If parsed is an object with an 'answer' or 'content' field, use that
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  assistantContent = parsed.answer || parsed.content || parsed.response || assistantContent;
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                  // Handle array responses (take first element)
                  const first = parsed[0];
                  assistantContent = first?.answer || first?.content || first?.response || assistantContent;
                }
              } catch (e) {
                // Not valid JSON, use as-is
              }
            } else {
              // Regular string, use as-is
            }
          }
          
        } else {
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
            // Use parseCitations function from chat.ts for consistent parsing
            const { parseCitations } = await import('./chat');
            const parsedCitations = parseCitations(citationTitle, citationContent, chat.chat_id, String(chat.chat_id));
            
            
            assistantMessage.citations = parsedCitations;
          }

          messages.push(assistantMessage);
        }
      }
    }
    return messages;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a session and all associated chat data from Supabase
 */
export async function deleteSessionAndChatData(sessionId: string, groupId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    // First, delete all chat data for this session
    // Use a more aggressive delete to ensure all related records are removed
    const { data: chatData, error: chatSelectError } = await supabase
      .from('chat')
      .select('chat_id')
      .eq('session_id', sessionId)
      .eq('group_id', groupId);

    if (chatSelectError) {
    } else if (chatData && chatData.length > 0) {
      // Delete all chat records
      const { error: chatError } = await supabase
        .from('chat')
        .delete()
        .eq('session_id', sessionId)
        .eq('group_id', groupId);

      if (chatError) {
        throw new Error(`Failed to delete chat data: ${chatError.message}`);
      }
      // Wait a bit to ensure the deletion is committed
      await new Promise(resolve => setTimeout(resolve, 100));
    } else {
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
        return;
      }
      
      // Check if it's a foreign key constraint error
      if (sessionError.message.includes('foreign key constraint') || sessionError.code === '23503') {
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
          return;
        }
      }
      throw new Error(`Failed to delete session: ${sessionError.message}`);
    }
  } catch (error) {
    throw error;
  }
}
