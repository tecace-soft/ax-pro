import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../services/api';
import { isBackendAvailable } from '../../services/devMode';
import { getSession } from '../../services/auth';

export interface Session {
  id: string;
  title?: string;
  status: 'open' | 'closed' | 'archived';
  createdAt: string;
  updatedAt: string;
  lastMessage?: {
    content: string;
    role: string;
    createdAt: string;
  };
}

export const useSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Get user-specific localStorage key
  const getUserStorageKey = () => {
    const session = getSession();
    const userId = session?.userId || 'anonymous';
    return `axpro_sim_sessions_${userId}`;
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        const data = await sessionsApi.list();
        setSessions(data);
      } else {
        // Use local sessions for simulation mode - user-specific
        const userStorageKey = getUserStorageKey();
        const localSessions = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
        console.log(`Loading sessions for user: ${getSession()?.userId || 'anonymous'}, key: ${userStorageKey}`);
        setSessions(localSessions);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title?: string) => {
    try {
      console.log('Creating new session...');
      const backendAvailable = await isBackendAvailable();
      console.log('Backend available:', backendAvailable);
      
      if (backendAvailable) {
        console.log('Using backend API for session creation');
        const { id } = await sessionsApi.create(title);
        await fetchSessions(); // Refresh list
        navigate(`/chat/${id}`);
        return id;
      } else {
        console.log('Using local storage for session creation');
        // Create local session
        const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newSession: Session = {
          id,
          title: title || 'New Chat',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Store in localStorage - user-specific
        const userStorageKey = getUserStorageKey();
        const existingSessions = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
        existingSessions.push(newSession);
        localStorage.setItem(userStorageKey, JSON.stringify(existingSessions));
        console.log(`Created session for user: ${getSession()?.userId || 'anonymous'}, key: ${userStorageKey}`);
        
        console.log('Session created successfully:', newSession);
        await fetchSessions(); // Refresh list
        navigate(`/chat/${id}`);
        return id;
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
      throw err;
    }
  };

  const updateSession = async (id: string, updates: { title?: string; status?: string }) => {
    try {
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        await sessionsApi.update(id, updates);
      } else {
        // Update local session for simulation mode - user-specific
        const userStorageKey = getUserStorageKey();
        const localSessions = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
        const sessionIndex = localSessions.findIndex((s: Session) => s.id === id);
        if (sessionIndex !== -1) {
          localSessions[sessionIndex] = {
            ...localSessions[sessionIndex],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(userStorageKey, JSON.stringify(localSessions));
        }
      }
      
      await fetchSessions(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
      throw err;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      console.log('deleteSession called with id:', id);
      const backendAvailable = await isBackendAvailable();
      console.log('Backend available:', backendAvailable);
      
      if (backendAvailable) {
        console.log('Deleting via backend API');
        await sessionsApi.delete(id);
      } else {
        console.log('Deleting from localStorage');
        // Delete local session for simulation mode - user-specific
        const userStorageKey = getUserStorageKey();
        const localSessions = JSON.parse(localStorage.getItem(userStorageKey) || '[]');
        console.log('Current sessions before delete:', localSessions.length);
        const updatedSessions = localSessions.filter((s: Session) => s.id !== id);
        console.log('Sessions after delete:', updatedSessions.length);
        localStorage.setItem(userStorageKey, JSON.stringify(updatedSessions));
        
        // Also delete associated messages - user-specific
        const userMessageStorageKey = `axpro_sim_messages_${getSession()?.userId || 'anonymous'}_${id}`;
        localStorage.removeItem(userMessageStorageKey);
        console.log('Deleted associated messages for session:', id, 'key:', userMessageStorageKey);
      }
      
      console.log('Refreshing sessions list');
      await fetchSessions(); // Refresh list
      
      // If we deleted the current session, navigate to the most recent one
      const remainingSessions = sessions.filter(s => s.id !== id);
      console.log('Remaining sessions:', remainingSessions.length);
      if (remainingSessions.length > 0) {
        navigate(`/chat/${remainingSessions[0].id}`);
      } else {
        navigate('/chat');
      }
      console.log('Delete session completed successfully');
    } catch (err) {
      console.error('Error in deleteSession:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      throw err;
    }
  };

  const closeSession = async (id: string) => {
    await updateSession(id, { status: 'closed' });
  };

  const reopenSession = async (id: string) => {
    await updateSession(id, { status: 'open' });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    closeSession,
    reopenSession,
    refresh: fetchSessions
  };
};
