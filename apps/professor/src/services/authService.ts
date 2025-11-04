import { createClient } from '@supabase/supabase-js';

// Default Supabase credentials for authentication (Admin's database)
const DEFAULT_SUPABASE_URL = 'https://qpyteahuynkgkbmdasbv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY';

// Create default Supabase client for authentication
const defaultSupabase = createClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY);

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
 * Check if email already exists in the database (using default Supabase)
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    console.log('Checking email existence in default Supabase...');
    
    const { data, error } = await defaultSupabase
      .from('user')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is what we want
      console.error('Error checking email:', error);
      throw error;
    }
    
    console.log(`Email ${email} exists:`, !!data);
    return !!data; // Return true if email exists, false otherwise
  } catch (error) {
    console.error('Failed to check email existence:', error);
    throw error;
  }
}

/**
 * Create a new user in the database (using default Supabase)
 */
export async function createUser(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
  try {
    console.log('Creating new user in default Supabase...', { ...userData, password: '[HIDDEN]' });
    
    const { data, error } = await defaultSupabase
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
    
    console.log('✅ User created successfully in default Supabase:', data);
    return data as User;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Get user by email (using default Supabase for authentication)
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    console.log('Getting user by email from default Supabase...');
    
    const { data, error } = await defaultSupabase
      .from('user')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        console.log('User not found');
        return null;
      }
      throw error;
    }
    
    console.log('✅ User found:', { ...data, password: '[HIDDEN]' });
    return data as User;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
}

/**
 * Get user by user_id (using default Supabase for authentication)
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    console.log('Getting user by ID from default Supabase...');
    
    const { data, error } = await defaultSupabase
      .from('user')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        console.log('User not found');
        return null;
      }
      throw error;
    }
    
    console.log('✅ User found:', { ...data, password: '[HIDDEN]' });
    return data as User;
  } catch (error) {
    console.error('Failed to get user by ID:', error);
    throw error;
  }
}

/**
 * Authenticate user (using default Supabase)
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    console.log('Authenticating user with default Supabase...');
    
    const user = await getUserByEmail(email);
    
    if (!user) {
      console.log('User not found');
      return null;
    }
    
    // Simple password comparison (in production, use proper hashing)
    if (user.password !== password) {
      console.log('Invalid password');
      return null;
    }
    
    console.log('✅ User authenticated successfully');
    return user;
  } catch (error) {
    console.error('Failed to authenticate user:', error);
    throw error;
  }
}

/**
 * Update user data (using default Supabase)
 */
export async function updateUser(userId: string, updates: { first_name?: string; last_name?: string; password?: string }): Promise<User> {
  try {
    console.log('Updating user in default Supabase...', { userId, updates: { ...updates, password: updates.password ? '[HIDDEN]' : undefined } });
    
    const updateData: any = {};
    if (updates.first_name !== undefined) {
      updateData.first_name = updates.first_name;
    }
    if (updates.last_name !== undefined) {
      updateData.last_name = updates.last_name;
    }
    if (updates.password !== undefined) {
      updateData.password = updates.password; // In production, this should be hashed
    }
    
    const { data, error } = await defaultSupabase
      .from('user')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
    
    console.log('✅ User updated successfully:', { ...data, password: '[HIDDEN]' });
    return data as User;
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
}
