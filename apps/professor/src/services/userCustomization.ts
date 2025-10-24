// User-specific customization service
// Manages custom UI settings for specific users

export interface DashboardCustomization {
  userId: string;
  email: string;
  theme?: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
  };
  branding?: {
    dashboardTitle?: string;
    logoUrl?: string;
    welcomeMessage?: string;
  };
  layout?: {
    hideSections?: string[]; // Section IDs to hide
    sectionOrder?: string[]; // Custom order of sections
  };
  features?: {
    enabledFeatures?: string[];
    disabledFeatures?: string[];
  };
}

// Define customizations for specific users
const USER_CUSTOMIZATIONS: Record<string, DashboardCustomization> = {
  'professor@tecace.com': {
    userId: 'professor_001',
    email: 'professor@tecace.com',
    theme: {
      primaryColor: '#6366f1', // Indigo
      accentColor: '#8b5cf6', // Purple
      backgroundColor: '#0f172a', // Darker slate
    },
    branding: {
      dashboardTitle: 'Professor Dashboard',
      welcomeMessage: 'Welcome, Professor',
    },
    layout: {
      // Example: hide certain sections or reorder them
      hideSections: [],
      sectionOrder: [
        'performance-radar',
        'daily-message-activity',
        'recent-conversations',
        'admin-feedback',
        'user-feedback',
        'prompt-control'
      ]
    },
    features: {
      enabledFeatures: ['advanced-analytics', 'custom-reports'],
      disabledFeatures: []
    }
  }
};

/**
 * Get customization settings for a specific user
 * @param email - User's email address
 * @returns DashboardCustomization | null
 */
export const getUserCustomization = (email: string): DashboardCustomization | null => {
  const normalizedEmail = email.toLowerCase().trim();
  return USER_CUSTOMIZATIONS[normalizedEmail] || null;
};

/**
 * Check if a user has custom settings
 * @param email - User's email address
 * @returns boolean
 */
export const hasCustomization = (email: string): boolean => {
  return getUserCustomization(email) !== null;
};

/**
 * Apply theme customization to CSS variables
 * @param customization - User's customization settings
 */
export const applyThemeCustomization = (customization: DashboardCustomization | null): void => {
  if (!customization || !customization.theme) {
    return;
  }

  const root = document.documentElement;
  const { theme } = customization;

  if (theme.primaryColor) {
    root.style.setProperty('--admin-primary', theme.primaryColor);
  }
  if (theme.accentColor) {
    root.style.setProperty('--admin-accent', theme.accentColor);
  }
  if (theme.backgroundColor) {
    root.style.setProperty('--admin-bg', theme.backgroundColor);
  }
};

/**
 * Reset theme customization to defaults
 */
export const resetThemeCustomization = (): void => {
  const root = document.documentElement;
  root.style.removeProperty('--admin-primary');
  root.style.removeProperty('--admin-accent');
  root.style.removeProperty('--admin-bg');
};

/**
 * Check if a section should be visible for the user
 * @param sectionId - Section identifier
 * @param customization - User's customization settings
 * @returns boolean
 */
export const isSectionVisible = (
  sectionId: string,
  customization: DashboardCustomization | null
): boolean => {
  if (!customization || !customization.layout || !customization.layout.hideSections) {
    return true;
  }
  return !customization.layout.hideSections.includes(sectionId);
};

/**
 * Check if a feature is enabled for the user
 * @param featureId - Feature identifier
 * @param customization - User's customization settings
 * @returns boolean
 */
export const isFeatureEnabled = (
  featureId: string,
  customization: DashboardCustomization | null
): boolean => {
  if (!customization || !customization.features) {
    return true; // Default to enabled
  }

  const { enabledFeatures, disabledFeatures } = customization.features;

  if (disabledFeatures && disabledFeatures.includes(featureId)) {
    return false;
  }

  if (enabledFeatures && enabledFeatures.length > 0) {
    return enabledFeatures.includes(featureId);
  }

  return true;
};

