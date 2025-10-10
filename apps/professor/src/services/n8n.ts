export interface N8nConfig {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface N8nRequest {
  sessionId: string;
  action: 'sendMessage';
  chatInput: string;
}

export interface N8nResponse {
  answer: string;
  citationTitle?: string;
  citationContent?: string;
}

const N8N_CONFIGS_KEY = 'axpro_n8n_configs';
const ACTIVE_N8N_CONFIG_KEY = 'axpro_active_n8n_config';

// Default n8n configuration
const DEFAULT_N8N_CONFIG: N8nConfig = {
  id: 'default',
  name: 'Default n8n Webhook',
  webhookUrl: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

/**
 * Get all n8n configurations
 */
export const getN8nConfigs = (): N8nConfig[] => {
  try {
    const configs = localStorage.getItem(N8N_CONFIGS_KEY);
    if (!configs) {
      // Initialize with default config
      const defaultConfigs = [DEFAULT_N8N_CONFIG];
      localStorage.setItem(N8N_CONFIGS_KEY, JSON.stringify(defaultConfigs));
      localStorage.setItem(ACTIVE_N8N_CONFIG_KEY, DEFAULT_N8N_CONFIG.id);
      console.log('Initialized with default n8n config:', DEFAULT_N8N_CONFIG);
      return defaultConfigs;
    }
    const parsedConfigs = JSON.parse(configs);
    console.log('Loaded n8n configs from localStorage:', parsedConfigs);
    return parsedConfigs;
  } catch (error) {
    console.error('Failed to get n8n configs:', error);
    return [DEFAULT_N8N_CONFIG];
  }
};

/**
 * Save n8n configurations
 */
export const saveN8nConfigs = (configs: N8nConfig[]): void => {
  try {
    localStorage.setItem(N8N_CONFIGS_KEY, JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save n8n configs:', error);
  }
};

/**
 * Get active n8n configuration
 */
export const getActiveN8nConfig = (): N8nConfig | null => {
  try {
    const activeId = localStorage.getItem(ACTIVE_N8N_CONFIG_KEY);
    console.log('Active n8n config ID:', activeId);
    
    if (!activeId) {
      console.log('No active ID, using default config');
      return DEFAULT_N8N_CONFIG;
    }
    
    const configs = getN8nConfigs();
    console.log('Available n8n configs:', configs);
    
    const activeConfig = configs.find(config => config.id === activeId) || DEFAULT_N8N_CONFIG;
    console.log('Selected active config:', activeConfig);
    
    return activeConfig;
  } catch (error) {
    console.error('Failed to get active n8n config:', error);
    return DEFAULT_N8N_CONFIG;
  }
};

/**
 * Set active n8n configuration
 */
export const setActiveN8nConfig = (configId: string): void => {
  try {
    localStorage.setItem(ACTIVE_N8N_CONFIG_KEY, configId);
  } catch (error) {
    console.error('Failed to set active n8n config:', error);
  }
};

/**
 * Add new n8n configuration
 */
export const addN8nConfig = (config: Omit<N8nConfig, 'id' | 'createdAt' | 'updatedAt'>): N8nConfig => {
  const newConfig: N8nConfig = {
    ...config,
    id: `n8n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  const configs = getN8nConfigs();
  configs.push(newConfig);
  saveN8nConfigs(configs);
  
  return newConfig;
};

/**
 * Update n8n configuration
 */
export const updateN8nConfig = (id: string, updates: Partial<Omit<N8nConfig, 'id' | 'createdAt'>>): N8nConfig | null => {
  const configs = getN8nConfigs();
  const index = configs.findIndex(config => config.id === id);
  
  if (index === -1) {
    return null;
  }
  
  configs[index] = {
    ...configs[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  saveN8nConfigs(configs);
  return configs[index];
};

/**
 * Delete n8n configuration
 */
export const deleteN8nConfig = (id: string): boolean => {
  const configs = getN8nConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  
  if (filteredConfigs.length === configs.length) {
    return false; // Config not found
  }
  
  saveN8nConfigs(filteredConfigs);
  
  // If we deleted the active config, set the first one as active
  const activeId = localStorage.getItem(ACTIVE_N8N_CONFIG_KEY);
  if (activeId === id && filteredConfigs.length > 0) {
    setActiveN8nConfig(filteredConfigs[0].id);
  }
  
  return true;
};

/**
 * Send message to n8n webhook
 */
export const sendToN8n = async (request: N8nRequest): Promise<N8nResponse> => {
  const activeConfig = getActiveN8nConfig();
  console.log('Sending to n8n with config:', activeConfig);
  console.log('Request payload:', request);
  
  if (!activeConfig) {
    throw new Error('No active n8n configuration found');
  }

  try {
    console.log('Making request to:', activeConfig.webhookUrl);
    const response = await fetch(activeConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([request])
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('n8n response:', data);
    return data;
  } catch (error) {
    console.error('Failed to send to n8n:', error);
    throw error;
  }
};

/**
 * Test n8n webhook connection
 */
export const testN8nConnection = async (webhookUrl: string): Promise<boolean> => {
  try {
    const testRequest: N8nRequest = {
      sessionId: 'test-session',
      action: 'sendMessage',
      chatInput: 'Test connection'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([testRequest])
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to test n8n connection:', error);
    return false;
  }
};
