import { getSession } from './auth';
import { N8nConfig } from './n8n';
import { SupabaseConfig } from './supabase';

export interface UserSettings {
  userId: string;
  email: string;
  n8nConfigs: N8nConfig[];
  activeN8nConfigId: string;
  supabaseConfig: SupabaseConfig;
  apiConfigs: any[];
  uiCustomization: any;
  createdAt: string;
  updatedAt: string;
}

export interface UserN8nConfig {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSupabaseConfig {
  url: string;
  anonKey: string;
}

// Default settings for new users - use Admin's backend by default
const DEFAULT_USER_SETTINGS: Partial<UserSettings> = {
  n8nConfigs: [{
    id: 'default_webhook',
    name: 'Default Webhook',
    webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  activeN8nConfigId: 'default_webhook',
  supabaseConfig: {
    url: 'https://qpyteahuynkgkbmdasbv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY'
  },
  apiConfigs: [],
  uiCustomization: {}
};

// User-specific settings for SeokHoon Kang - HANA'S UNIQUE CHATBOT
const SEOKHOON_KANG_SETTINGS: Partial<UserSettings> = {
  n8nConfigs: [{
    id: 'seokhoon_default',
    name: 'Hana Custom Chatbot',
    webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/63647efd-8c39-42d5-8e1f-b465d62091c6', // Hana's unique chatbot
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  activeN8nConfigId: 'seokhoon_default',
  supabaseConfig: {
    url: 'https://oomjruguisqdahcrvfws.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbWpydWd1aXNxZGFoY3J2ZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjAxNTUsImV4cCI6MjA3NjYzNjE1NX0.gPLhFgvyCXozmUwbdNDTRp2_-pDH4rHQCJuyPotR8Vo'
  }
};

// User-specific settings for Admin (preserves original settings)
const ADMIN_SETTINGS: Partial<UserSettings> = {
  n8nConfigs: [{
    id: 'admin_default',
    name: 'Admin Default Webhook',
    webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }],
  activeN8nConfigId: 'admin_default',
  supabaseConfig: {
    url: 'https://qpyteahuynkgkbmdasbv.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY'
  }
};

const USER_SETTINGS_KEY = 'axpro_user_settings';

/**
 * Get current user's settings
 */
export const getUserSettings = (): UserSettings | null => {
  const session = getSession();
  if (!session) {
    return null;
  }

  try {
    const allUserSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    const userSettings = allUserSettings[session.userId];
    
    if (!userSettings) {
      // Create default settings for new user
      const newSettings = createDefaultUserSettings(session.userId, session.email);
      
      // Save the new settings to localStorage
      allUserSettings[session.userId] = newSettings;
      localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(allUserSettings));
      
      console.log('✅ Created and saved default settings for:', session.email);
      
      return newSettings;
    }
    
    return userSettings;
  } catch (error) {
    console.error('Failed to get user settings:', error);
    return null;
  }
};

/**
 * Save current user's settings
 */
export const saveUserSettings = (settings: Partial<UserSettings>): boolean => {
  const session = getSession();
  if (!session) {
    return false;
  }

  try {
    const allUserSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    const currentSettings = allUserSettings[session.userId] || createDefaultUserSettings(session.userId, session.email);
    
    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...settings,
      userId: session.userId,
      email: session.email,
      updatedAt: new Date().toISOString()
    };
    
    allUserSettings[session.userId] = updatedSettings;
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(allUserSettings));
    
    return true;
  } catch (error) {
    console.error('Failed to save user settings:', error);
    return false;
  }
};

/**
 * Create default settings for a new user
 */
const createDefaultUserSettings = (userId: string, email: string): UserSettings => {
  const now = new Date().toISOString();
  
  // Check if this is SeokHoon Kang's account
  if (userId === 'seokhoon_kang_001' || email === 'hana@tecace.com') {
    return {
      userId,
      email,
      ...SEOKHOON_KANG_SETTINGS,
      createdAt: now,
      updatedAt: now
    } as UserSettings;
  }
  
  // Check if this is Admin's account
  if (userId === '409esj1923' || email === 'chatbot-admin@tecace.com') {
    return {
      userId,
      email,
      ...ADMIN_SETTINGS,
      createdAt: now,
      updatedAt: now
    } as UserSettings;
  }
  
  // Check if this is Regular User's account - use Admin's webhook settings
  if (userId === 'user123456' || email === 'chatbot-user@tecace.com') {
    return {
      userId,
      email,
      ...ADMIN_SETTINGS, // Use Admin's webhook settings for Regular User
      createdAt: now,
      updatedAt: now
    } as UserSettings;
  }
  
  // Check if this is Professor's account - use Admin's settings
  if (userId === 'professor_001' || email === 'professor@tecace.com') {
    return {
      userId,
      email,
      ...ADMIN_SETTINGS, // Use Admin's settings for Professor
      createdAt: now,
      updatedAt: now
    } as UserSettings;
  }
  
  // Default settings for other users
  return {
    userId,
    email,
    ...DEFAULT_USER_SETTINGS,
    createdAt: now,
    updatedAt: now
  } as UserSettings;
};

/**
 * Get user-specific N8n configurations
 */
export const getUserN8nConfigs = (): N8nConfig[] => {
  const userSettings = getUserSettings();
  return userSettings?.n8nConfigs || [];
};

/**
 * Save user-specific N8n configurations
 */
export const saveUserN8nConfigs = (configs: N8nConfig[]): boolean => {
  return saveUserSettings({ n8nConfigs: configs });
};

/**
 * Get user's active N8n configuration
 */
export const getUserActiveN8nConfig = (): N8nConfig | null => {
  const userSettings = getUserSettings();
  if (!userSettings) return null;
  
  const activeConfig = userSettings.n8nConfigs.find(config => config.id === userSettings.activeN8nConfigId);
  return activeConfig || userSettings.n8nConfigs[0] || null;
};

/**
 * Set user's active N8n configuration
 */
export const setUserActiveN8nConfig = (configId: string): boolean => {
  return saveUserSettings({ activeN8nConfigId: configId });
};

/**
 * Get user-specific Supabase configuration
 */
export const getUserSupabaseConfig = (): SupabaseConfig => {
  const userSettings = getUserSettings();
  return userSettings?.supabaseConfig || { url: '', anonKey: '' };
};

/**
 * Save user-specific Supabase configuration
 */
export const saveUserSupabaseConfig = (config: SupabaseConfig): boolean => {
  return saveUserSettings({ supabaseConfig: config });
};

/**
 * Get user-specific API configurations
 */
export const getUserApiConfigs = (): any[] => {
  const userSettings = getUserSettings();
  return userSettings?.apiConfigs || [];
};

/**
 * Save user-specific API configurations
 */
export const saveUserApiConfigs = (configs: any[]): boolean => {
  return saveUserSettings({ apiConfigs: configs });
};

/**
 * Get user-specific UI customization
 */
export const getUserUICustomization = (): any => {
  const userSettings = getUserSettings();
  return userSettings?.uiCustomization || {};
};

/**
 * Save user-specific UI customization
 */
export const saveUserUICustomization = (customization: any): boolean => {
  return saveUserSettings({ uiCustomization: customization });
};

/**
 * Clear all user settings (for logout)
 */
export const clearUserSettings = (): void => {
  // Note: We don't clear all user settings on logout, just the session
  // This allows users to keep their settings when they log back in
};

/**
 * Get settings for a specific user (admin function)
 */
export const getSettingsForUser = (userId: string): UserSettings | null => {
  try {
    const allUserSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    return allUserSettings[userId] || null;
  } catch (error) {
    console.error('Failed to get settings for user:', error);
    return null;
  }
};

/**
 * Save settings for a specific user (admin function)
 */
export const saveSettingsForUser = (userId: string, settings: Partial<UserSettings>): boolean => {
  try {
    const allUserSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    const currentSettings = allUserSettings[userId] || createDefaultUserSettings(userId, '');
    
    const updatedSettings: UserSettings = {
      ...currentSettings,
      ...settings,
      userId,
      updatedAt: new Date().toISOString()
    };
    
    allUserSettings[userId] = updatedSettings;
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(allUserSettings));
    
    return true;
  } catch (error) {
    console.error('Failed to save settings for user:', error);
    return false;
  }
};
