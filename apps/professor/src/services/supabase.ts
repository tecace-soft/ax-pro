// Supabase configuration
// These will be configurable in settings
const SUPABASE_URL_KEY = 'axpro_supabase_url';
const SUPABASE_ANON_KEY_KEY = 'axpro_supabase_anon_key';

// Default values (can be overridden in settings)
const DEFAULT_SUPABASE_URL = 'https://qpyteahuynkgkbmdasbv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

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
  id?: number;
  request_id: string;
  session_id: string;
  input_text: string;
  output_text: string;
  admin_feedback?: AdminFeedbackData | null;
  user_feedback?: any | null;
  created_at?: string;
  updated_at?: string;
}

export interface AdminFeedbackData {
  id?: number;
  request_id: string;
  feedback_verdict: 'good' | 'bad';
  feedback_text: string;
  corrected_response?: string | null;
  prompt_apply?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserFeedbackData {
  id?: number;
  request_id: string;
  timestamp: string;
  user_name: string;
  user_id: string;
  conversation_id: string;
  reaction: string;
  feedback_text?: string | null;
  raw_data: any;
  created_at?: string;
  chat_message?: string | null;
  chat_response?: string | null;
}

