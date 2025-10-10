import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsApi } from '../../services/api';
import { isBackendAvailable } from '../../services/devMode';

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

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        const data = await sessionsApi.list();
        setSessions(data);
      } else {
        // Use local sessions for simulation mode
        const localSessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
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
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        const { id } = await sessionsApi.create(title);
        await fetchSessions(); // Refresh list
        navigate(`/chat/${id}`);
        return id;
      } else {
        // Create local session for simulation mode
        const id = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newSession: Session = {
          id,
          title: title || 'New Chat',
          status: 'open',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Store in localStorage for simulation mode
        const existingSessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
        existingSessions.push(newSession);
        localStorage.setItem('axpro_sim_sessions', JSON.stringify(existingSessions));
        
        await fetchSessions(); // Refresh list
        navigate(`/chat/${id}`);
        return id;
      }
    } catch (err) {
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
        // Update local session for simulation mode
        const localSessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
        const sessionIndex = localSessions.findIndex((s: Session) => s.id === id);
        if (sessionIndex !== -1) {
          localSessions[sessionIndex] = {
            ...localSessions[sessionIndex],
            ...updates,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem('axpro_sim_sessions', JSON.stringify(localSessions));
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
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        await sessionsApi.delete(id);
      } else {
        // Delete local session for simulation mode
        const localSessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
        const updatedSessions = localSessions.filter((s: Session) => s.id !== id);
        localStorage.setItem('axpro_sim_sessions', JSON.stringify(updatedSessions));
        
        // Also delete associated messages
        localStorage.removeItem(`axpro_sim_messages_${id}`);
      }
      
      await fetchSessions(); // Refresh list
      
      // If we deleted the current session, navigate to the most recent one
      const remainingSessions = sessions.filter(s => s.id !== id);
      if (remainingSessions.length > 0) {
        navigate(`/chat/${remainingSessions[0].id}`);
      } else {
        navigate('/chat');
      }
    } catch (err) {
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
