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

