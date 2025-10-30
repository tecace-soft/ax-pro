import { getSupabaseClient } from './supabaseUserSpecific';

export interface User {
  id?: number;
  created_at?: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

/**
 * Generate a unique user ID based on creation date/time, initials, and unique code
 */
export function generateUserId(firstName: string, lastName: string): string {
  const now = new Date();
  
  // Format: YYYYMMDDHHMMSS
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0') +
    now.getSeconds().toString().padStart(2, '0');
  
  // Get initials (first letter of first name + first letter of last name)
  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  
  // Generate unique code (6 random alphanumeric characters)
  const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `${timestamp}_${initials}_${uniqueCode}`;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if email already exists in the database
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Error checking email:', error);
      throw error;
    }
    
    return !!data; // Return true if email exists, false otherwise
  } catch (error) {
    console.error('Failed to check email existence:', error);
    throw error;
  }
}

/**
 * Create a new user in the database
 */
export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
  try {
    const supabase = getSupabaseClient();
    
    console.log('Creating new user:', { ...userData, password: '[HIDDEN]' });
    
    const { data, error } = await supabase
      .from('user')
      .insert([{
        user_id: userData.user_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: userData.email.toLowerCase(),
        password: userData.password // In production, this should be hashed
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to create user: ${error.message}`);
    }
    
    console.log('✅ User created successfully:', data);
    return data as User;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }
    
    return data as User;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
}

/**
 * Get user by user_id
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }
    
    return data as User;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
}
