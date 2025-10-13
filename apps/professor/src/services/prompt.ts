import { getSupabaseConfig } from './supabase';

interface PromptResponse {
  content: string;
}

/**
 * Fetch system prompt from Supabase
 */
export async function fetchSystemPrompt(): Promise<string> {
  try {
    const config = getSupabaseConfig();
    
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase configuration not set. Please configure in Settings.');
    }

    console.log('Fetching system prompt from Supabase...');
    const response = await fetch(`${config.url}/rest/v1/rpc/get_system_prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to fetch system prompt: ${response.status} ${response.statusText}`);
    }

    const data: PromptResponse = await response.json();
    console.log('System prompt fetched successfully');
    return data.content || '';
  } catch (error) {
    console.error('Failed to fetch system prompt:', error);
    throw error;
  }
}

/**
 * Update system prompt in Supabase
 */
export async function updateSystemPrompt(content: string): Promise<void> {
  try {
    const config = getSupabaseConfig();
    
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase configuration not set. Please configure in Settings.');
    }

    console.log('Updating system prompt...');
    const response = await fetch(`${config.url}/rest/v1/rpc/update_system_prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      },
      body: JSON.stringify({ new_content: content })
    });

    console.log('Update response status:', response.status);

    if (!response.ok) {
      throw new Error(`Failed to update system prompt: ${response.status} ${response.statusText}`);
    }

    console.log('System prompt updated successfully');
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

