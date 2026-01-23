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
    webhookUrl: 'https://n8n.srv1153481.hstgr.cloud/webhook/bdf7e8e7-8592-4518-a4ee-335c235ff94b',
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

// User-specific settings for Admin (preserves original settings)
const ADMIN_SETTINGS: Partial<UserSettings> = {
  n8nConfigs: [{
    id: 'admin_default',
    name: 'Admin Default Webhook',
    webhookUrl: 'https://n8n.srv1153481.hstgr.cloud/webhook/bdf7e8e7-8592-4518-a4ee-335c235ff94b',
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
// Global, universal overrides that apply to ALL users
const UNIVERSAL_OVERRIDES_KEY = 'axpro_universal_overrides';

type UniversalOverrides = Partial<Pick<UserSettings, 'n8nConfigs' | 'activeN8nConfigId' | 'supabaseConfig'>>;

const readUniversalOverrides = (): UniversalOverrides => {
  try {
    return JSON.parse(localStorage.getItem(UNIVERSAL_OVERRIDES_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeUniversalOverrides = (updates: UniversalOverrides): void => {
  const current = readUniversalOverrides();
  const merged = { ...current, ...updates } as UniversalOverrides;
  localStorage.setItem(UNIVERSAL_OVERRIDES_KEY, JSON.stringify(merged));
};

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
  
  // Universal fallback: use Admin settings for any new user
  return {
    userId,
    email,
    ...ADMIN_SETTINGS,
    createdAt: now,
    updatedAt: now
  } as UserSettings;
};

/**
 * Get user-specific N8n configurations
 */
export const getUserN8nConfigs = (): N8nConfig[] => {
  // Universal override first
  const universal = readUniversalOverrides();
  if (universal.n8nConfigs && universal.n8nConfigs.length > 0) {
    return universal.n8nConfigs as N8nConfig[];
  }
  const userSettings = getUserSettings();
  return userSettings?.n8nConfigs || (ADMIN_SETTINGS.n8nConfigs as N8nConfig[]) || [];
};

/**
 * Save user-specific N8n configurations
 */
export const saveUserN8nConfigs = (configs: N8nConfig[]): boolean => {
  // Save per-user and universal to enforce identical config
  writeUniversalOverrides({ n8nConfigs: configs });
  return saveUserSettings({ n8nConfigs: configs });
};

/**
 * Get user's active N8n configuration
 */
export const getUserActiveN8nConfig = (): N8nConfig | null => {
  const universal = readUniversalOverrides();
  const configs = getUserN8nConfigs();
  const activeId = universal.activeN8nConfigId || (getUserSettings()?.activeN8nConfigId ?? '');
  if (activeId) {
    const found = configs.find(c => c.id === activeId);
    if (found) return found;
  }
  return configs[0] || null;
};

/**
 * Set user's active N8n configuration
 */
export const setUserActiveN8nConfig = (configId: string): boolean => {
  writeUniversalOverrides({ activeN8nConfigId: configId });
  return saveUserSettings({ activeN8nConfigId: configId });
};

/**
 * Get user-specific Supabase configuration
 */
export const getUserSupabaseConfig = (): SupabaseConfig => {
  // Universal override first
  const universal = readUniversalOverrides();
  if (universal.supabaseConfig && universal.supabaseConfig.url) {
    return universal.supabaseConfig as SupabaseConfig;
  }
  const userSettings = getUserSettings();
  return userSettings?.supabaseConfig || (ADMIN_SETTINGS.supabaseConfig as SupabaseConfig) || { url: '', anonKey: '' };
};

/**
 * Save user-specific Supabase configuration
 */
export const saveUserSupabaseConfig = (config: SupabaseConfig): boolean => {
  // Save per-user and universal
  writeUniversalOverrides({ supabaseConfig: config });
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
