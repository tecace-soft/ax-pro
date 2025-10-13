import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, ChatData } from './supabase';

function getSupabaseClient() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration not set. Please configure in Settings > Database.');
  }

  return createClient(config.url, config.anonKey);
}

/**
 * Fetch all chat data ordered by most recent first
 */
export async function fetchAllChatData(limit: number = 100): Promise<ChatData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching chat data from Supabase...');
    
    const { data, error } = await supabase
      .from('chat_data')
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
      .from('chat_data')
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
      .from('chat_data')
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
      .from('chat_data')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching chat data:', error);
    throw error;
  }
}

