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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      console.warn('No group_id in session, cannot fetch group-specific chat data');
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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      console.warn('No group_id in session, cannot fetch group-specific chat data');
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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      console.warn('No group_id in session, cannot fetch group-specific chat data');
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
      return null;
    }

    if (data) {
      console.log(`✅ Found chat for chat_id: ${chatId}`);
    } else {
      console.warn(`No chat found for chat_id: ${chatId}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching chat by ID:', error);
    return null;
  }
}

/**
 * Fetch all sessions for a group, ordered by most recent first
 * Returns empty array if session table doesn't exist (sessions are created by backend)
 */
export async function fetchSessionsByGroup(groupId: string, limit: number = 100): Promise<SessionData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching sessions from Supabase for group_id:', groupId);
    
    // Only select columns that definitely exist (session_id, group_id, created_at)
    // Don't select status or title as they may not exist
    const { data, error } = await supabase
      .from('session')
      .select('session_id, group_id, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // If table doesn't exist or has issues, return empty array
      if (error.code === 'PGRST116' || error.message.includes('does not exist') || error.message.includes('schema cache')) {
        console.warn('Session table may not exist or have different schema - sessions are created by backend');
        return [];
      }
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch sessions: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} sessions for group_id: ${groupId}`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
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
        
        // Add assistant message
        messages.push({
          id: `assistant_${chat.chat_id}`,
          sessionId: chat.session_id || sessionId,
          role: 'assistant' as const,
          content: chat.response,
          createdAt: chat.created_at || new Date().toISOString()
        });
      }
    }

    console.log(`✅ Fetched ${messages.length} messages for session: ${sessionId}`);
    return messages;
  } catch (error) {
    console.error('Failed to fetch chat messages:', error);
    throw error;
  }
}

