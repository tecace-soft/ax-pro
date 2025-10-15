// API service for chat functionality
// Use relative base so it works on Render (same origin)
const API_BASE = '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Generic fetch wrapper with auth cookies
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Include cookies for auth
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(response.status, errorData.error || 'Request failed');
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network error or other fetch error
    throw new ApiError(0, `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Auth API
export const authApi = {
  async demoLogin(email: string, password: string) {
    return apiRequest<{ email: string; role: string }>('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async getMe() {
    return apiRequest<{ email: string; role: string }>('/auth/me');
  },

  async logout() {
    return apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// Sessions API
export const sessionsApi = {
  async list(limit = 20, cursor?: string) {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);
    return apiRequest<any[]>(`/sessions?${params}`);
  },

  async create(title?: string) {
    return apiRequest<{ id: string }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  async get(id: string) {
    return apiRequest<any>(`/sessions/${id}`);
  },

  async update(id: string, updates: { title?: string; status?: string }) {
    return apiRequest<any>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async delete(id: string) {
    return apiRequest<{ success: boolean }>(`/sessions/${id}`, {
      method: 'DELETE',
    });
  },
};

// Messages API
export const messagesApi = {
  async list(sessionId: string, limit = 50, cursor?: string, direction = 'older') {
    const params = new URLSearchParams({ limit: limit.toString(), direction });
    if (cursor) params.append('cursor', cursor);
    return apiRequest<any[]>(`/sessions/${sessionId}/messages?${params}`);
  },

  async send(sessionId: string, content: string, stream = false) {
    if (stream) {
      // Handle streaming response
      const response = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, stream: true }),
      });

      if (!response.ok) {
        throw new ApiError(response.status, 'Stream request failed');
      }

      return response;
    } else {
      return apiRequest<{ reply: string; messageId: string; citations: any[] }>(
        `/sessions/${sessionId}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content, stream: false }),
        }
      );
    }
  },
};

// Feedback API
export const feedbackApi = {
  async submit(messageId: string, rating: 1 | -1, note?: string) {
    return apiRequest<{ success: boolean }>(`/messages/${messageId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ rating, note }),
    });
  },
};

export { ApiError };
