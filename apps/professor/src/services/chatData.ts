import { getSupabaseClient } from './supabase';
import type { ChatData } from './supabase';

/**
 * Fetch all chat data ordered by most recent first
 */
export async function fetchAllChatData(limit: number = 100): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching chat data from Supabase...');
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch chat data: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} chat records`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat data:', error);
    throw error;
  }
}

/**
 * Fetch chat data for a specific session
 */
export async function fetchChatDataBySession(sessionId: string): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('session_id', sessionId)
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
 * Fetch chat data by date range
 */
export async function fetchChatDataByDateRange(startDate: string, endDate: string): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('chat')
      .select('*')
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
 * Handles both string and numeric chat IDs
 */
export async function fetchChatById(chatId: string): Promise<ChatData | null> {
  try {
    const supabase = getSupabaseClient();
    
    // First try to find by exact string match (for string IDs)
    let { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', chatId)
      .maybeSingle();

    // If that fails and chatId looks like a string ID, try to extract numeric part
    if (error && chatId.startsWith('chat_')) {
      console.log(`String ID lookup failed for ${chatId}, trying alternative approach...`);
      
      // Try to find by partial match or different field
      const { data: altData, error: altError } = await supabase
        .from('chat')
        .select('*')
        .ilike('id', `%${chatId}%`)
        .maybeSingle();
      
      if (!altError && altData) {
        console.log(`✅ Found chat using alternative lookup for ${chatId}`);
        return altData;
      }
      
      // If still no match, return null with a helpful message
      console.warn(`No chat found for ID: ${chatId}. This might be due to a chat_id mismatch between feedback and chat tables.`);
      return null;
    }

    if (error) {
      console.error('Supabase error:', error);
      return null;
    }

    if (data) {
      console.log(`✅ Found chat for ID: ${chatId}`);
    } else {
      console.warn(`No chat found for ID: ${chatId}`);
    }

    return data;
  } catch (error) {
    console.error('Error fetching chat by ID:', error);
    return null;
  }
}

