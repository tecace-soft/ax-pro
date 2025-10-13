// Development mode utilities
export const isBackendAvailable = async (): Promise<boolean> => {
  // Check if n8n webhook is configured (check both old and new storage methods)
  const oldWebhook = localStorage.getItem('axpro_n8n_webhook_url');
  const n8nConfigs = localStorage.getItem('axpro_n8n_configs');
  
  // Check new multi-config system first
  if (n8nConfigs) {
    try {
      const configs = JSON.parse(n8nConfigs);
      if (Array.isArray(configs) && configs.length > 0 && configs[0].webhookUrl) {
        console.log('Backend check: n8n webhook configured (multi-config), using real backend');
        return true;
      }
    } catch (e) {
      console.error('Failed to parse n8n configs:', e);
    }
  }
  
  // Fall back to checking old single webhook URL
  if (oldWebhook && oldWebhook.trim()) {
    console.log('Backend check: n8n webhook configured (legacy), using real backend');
    return true;
  }
  
  console.log('Backend check: No n8n webhook configured, using simulation mode');
  return false;
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
