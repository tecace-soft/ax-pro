import { getSupabaseClient } from './supabaseUserSpecific';
import type { AdminFeedbackData, UserFeedbackData } from './supabaseUserSpecific';
import { getSession } from './auth';

/**
 * Fetch all admin feedback ordered by most recent first, filtered by group_id
 */
export async function fetchAllAdminFeedback(): Promise<AdminFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return [];
    }
    const { data, error } = await supabase
      .from('admin_feedback')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch admin feedback: ${error.message}`);
    }
    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch all user feedback ordered by most recent first, filtered by group_id
 */
export async function fetchAllUserFeedback(): Promise<UserFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return [];
    }
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user feedback: ${error.message}`);
    }
    return data || [];
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch user feedback by date range, filtered by group_id
 */
export async function fetchUserFeedbackByDateRange(startDate: string, endDate: string): Promise<UserFeedbackData[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('group_id', groupId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user feedback: ${error.message}`);
    }

    return data || [];
  } catch (error) {
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
    throw error;
  }
}

/**
 * Submit user feedback for a chat message
 * Includes group_id from session
 */
export async function submitUserFeedback(
  chatId: string,
  userId: string,
  reaction: 'good' | 'bad',
  feedbackText?: string
): Promise<UserFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      throw new Error('No group_id in URL. Please select a group first.');
    }
    const feedbackData = {
      chat_id: chatId,
      user_id: userId,
      group_id: groupId,
      reaction,
      feedback_text: feedbackText || null
    };

    const { data, error } = await supabase
      .from('user_feedback')
      .insert([feedbackData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit user feedback: ${error.message}`);
    }
    return data as UserFeedbackData;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if admin feedback already exists for a chat, filtered by group_id
 */
export async function getAdminFeedbackByChat(chatId: string): Promise<AdminFeedbackData | null> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return null;
    }
    
    // Use maybeSingle() instead of single() to avoid PGRST116 error when no rows found
    const { data, error } = await supabase
      .from('admin_feedback')
      .select('*')
      .eq('chat_id', chatId)
      .eq('group_id', groupId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as AdminFeedbackData | null;
  } catch (error) {
    return null;
  }
}

/**
 * Submit admin feedback for a chat message
 * Checks if feedback exists and updates it, otherwise inserts new
 * Includes group_id from session
 */
export async function submitAdminFeedback(
  chatId: string | null,
  verdict: 'good' | 'bad',
  feedbackText: string,
  correctedMessage: string,
  correctedResponse: string
): Promise<AdminFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      throw new Error('No group_id in URL. Please select a group first.');
    }
    // If chatId is provided, check if feedback already exists
    let existingFeedback = null;
    if (chatId) {
      existingFeedback = await getAdminFeedbackByChat(chatId);
    }
    
    let data, error;
    
    if (existingFeedback && chatId) {
      // Update existing feedback (don't include created_at or id)
      const updateData = {
        feedback_verdict: verdict,
        feedback_text: feedbackText || null,
        corrected_message: correctedMessage || null,
        corrected_response: correctedResponse || null,
        updated_at: new Date().toISOString()
      };
      
      const result = await supabase
        .from('admin_feedback')
        .update(updateData)
        .eq('chat_id', chatId)
        .eq('group_id', groupId)
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    } else {
      // Insert new feedback with group_id (chat_id is optional)
      const insertData: any = {
        group_id: groupId,
        feedback_verdict: verdict,
        feedback_text: feedbackText || null,
        corrected_message: correctedMessage || null,
        corrected_response: correctedResponse || null
      };
      
      // Only include chat_id if provided
      if (chatId) {
        insertData.chat_id = chatId;
      }
      
      const result = await supabase
        .from('admin_feedback')
        .insert([insertData])
        .select()
        .maybeSingle();
      data = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(`Failed to submit admin feedback: ${error.message}`);
    }
    return data as AdminFeedbackData;
  } catch (error) {
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
      throw new Error(`Failed to update admin feedback: ${error.message}`);
    }
    return data as AdminFeedbackData;
  } catch (error) {
    throw error;
  }
}

export async function updateAdminFeedbackField(
  id: number,
  updates: Partial<AdminFeedbackData>
): Promise<AdminFeedbackData> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_feedback')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update admin feedback: ${error.message}`);
    }
    return data as AdminFeedbackData;
  } catch (error) {
    throw error;
  }
}

/**
 * Delete admin feedback by ID
 */
export async function deleteAdminFeedback(id: number): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('admin_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete admin feedback: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Delete user feedback by ID
 */
export async function deleteUserFeedback(id: number): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('user_feedback')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete user feedback: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

