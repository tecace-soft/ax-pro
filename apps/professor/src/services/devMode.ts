// Development mode utilities
export const isBackendAvailable = async (): Promise<boolean> => {
  // Check if n8n webhook is configured
  const n8nWebhook = localStorage.getItem('axpro_n8n_webhook_url');
  
  if (n8nWebhook && n8nWebhook.trim()) {
    console.log('Backend check: n8n webhook configured, using real backend');
    return true;
  }
  
  console.log('Backend check: No n8n webhook configured, using simulation mode');
  return false;
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
