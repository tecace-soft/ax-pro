// Development mode utilities
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      mode: 'cors',
    });
    return response.ok;
  } catch (error) {
    console.log('Backend not available, will use n8n or simulation:', error);
    return false;
  }
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
