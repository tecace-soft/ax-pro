import { getUserN8nConfigs, saveUserN8nConfigs, getUserActiveN8nConfig, setUserActiveN8nConfig } from './userSettings';

export interface N8nConfig {
  id: string;
  name: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Hard-coded universal admin webhook fallback
const UNIVERSAL_N8N_WEBHOOK = 'https://n8n.srv978041.hstgr.cloud/webhook/db3d9fbd-73bd-444a-a689-842446fffdd9';

export interface N8nRequest {
  sessionId: string;
  chatId: string;
  userId: string;
  action: 'sendMessage';
  chatInput: string;
  groupId?: string;
}

export interface N8nResponse {
  answer: string;
  citationTitle?: string;
  citationContent?: string;
}

/**
 * Get all n8n configurations for current user
 */
export const getN8nConfigs = (): N8nConfig[] => {
  try {
    const configs = getUserN8nConfigs();
    console.log('Loaded user-specific n8n configs:', configs);
    return configs;
  } catch (error) {
    console.error('Failed to get user n8n configs:', error);
    return [];
  }
};

/**
 * Save n8n configurations for current user
 */
export const saveN8nConfigs = (configs: N8nConfig[]): void => {
  try {
    saveUserN8nConfigs(configs);
    console.log('Saved user-specific n8n configs:', configs);
  } catch (error) {
    console.error('Failed to save user n8n configs:', error);
  }
};

/**
 * Get active n8n configuration for current user
 */
export const getActiveN8nConfig = (): N8nConfig | null => {
  try {
    const activeConfig = getUserActiveN8nConfig();
    console.log('Active user n8n config:', activeConfig);
    if (activeConfig) return activeConfig;
    // Fallback to universal webhook if none is configured
    return {
      id: 'universal_default',
      name: 'Universal Default Webhook (Admin)',
      webhookUrl: UNIVERSAL_N8N_WEBHOOK,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to get active user n8n config:', error);
    return {
      id: 'universal_default',
      name: 'Universal Default Webhook (Admin)',
      webhookUrl: UNIVERSAL_N8N_WEBHOOK,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Set active n8n configuration for current user
 */
export const setActiveN8nConfig = (configId: string): void => {
  try {
    setUserActiveN8nConfig(configId);
    console.log('Set active user n8n config:', configId);
  } catch (error) {
    console.error('Failed to set active user n8n config:', error);
  }
};

/**
 * Add new n8n configuration for current user
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
 * Update n8n configuration for current user
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
 * Delete n8n configuration for current user
 */
export const deleteN8nConfig = (id: string): boolean => {
  const configs = getN8nConfigs();
  const filteredConfigs = configs.filter(config => config.id !== id);
  
  if (filteredConfigs.length === configs.length) {
    return false; // Config not found
  }
  
  saveN8nConfigs(filteredConfigs);
  
  // If we deleted the active config, set the first one as active
  const activeConfig = getActiveN8nConfig();
  if (activeConfig?.id === id && filteredConfigs.length > 0) {
    setActiveN8nConfig(filteredConfigs[0].id);
  }
  
  return true;
};

/**
 * Send message to n8n webhook using current user's active configuration
 */
export const sendToN8n = async (request: N8nRequest): Promise<N8nResponse> => {
  const activeConfig = getActiveN8nConfig();
  console.log('Sending to n8n with user config:', activeConfig);
  console.log('Request payload:', request);
  
  if (!activeConfig) {
    throw new Error('No active n8n configuration found for current user');
  }

  try {
    console.log('Making request to:', activeConfig.webhookUrl);
    console.log('Request payload:', JSON.stringify(request));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('n8n webhook request timed out after 30 seconds');
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

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    // Get response text first
    const responseText = await response.text();
    console.log('=== N8N WEBHOOK DEBUG ===');
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text:', responseText);
    console.log('Response text trimmed:', responseText.trim());
    console.log('Is empty?', !responseText || responseText.trim() === '');
    console.log('Response URL:', response.url);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('========================');
    
    if (!response.ok) {
      console.error('Response error:', responseText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
    }
    
    if (!responseText || responseText.trim() === '') {
      console.warn('Empty response from webhook');
      throw new Error('Empty response from webhook. Please check your workflow configuration.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text was:', responseText);
      throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}...`);
    }
    
    console.log('n8n response:', data);
    
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
      console.error('Webhook returned error message:', responseData.answer);
      throw new Error('Webhook returned error: ' + responseData.answer);
    }
    
    return responseData;
  } catch (error: any) {
    console.error('Failed to send to n8n:', error);
    
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
      chatInput: 'Test connection',
      groupId: 'test-group'
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
    console.error('Failed to test n8n connection:', error);
    return false;
  }
};
