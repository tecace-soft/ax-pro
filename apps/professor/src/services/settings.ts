// Settings service for API configuration management
export interface ApiConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// UI customization settings
export interface UICustomization {
  chatTitle: string;
  chatSubtitle: string;
  avatarUrl: string;
  suggestedQuestions: {
    question1: string;
    question2: string;
    question3: string;
    question4: string;
  };
}

// Simple encryption for API keys (in production, use proper encryption)
const encrypt = (text: string): string => {
  return btoa(text); // Base64 encoding for demo
};

const decrypt = (encrypted: string): string => {
  try {
    return atob(encrypted); // Base64 decoding
  } catch {
    return '';
  }
};

const SETTINGS_KEY = 'axpro_api_configs';
const UI_CUSTOMIZATION_KEY = 'axpro_ui_customization';

export const settingsService = {
  // Get all API configurations
  getConfigs(): ApiConfig[] {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return [];
      
      const configs = JSON.parse(stored);
      // Decrypt API keys
      return configs.map((config: any) => ({
        ...config,
        apiKey: decrypt(config.apiKey)
      }));
    } catch {
      return [];
    }
  },

  // Save API configuration
  saveConfig(config: Omit<ApiConfig, 'id' | 'createdAt' | 'updatedAt'>): ApiConfig {
    const configs = this.getConfigs();
    const now = new Date().toISOString();
    
    const newConfig: ApiConfig = {
      ...config,
      id: `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      apiKey: config.apiKey, // Will be encrypted when stored
      createdAt: now,
      updatedAt: now
    };

    // Encrypt API key before storing
    const configToStore = {
      ...newConfig,
      apiKey: encrypt(newConfig.apiKey)
    };

    const updatedConfigs = [...configs.filter(c => c.id !== config.id), configToStore];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedConfigs));
    
    return newConfig;
  },

  // Update API configuration
  updateConfig(id: string, updates: Partial<Omit<ApiConfig, 'id' | 'createdAt'>>): ApiConfig | null {
    const configs = this.getConfigs();
    const configIndex = configs.findIndex(c => c.id === id);
    
    if (configIndex === -1) return null;

    const updatedConfig = {
      ...configs[configIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Encrypt API key if it was updated
    const configToStore = {
      ...updatedConfig,
      apiKey: encrypt(updatedConfig.apiKey)
    };

    configs[configIndex] = configToStore;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(configs));
    
    return updatedConfig;
  },

  // Delete API configuration
  deleteConfig(id: string): boolean {
    const configs = this.getConfigs();
    const filteredConfigs = configs.filter(c => c.id !== id);
    
    if (filteredConfigs.length === configs.length) return false;
    
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(filteredConfigs));
    return true;
  },

  // Get active configuration
  getActiveConfig(): ApiConfig | null {
    const configs = this.getConfigs();
    return configs.find(c => c.isActive) || null;
  },

  // Set active configuration
  setActiveConfig(id: string): boolean {
    const configs = this.getConfigs();
    const config = configs.find(c => c.id === id);
    
    if (!config) return false;

    // Deactivate all others
    const updatedConfigs = configs.map(c => ({
      ...c,
      isActive: c.id === id
    }));

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedConfigs));
    return true;
  },

  // UI Customization methods
  getUICustomization(): UICustomization {
    const defaultCustomization: UICustomization = {
      chatTitle: 'Chat Interface',
      chatSubtitle: 'Select a conversation from the sidebar or start a new chat',
      avatarUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyMCIgZmlsbD0iIzZCNzI4MCIvPjxwYXRoIGQ9Ik0yMCAxMkM4IDEyIDggMjggOCAyOEMxMiAyNCAxNiAyMiAyMCAyMkMyNCAyMiAyOCAyNCAzMiAyOEMzMiAyOCAzMiAxMiAyMCAxMloiIGZpbGw9IiNGRkZGRkYiLz48Y2lyY2xlIGN4PSIyMCIgY3k9IjE4IiByPSI2IiBmaWxsPSIjRkZGRkZGIi8+PC9zdmc+',
      suggestedQuestions: {
        question1: 'What is artificial intelligence?',
        question2: 'How does machine learning work?',
        question3: 'Explain quantum computing',
        question4: 'What are the benefits of cloud computing?'
      }
    };

    try {
      const stored = localStorage.getItem(UI_CUSTOMIZATION_KEY);
      if (!stored) {
        return defaultCustomization;
      }
      const parsed = JSON.parse(stored);
      // Merge with defaults to handle missing fields
      return { ...defaultCustomization, ...parsed };
    } catch {
      return defaultCustomization;
    }
  },

  saveUICustomization(customization: UICustomization): void {
    localStorage.setItem(UI_CUSTOMIZATION_KEY, JSON.stringify(customization));
  },

  resetUICustomization(): void {
    localStorage.removeItem(UI_CUSTOMIZATION_KEY);
  }
};
