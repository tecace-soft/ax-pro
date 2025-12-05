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

    // Convert ChatData to ChatMessage format
    const messages: any[] = [];
    if (data) {
      for (const chat of data) {
        // Add user message
        messages.push({
          id: `user_${chat.chat_id}`,
          sessionId: chat.session_id || sessionId,
          role: 'user' as const,
          content: chat.chat_message,
          createdAt: chat.created_at || new Date().toISOString()
        });
        
        // Add assistant message with citations if available
        const assistantMessage: any = {
          id: `assistant_${chat.chat_id}`,
          sessionId: chat.session_id || sessionId,
          role: 'assistant' as const,
          content: chat.response,
          createdAt: chat.created_at || new Date().toISOString()
        };

        // Add citations if they exist in the database
        if (chat.citation_title || chat.citation_content) {
          assistantMessage.citations = [{
            id: `citation_${chat.chat_id}`,
            messageId: chat.chat_id,
            sourceType: 'document' as const,
            title: chat.citation_title || '',
            snippet: chat.citation_content || '',
            sourceId: `doc_${chat.chat_id}`,
            metadata: {}
          }];
        }

        messages.push(assistantMessage);
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
