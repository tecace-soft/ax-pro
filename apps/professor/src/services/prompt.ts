import { getSupabaseClient } from './supabase';

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
 * Fetch the latest system prompt from Supabase
 */
export async function fetchSystemPrompt(): Promise<string> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching latest prompt from Supabase...');
    
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch prompt: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No prompts found in database');
      return '';
    }

    const latestPrompt = data[0] as Prompt;
    console.log('✅ Latest prompt fetched:', latestPrompt.id);
    return latestPrompt.prompt_text || '';
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
    throw error;
  }
}

/**
 * Create/Insert a new system prompt in Supabase
 */
export async function updateSystemPrompt(promptText: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('💾 Creating new prompt in Supabase...');
    
    const { data, error } = await supabase
      .from('prompts')
      .insert([{ prompt_text: promptText }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create prompt: ${error.message}`);
    }

    const newPrompt = data[0] as Prompt;
    console.log('✅ New prompt created:', newPrompt.id);
  } catch (error) {
    console.error('Failed to update system prompt:', error);
    throw error;
  }
}

/**
 * Fetch prompt history from Supabase
 */
export async function fetchPromptHistory(limit: number = 10): Promise<PromptHistory[]> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Fetching prompt history from Supabase...');
    
    const { data, error } = await supabase
      .from('prompts')
      .select('id, prompt_text, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to fetch prompt history: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('No prompt history found in database');
      return [];
    }

    console.log('✅ Prompt history fetched:', data.length, 'entries');
    return data as PromptHistory[];
  } catch (error) {
    console.error('Failed to fetch prompt history:', error);
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

