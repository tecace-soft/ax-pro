import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, AdminFeedbackData, UserFeedbackData } from './supabase';

function getSupabaseClient() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration not set. Please configure in Settings > Database.');
  }

  return createClient(config.url, config.anonKey);
}

/**
 * Fetch all admin feedback ordered by most recent first
 */
export async function fetchAllAdminFeedback(): Promise<AdminFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching admin feedback from Supabase...');
    
    const { data, error } = await supabase
      .from('admin_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch admin feedback: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} admin feedback records`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch admin feedback:', error);
    throw error;
  }
}

/**
 * Fetch all user feedback ordered by most recent first
 */
export async function fetchAllUserFeedback(): Promise<UserFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching user feedback from Supabase...');
    
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch user feedback: ${error.message}`);
    }

    console.log(`✅ Fetched ${data?.length || 0} user feedback records`);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch user feedback:', error);
    throw error;
  }
}

/**
 * Fetch user feedback by date range
 */
export async function fetchUserFeedbackByDateRange(startDate: string, endDate: string): Promise<UserFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch user feedback: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Failed to fetch user feedback by date range:', error);
    throw error;
  }
}

/**
 * Fetch admin feedback for a specific request
 */
export async function getAdminFeedback(requestId: string): Promise<AdminFeedbackData | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('admin_feedback')
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
    console.error('Error fetching admin feedback:', error);
    throw error;
  }
}

