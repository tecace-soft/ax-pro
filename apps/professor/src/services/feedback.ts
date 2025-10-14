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
export async function getAdminFeedback(chatId: string): Promise<AdminFeedbackData | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('admin_feedback')
      .select('*')
      .eq('chat_id', chatId)
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

/**
 * Submit user feedback for a chat message
 */
export async function submitUserFeedback(
  chatId: string,
  userId: string,
  reaction: 'good' | 'bad',
  feedbackText?: string
): Promise<UserFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Submitting user feedback:', { chatId, userId, reaction, feedbackText });
    
    const feedbackData = {
      chat_id: chatId,
      user_id: userId,
      reaction,
      feedback_text: feedbackText || null
    };

    const { data, error } = await supabase
      .from('user_feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to submit user feedback: ${error.message}`);
    }

    console.log('✅ User feedback submitted:', data);
    return data as UserFeedbackData;
  } catch (error) {
    console.error('Failed to submit user feedback:', error);
    throw error;
  }
}

/**
 * Check if admin feedback already exists for a chat
 */
export async function getAdminFeedbackByChat(chatId: string): Promise<AdminFeedbackData | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('admin_feedback')
      .select('*')
      .eq('chat_id', chatId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data as AdminFeedbackData;
  } catch (error) {
    console.error('Error fetching admin feedback by chat:', error);
    return null;
  }
}

/**
 * Submit admin feedback for a chat message
 * Checks if feedback exists and updates it, otherwise inserts new
 */
export async function submitAdminFeedback(
  chatId: string,
  verdict: 'good' | 'bad',
  feedbackText: string,
  correctedResponse: string
): Promise<AdminFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Submitting admin feedback:', { chatId, verdict, feedbackText, correctedResponse });
    
    // Check if feedback already exists for this chat
    const existingFeedback = await getAdminFeedbackByChat(chatId);
    
    const feedbackData = {
      chat_id: chatId,
      feedback_verdict: verdict,
      feedback_text: feedbackText || null,
      corrected_response: correctedResponse || null,
      updated_at: new Date().toISOString()
    };

    let data, error;
    
    if (existingFeedback) {
      // Update existing feedback
      const result = await supabase
        .from('admin_feedback')
        .update(feedbackData)
        .eq('chat_id', chatId)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new feedback
      const result = await supabase
        .from('admin_feedback')
        .insert([feedbackData])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to submit admin feedback: ${error.message}`);
    }

    console.log('✅ Admin feedback submitted:', data);
    return data as AdminFeedbackData;
  } catch (error) {
    console.error('Failed to submit admin feedback:', error);
    throw error;
  }
}

/**
 * Update existing admin feedback
 */
export async function updateAdminFeedback(
  id: number,
  verdict: 'good' | 'bad',
  feedbackText: string,
  correctedResponse: string
): Promise<AdminFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Updating admin feedback:', { id, verdict, feedbackText, correctedResponse });
    
    const feedbackData = {
      feedback_verdict: verdict,
      feedback_text: feedbackText || null,
      corrected_response: correctedResponse || null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('admin_feedback')
      .update(feedbackData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to update admin feedback: ${error.message}`);
    }

    console.log('✅ Admin feedback updated:', data);
    return data as AdminFeedbackData;
  } catch (error) {
    console.error('Failed to update admin feedback:', error);
    throw error;
  }
}

