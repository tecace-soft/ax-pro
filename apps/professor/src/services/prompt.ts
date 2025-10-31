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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      console.warn('No group_id in session, cannot fetch group-specific prompt');
      return '';
    }
    
    console.log('Fetching latest prompt from Supabase for group_id:', groupId);
    
    const query = supabase
      .from('prompts')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch prompt: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No prompts found in database for group_id:', groupId);
      return '';
    }

    const latestPrompt = data[0] as Prompt;
    console.log('✅ Latest prompt fetched:', latestPrompt.id, 'for group_id:', groupId);
    return latestPrompt.prompt_text || '';
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      throw new Error('No group_id in session. Please select a group first.');
    }
    
    console.log('💾 Creating new prompt in Supabase for group_id:', groupId);
    
    const { data, error } = await supabase
      .from('prompts')
      .insert([{ prompt_text: promptText, group_id: groupId }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create prompt: ${error.message}`);
    }

    const newPrompt = data[0] as Prompt;
    console.log('✅ New prompt created:', newPrompt.id, 'for group_id:', groupId);
  } catch (error) {
    console.error('Failed to update system prompt:', error);
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
    const groupId = (session as any)?.selectedGroupId;
    
    if (!groupId) {
      console.warn('No group_id in session, cannot fetch group-specific prompt history');
      return [];
    }
    
    console.log('🔄 Fetching prompt history from Supabase for group_id:', groupId);
    console.log('📊 Query: SELECT id, prompt_text, created_at FROM prompts WHERE group_id =', groupId, 'ORDER BY created_at DESC LIMIT', limit);
    
    const { data, error } = await supabase
      .from('prompts')
      .select('id, prompt_text, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log('📋 Raw Supabase response:', { data, error });

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Failed to fetch prompt history: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No prompt history found in database for group_id:', groupId);
      return [];
    }

    console.log('✅ Prompt history fetched successfully:', data.length, 'entries for group_id:', groupId);
    console.log('📚 First entry:', data[0]);
    return data as PromptHistory[];
  } catch (error) {
    console.error('❌ Failed to fetch prompt history:', error);
    throw error;
  }
}

/**
 * Delete a specific prompt by ID
 */
export async function deletePrompt(promptId: number): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('🗑️ Deleting prompt with ID:', promptId);
    
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', promptId);

    if (error) {
      console.error('❌ Supabase error:', error);
      throw new Error(`Failed to delete prompt: ${error.message}`);
    }

    console.log('✅ Prompt deleted successfully:', promptId);
  } catch (error) {
    console.error('❌ Failed to delete prompt:', error);
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
    console.error('Force reload failed:', error);
    // Return a default response if the endpoint doesn't exist
    return {
      status: 'skipped',
      message: 'Force reload endpoint not available'
    };
  }
}

