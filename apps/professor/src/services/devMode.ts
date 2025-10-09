// Development mode utilities
export const isBackendAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3001/api/auth/me', {
      method: 'GET',
      credentials: 'include',
    });
    return response.status !== 0; // 0 means network error
  } catch {
    return false;
  }
};

export const DEV_MODE = process.env.NODE_ENV === 'development';
