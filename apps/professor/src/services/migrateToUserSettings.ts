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

    // Create user-specific settings based on user type
    let userSettings;
    
    if (session.userId === 'seokhoon_kang_001' || session.email === 'hana@tecace.com') {
      // SeokHoon Kang gets his custom settings
      userSettings = {
        userId: session.userId,
        email: session.email,
        n8nConfigs: [{
          id: 'seokhoon_default',
          name: 'SeokHoon Kang Webhook',
          webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/63647efd-8c39-42d5-8e1f-b465d62091c6',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        activeN8nConfigId: 'seokhoon_default',
        supabaseConfig: {
          url: 'https://oomjruguisqdahcrvfws.supabase.co',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vbWpydWd1aXNxZGFoY3J2ZndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNjAxNTUsImV4cCI6MjA3NjYzNjE1NX0.gPLhFgvyCXozmUwbdNDTRp2_-pDH4rHQCJuyPotR8Vo'
        },
        apiConfigs: apiConfigs,
        uiCustomization: uiCustomization,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (session.userId === '409esj1923' || session.email === 'chatbot-admin@tecace.com') {
      // Admin gets original settings preserved
      userSettings = {
        userId: session.userId,
        email: session.email,
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
        },
        apiConfigs: apiConfigs,
        uiCustomization: uiCustomization,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else if (session.userId === 'user123456' || session.email === 'chatbot-user@tecace.com') {
      // Regular User gets Admin's webhook settings
      userSettings = {
        userId: session.userId,
        email: session.email,
        n8nConfigs: [{
          id: 'regular_user_default',
          name: 'Regular User Webhook (Admin)',
          webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }],
        activeN8nConfigId: 'regular_user_default',
        supabaseConfig: {
          url: 'https://qpyteahuynkgkbmdasbv.supabase.co',
          anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFweXRlYWh1eW5rZ2tibWRhc2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDk2NTcsImV4cCI6MjA3NTUyNTY1N30.qvp5ox6Xm0wYcZK89S2MYVu18fqyfYmT8nercIFMKOY'
        },
        apiConfigs: apiConfigs,
        uiCustomization: uiCustomization,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } else {
      // Other users get migrated global settings
      userSettings = {
        userId: session.userId,
        email: session.email,
        n8nConfigs: n8nConfigs,
        activeN8nConfigId: activeN8nConfigId,
        supabaseConfig: {
          url: supabaseUrl,
          anonKey: supabaseAnonKey
        },
        apiConfigs: apiConfigs,
        uiCustomization: uiCustomization,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }

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

  // Check if user has existing settings
  const existingSettings = localStorage.getItem('axpro_user_settings');
  if (!existingSettings) {
    migrateToUserSettings();
    return;
  }

  try {
    const allUserSettings = JSON.parse(existingSettings);
    if (!allUserSettings[session.userId]) {
      migrateToUserSettings();
    }
  } catch (error) {
    console.error('Failed to check migration status:', error);
    migrateToUserSettings();
  }
};
