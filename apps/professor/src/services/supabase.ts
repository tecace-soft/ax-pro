import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration
// These will be configurable in settings
const SUPABASE_URL_KEY = 'axpro_supabase_url';
const SUPABASE_ANON_KEY_KEY = 'axpro_supabase_anon_key';

// Default values (can be overridden in settings)
const DEFAULT_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qpyteahuynkgkbmdasbv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Singleton Supabase client to avoid multiple instances
let supabaseClient: SupabaseClient | null = null;
let currentConfig: string | null = null;

/**
 * Get or create a singleton Supabase client
 */
export const getSupabaseClient = (): SupabaseClient => {
  const config = getSupabaseConfig();
  const configKey = `${config.url}:${config.anonKey}`;
  
  // Only create a new client if config changed or client doesn't exist
  if (!supabaseClient || currentConfig !== configKey) {
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase configuration not set. Please configure in Settings > Database.');
    }
    
    supabaseClient = createClient(config.url, config.anonKey);
    currentConfig = configKey;
    console.log('✅ Supabase client initialized');
  }
  
  return supabaseClient;
};

/**
 * Get Supabase configuration from localStorage
 */
export const getSupabaseConfig = (): SupabaseConfig => {
  try {
    const url = localStorage.getItem(SUPABASE_URL_KEY) || DEFAULT_SUPABASE_URL;
    const anonKey = localStorage.getItem(SUPABASE_ANON_KEY_KEY) || DEFAULT_SUPABASE_ANON_KEY;
    
    return { url, anonKey };
  } catch (error) {
    console.error('Failed to get Supabase config:', error);
    return { url: DEFAULT_SUPABASE_URL, anonKey: DEFAULT_SUPABASE_ANON_KEY };
  }
};

/**
 * Save Supabase configuration to localStorage
 */
export const saveSupabaseConfig = (config: SupabaseConfig): void => {
  try {
    localStorage.setItem(SUPABASE_URL_KEY, config.url);
    localStorage.setItem(SUPABASE_ANON_KEY_KEY, config.anonKey);
  } catch (error) {
    console.error('Failed to save Supabase config:', error);
  }
};

/**
 * Test Supabase connection
 */
export const testSupabaseConnection = async (config: SupabaseConfig): Promise<boolean> => {
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

// Type definitions for database tables
export interface ChatData {
  id: number;  // Numeric primary key
  chat_id: string;  // String identifier (chat_1760402027275_ekb47d6kd format)
  session_id?: string;  // Session identifier
  chat_message: string;  // User's input message
  response: string;      // Bot's response
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
}

export interface UserFeedbackData {
  id?: number;
  chat_id: string;  // Links to chat table
  user_id: string;
  reaction: 'good' | 'bad';  // good (thumbs up) or bad (thumbs down)
  feedback_text?: string | null;  // Optional text feedback
  created_at?: string;
}

