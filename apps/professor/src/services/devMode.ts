// Development mode utilities
export const isBackendAvailable = async (): Promise<boolean> => {
  // For now, always return false since we don't have a real backend
  // This forces the app to use simulation mode
  console.log('Backend check: Forcing simulation mode (no real backend available)');
  return false;
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
