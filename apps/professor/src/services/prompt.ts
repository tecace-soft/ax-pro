import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from './supabase';

interface Prompt {
  id?: number;
  prompt_text: string;
  created_at?: string;
}

/**
 * Get Supabase client instance
 */
function getSupabaseClient() {
  const config = getSupabaseConfig();
  
  if (!config.url || !config.anonKey) {
    throw new Error('Supabase configuration not set. Please configure in Settings > Database.');
  }

  return createClient(config.url, config.anonKey);
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

