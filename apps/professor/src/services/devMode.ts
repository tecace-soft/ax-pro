// Development mode utilities

/**
 * Check if backend API server is available (for sessions, auth, etc.)
 * This is different from n8n webhook availability
 */
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/health', { credentials: 'include' });
    return res.ok;
  } catch (e) {
    return false;
  }
};

/**
 * Check if n8n webhook is configured for chat messages
 */
export const isN8nWebhookAvailable = (): boolean => {
  // Check both old and new storage methods
  const oldWebhook = localStorage.getItem('axpro_n8n_webhook_url');
  const n8nConfigs = localStorage.getItem('axpro_n8n_configs');
  
  // Check new multi-config system first
  if (n8nConfigs) {
    try {
      const configs = JSON.parse(n8nConfigs);
      if (Array.isArray(configs) && configs.length > 0 && configs[0].webhookUrl) {
        console.log('n8n webhook check: Configured (multi-config)');
        return true;
      }
    } catch (e) {
      console.error('Failed to parse n8n configs:', e);
    }
  }
  
  // Fall back to checking old single webhook URL
  if (oldWebhook && oldWebhook.trim()) {
    console.log('n8n webhook check: Configured (legacy)');
    return true;
  }
  
  console.log('n8n webhook check: Not configured');
  return false;
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
