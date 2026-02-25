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
  chatId: string;
  userId: string;
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
  webhookUrl: 'https://n8n.srv1153481.hstgr.cloud/webhook/bdf7e8e7-8592-4518-a4ee-335c235ff94b',
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
      return defaultConfigs;
    }
    const parsedConfigs = JSON.parse(configs);
    return parsedConfigs;
  } catch (error) {
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
  }
};

/**
 * Get active n8n configuration
 */
export const getActiveN8nConfig = (): N8nConfig | null => {
  try {
    const activeId = localStorage.getItem(ACTIVE_N8N_CONFIG_KEY);
    if (!activeId) {
      return DEFAULT_N8N_CONFIG;
    }
    
    const configs = getN8nConfigs();
    const activeConfig = configs.find(config => config.id === activeId) || DEFAULT_N8N_CONFIG;
    return activeConfig;
  } catch (error) {
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
  if (!activeConfig) {
    throw new Error('No active n8n configuration found');
  }

  // Skip the HEAD request test as it may cause CORS issues

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 second timeout
    
    const response = await fetch(activeConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    // Get response text first
    const responseText = await response.text();
    // Log if we get the error message
    if (responseText.includes('No response from webhook')) {
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
    }
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from webhook. Please check your workflow configuration.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}...`);
    }
    
    // Check if the response contains the error message
    let responseData;
    if (Array.isArray(data)) {
      responseData = data[0];
    } else if (data && typeof data === 'object') {
      responseData = data;
    } else {
      throw new Error('Unexpected response format from n8n webhook');
    }
    // Check if the response contains the error message
    if (responseData && responseData.answer && responseData.answer.includes('No response from webhook')) {
      throw new Error('Webhook returned error: ' + responseData.answer);
    }
    
    // Also check if the response is just the error message string
    if (responseData && typeof responseData === 'string' && responseData.includes('No response from webhook')) {
      throw new Error('Webhook returned error: ' + responseData);
    }
    
    // Check if the response is an object with the error message in any field
    if (responseData && typeof responseData === 'object') {
      const responseString = JSON.stringify(responseData);
      if (responseString.includes('No response from webhook')) {
        throw new Error('Webhook returned error: ' + responseString);
      }
    }
    
    return responseData;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Webhook request timed out after 30 seconds');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach webhook');
    } else {
      throw error;
    }
  }
};

/**
 * Test n8n webhook connection
 */
export const testN8nConnection = async (webhookUrl: string): Promise<boolean> => {
  try {
    const testRequest: N8nRequest = {
      sessionId: 'test-session',
      chatId: 'test-chat-' + Date.now(),
      userId: 'test-user',
      action: 'sendMessage',
      chatInput: 'Test connection'
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testRequest)
    });

    return response.ok;
  } catch (error) {
    return false;
  }
};
