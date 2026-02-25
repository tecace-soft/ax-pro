// Development mode utilities

/**
 * Check if backend API server is available (for sessions, auth, etc.)
 * This is different from n8n webhook availability
 */
export const isBackendAvailable = async (): Promise<boolean> => {
  // For now, we don't have a backend API server for sessions
  // We only have n8n webhook for chat messages
  // Sessions are handled locally in localStorage
  return false;
};

/**
 * Check if n8n webhook is configured for chat messages
 */
export const isN8nWebhookAvailable = (): boolean => {
  // Check environment variables first (new secure method)
  const envWebhookUrl = (import.meta as any).env?.VITE_N8N_BASE_URL;
  if (envWebhookUrl && envWebhookUrl.trim()) {
    return true;
  }
  
  // Check both old and new storage methods
  const oldWebhook = localStorage.getItem('axpro_n8n_webhook_url');
  const n8nConfigs = localStorage.getItem('axpro_n8n_configs');
  
  // Check new multi-config system first
  if (n8nConfigs) {
    try {
      const configs = JSON.parse(n8nConfigs);
      if (Array.isArray(configs) && configs.length > 0 && configs[0].webhookUrl) {
        return true;
      }
    } catch (e) {
    }
  }
  
  // Fall back to checking old single webhook URL
  if (oldWebhook && oldWebhook.trim()) {
    return true;
  }
  return false;
};

export const DEV_MODE = process.env.NODE_ENV === 'development';

/**
 * Check if simulation mode is enabled
 */
export const isSimulationModeEnabled = (): boolean => {
  // Check environment variable first
  const envSimulation = (import.meta as any).env?.VITE_ENABLE_SIMULATION;
  if (envSimulation !== undefined) {
    return envSimulation === 'true' || envSimulation === '1';
  }
  
  // Check localStorage setting
  const setting = localStorage.getItem('axpro_enable_simulation');
  if (setting !== null) {
    return setting === 'true';
  }
  
  // Default: disabled (no simulation mode)
  return false;
};

/**
 * Set simulation mode setting
 */
export const setSimulationModeEnabled = (enabled: boolean): void => {
  localStorage.setItem('axpro_enable_simulation', enabled.toString());
};
