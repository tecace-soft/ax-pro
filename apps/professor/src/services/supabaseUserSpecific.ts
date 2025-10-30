import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getUserSupabaseConfig, saveUserSupabaseConfig } from './userSettings';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Type definitions for database tables
export interface ChatData {
  id: number;  // Numeric primary key
  chat_id: string;  // String identifier (chat_1760402027275_ekb47d6kd format)
  session_id?: string;  // Session identifier
  chat_message: string;  // User's input message
  response: string;      // Bot's response
  // Optional bilingual fields for translation demo (professor mock only)
  response_en?: string;
  response_ko?: string;
  user_id: string;       // User identifier
  admin_feedback?: AdminFeedbackData | null;
  user_feedback?: any | null;
  created_at?: string;
}

export interface AdminFeedbackData {
  id?: number;
  chat_id: string;  // Links to chat table
  updated_at?: string;  // When admin reviewed
  feedback_verdict: 'good' | 'bad';
  feedback_text: string;
  corrected_response?: string | null;
  created_at?: string;
  apply?: boolean;  // Whether to apply this feedback to prompt
}

export interface UserFeedbackData {
  id?: number;
  chat_id: string;  // Links to chat table
  user_id: string;
  reaction: 'good' | 'bad';  // good (thumbs up) or bad (thumbs down)
  feedback_text?: string | null;  // Optional text feedback
  created_at?: string;
}

// Singleton Supabase client to avoid multiple instances
let supabaseClient: SupabaseClient | null = null;
let currentConfig: string | null = null;

/**
 * Get or create a singleton Supabase client using current user's settings
 */
export const getSupabaseClient = (): SupabaseClient => {
  const config = getUserSupabaseConfig();
  const configKey = `${config.url}:${config.anonKey}`;
  
  // Only create a new client if config changed or client doesn't exist
  if (!supabaseClient || currentConfig !== configKey) {
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase configuration not set for current user. Please configure in Settings > Database.');
    }
    
    supabaseClient = createClient(config.url, config.anonKey);
    currentConfig = configKey;
    console.log('✅ Supabase client initialized for current user');
  }
  
  return supabaseClient;
};

/**
 * Get Supabase configuration for current user
 */
export const getSupabaseConfig = (): { url: string; anonKey: string } => {
  return getUserSupabaseConfig();
};

/**
 * Save Supabase configuration for current user
 */
export const saveSupabaseConfig = (config: { url: string; anonKey: string }): void => {
  saveUserSupabaseConfig(config);
};

/**
 * Test Supabase connection for current user
 */
export const testSupabaseConnection = async (config: { url: string; anonKey: string }): Promise<boolean> => {
  try {
    if (!config.url || !config.anonKey) {
      return false;
    }

    // Try to query the prompts table as a connection test
    const response = await fetch(`${config.url}/rest/v1/prompts?select=id&limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`
      }
    });

    console.log('Supabase connection test response:', response.status);
    return response.ok;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};
