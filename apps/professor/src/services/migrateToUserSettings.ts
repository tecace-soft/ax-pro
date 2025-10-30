import { getSession } from './auth';
import { saveUserSettings } from './userSettings';

/**
 * Migrate existing global settings to user-specific settings
 * This should be called when a user logs in for the first time
 */
export const migrateToUserSettings = (): void => {
  const session = getSession();
  if (!session) {
    return;
  }

  try {
    // Check if user already has settings
    const existingSettings = localStorage.getItem('axpro_user_settings');
    if (existingSettings) {
      const allUserSettings = JSON.parse(existingSettings);
      if (allUserSettings[session.userId]) {
        console.log('User already has settings, skipping migration');
        return;
      }
    }

    console.log('Migrating global settings to user-specific settings for:', session.email);

    // Migrate N8n settings
    const n8nConfigs = JSON.parse(localStorage.getItem('axpro_n8n_configs') || '[]');
    const activeN8nConfigId = localStorage.getItem('axpro_active_n8n_config') || '';

    // Migrate Supabase settings
    const supabaseUrl = localStorage.getItem('axpro_supabase_url') || '';
    const supabaseAnonKey = localStorage.getItem('axpro_supabase_anon_key') || '';

    // Migrate API settings
    const apiConfigs = JSON.parse(localStorage.getItem('axpro_api_configs') || '[]');

    // Migrate UI customization
    const uiCustomization = JSON.parse(localStorage.getItem('axpro_ui_customization') || '{}');

    // Universal config: apply Admin's webhook and Supabase settings for ALL users
    const userSettings = {
      userId: session.userId,
      email: session.email,
      n8nConfigs: [{
        id: 'universal_default',
        name: 'Universal Default Webhook (Admin)',
        webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      activeN8nConfigId: 'universal_default',
      supabaseConfig: {
        url: 'https://qpyteahuynkgkbmdasbv.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY'
      },
      apiConfigs: apiConfigs,
      uiCustomization: uiCustomization,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;

    // Save user settings
    saveUserSettings(userSettings);
    console.log('Successfully migrated settings for user:', session.email);

  } catch (error) {
    console.error('Failed to migrate settings:', error);
  }
};

/**
 * Check if migration is needed and perform it
 */
export const checkAndMigrateSettings = (): void => {
  const session = getSession();
  if (!session) {
    return;
  }
  // Always apply the universal settings on startup/login to ensure consistency
  migrateToUserSettings();
};
