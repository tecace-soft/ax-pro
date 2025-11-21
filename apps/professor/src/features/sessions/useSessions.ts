import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { withGroupParam } from '../../utils/navigation';
import { sessionsApi } from '../../services/api';
import { isBackendAvailable } from '../../services/devMode';
import { getSession } from '../../services/auth';
import { 
  fetchSessionsByGroup
} from '../../services/chatData';

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
  const [searchParams] = useSearchParams();

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get group_id from URL or session
      const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
      
      if (!groupId) {
        console.warn('No group_id available, cannot fetch sessions');
        setSessions([]);
        setLoading(false);
        return;
      }
      
      // Try to fetch sessions from Supabase filtered by group_id
      // If session table doesn't exist or has issues, gracefully handle it
      try {
        const sessionData = await fetchSessionsByGroup(groupId);
        
        // Convert SessionData to Session format
        const convertedSessions: Session[] = sessionData.map(s => ({
          id: s.session_id,
          title: s.title || undefined,
          status: (s.status || 'open') as 'open' | 'closed' | 'archived', // Default to 'open' if status doesn't exist
          createdAt: s.created_at || new Date().toISOString(),
          updatedAt: s.updated_at || s.created_at || new Date().toISOString()
        }));
        
        setSessions(convertedSessions);
        console.log(`✅ Loaded ${convertedSessions.length} sessions from Supabase for group: ${groupId}`);
      } catch (fetchError) {
        // If session table doesn't exist or has issues, just show empty list
        // Sessions will be created by backend when messages are sent
        console.warn('Could not fetch sessions from database (this is okay - sessions are created by backend):', fetchError);
        setSessions([]);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (title?: string) => {
    try {
      console.log('Creating new session...');
      
      // Get group_id from URL or session
      const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
      
      console.log('Group ID check:', {
        fromUrl: searchParams.get('group'),
        fromSession: (getSession() as any)?.selectedGroupId,
        final: groupId
      });
      
      if (!groupId) {
        const errorMsg = 'No group selected. Please select a group from the group management page first.';
        console.error('❌', errorMsg);
        setError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Generate unique session ID
      // The backend/n8n workflow will create the session entry automatically when first message is sent
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('✅ Generated new session ID:', sessionId);
      setError(null); // Clear any previous errors
      
      // Return sessionId - let the caller handle navigation/state management
      return sessionId;
    } catch (err) {
      console.error('❌ Failed to create session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create session';
      setError(errorMessage);
      throw err;
    }
  };

  const updateSession = async (id: string, updates: { title?: string; status?: string }) => {
    try {
      // Session updates are handled by backend - just refresh the list
      // If session table exists, it will be updated by backend
      await fetchSessions(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update session');
      throw err;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      console.log('Deleting session:', id);
      
      // Get group_id from URL or session
      const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
      
      if (!groupId) {
        throw new Error('No group selected. Please select a group first.');
      }
      
      // Session deletion is handled by backend if needed
      // For now, just remove from local state and navigate away
      await fetchSessions(); // Refresh list
      
      // If we deleted the current session, navigate to the most recent one
      const remainingSessions = sessions.filter(s => s.id !== id);
      if (remainingSessions.length > 0) {
        navigate(withGroupParam(`/chat/${remainingSessions[0].id}`, groupId));
      } else {
        navigate(withGroupParam('/chat', groupId));
      }
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
  }, [searchParams.get('group')]); // Refetch when group changes

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
