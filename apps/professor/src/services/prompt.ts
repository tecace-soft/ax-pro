import { getSupabaseClient } from './supabaseUserSpecific';
import { getSession } from './auth';

interface Prompt {
  id?: number;
  prompt_text: string;
  created_at?: string;
}

interface PromptHistory {
  id: number;
  prompt_text: string;
  created_at: string;
}

/**
 * Fetch the latest system prompt from Supabase filtered by group_id
 */
export async function fetchSystemPrompt(): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return '';
    }
    const query = supabase
      .from('prompts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch prompt: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return '';
    }

    const latestPrompt = data[0] as Prompt;
    return latestPrompt.prompt_text || '';
  } catch (error) {
    throw error;
  }
}

/**
 * Create/Insert a new system prompt in Supabase with group_id
 */
export async function updateSystemPrompt(promptText: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      throw new Error('No group_id in session. Please select a group first.');
    }
    const { data, error } = await supabase
      .from('prompts')
      .insert([{ prompt_text: promptText, group_id: groupId }])
      .select();

    if (error) {
      throw new Error(`Failed to create prompt: ${error.message}`);
    }

    const newPrompt = data[0] as Prompt;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch prompt history from Supabase filtered by group_id
 */
export async function fetchPromptHistory(limit: number = 10): Promise<PromptHistory[]> {
  try {
    const supabase = getSupabaseClient();
    const session = getSession();
    const { getGroupIdFromUrl } = await import('../utils/navigation');
    const groupId = getGroupIdFromUrl();
    
    if (!groupId) {
      return [];
    }
    const { data, error } = await supabase
      .from('prompts')
      .select('id, prompt_text, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      throw new Error(`Failed to fetch prompt history: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }
    return data as PromptHistory[];
  } catch (error) {
    throw error;
  }
}

/**
 * Delete a specific prompt by ID
 */
export async function deletePrompt(promptId: number): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      throw new Error(`Failed to delete prompt: ${error.message}`);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Force reload chatbot prompt (if applicable)
 */
export async function forcePromptReload(): Promise<{ status: string; message: string }> {
  try {
    // This endpoint may not exist in your setup, adjust as needed
    const response = await fetch('/prompt-api/force-prompt-reload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Force reload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    // Return a default response if the endpoint doesn't exist
    return {
      status: 'skipped',
      message: 'Force reload endpoint not available'
    };
  }
}

