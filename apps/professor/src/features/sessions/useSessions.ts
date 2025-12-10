import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { withGroupParam } from '../../utils/navigation';
import { sessionsApi } from '../../services/api';
import { isBackendAvailable } from '../../services/devMode';
import { getSession } from '../../services/auth';
import { 
  fetchSessionsByGroup,
  fetchChatMessagesForSession,
  deleteSessionAndChatData
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
  firstMessage?: string; // First user message content for sessions without title
}

/**
 * Generate a smart, meaningful title from user message content
 * Removes filler words and extracts key information
 */
function generateSmartTitle(content: string): string {
  if (!content || !content.trim()) {
    return 'New Chat';
  }

  // Clean the content
  let cleaned = content.trim();
  
  // Remove common filler phrases (Korean)
  const koreanFillers = [
    /^좀\s*/i,
    /\s*좀\s*$/i,
    /\s*해줘\s*$/i,
    /\s*알려줘\s*$/i,
    /\s*보내줄\s*수\s*있어\?/i,
    /\s*만들어줄게\s*$/i,
    /\s*만들어줘\s*$/i,
    /\s*보여줘\s*$/i,
    /\s*설명해줘\s*$/i,
    /\s*알려줄\s*수\s*있어\?/i,
    /\s*할\s*수\s*있어\?/i,
    /\s*가능해\?/i,
    /\s*되나\?/i,
    /\s*해줄\s*수\s*있어\?/i,
  ];
  
  // Remove common filler phrases (English)
  const englishFillers = [
    /^please\s+/i,
    /\s*please\s*$/i,
    /\s*can\s*you\s*/i,
    /\s*could\s*you\s*/i,
    /\s*will\s*you\s*/i,
    /\s*would\s*you\s*/i,
    /\s*help\s*me\s*/i,
    /\s*tell\s*me\s*/i,
    /\s*show\s*me\s*/i,
    /\s*explain\s*/i,
    /\?$/,
  ];

  // Apply Korean fillers
  koreanFillers.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Apply English fillers
  englishFillers.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Extract key information
  // If it's a question, try to extract the main topic
  const questionPatterns = [
    /(?:어떻게|how|what|when|where|why|who)\s+(.+)/i,
    /(.+?)(?:\?|는|은|이|가|를|을|에|의)/,
  ];

  let extracted = cleaned;
  for (const pattern of questionPatterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      extracted = match[1].trim();
      break;
    }
  }

  // If the content is very long, try to find the main topic
  if (extracted.length > 60) {
    // Try to find key phrases (Korean)
    const koreanKeyPhrases = [
      /(.+?)\s*(?:사용|사용법|방법|예시|샘플|코드|구현|설정|연동|연결|문제|해결|오류|에러)/i,
      /(.+?)\s*(?:SDK|API|프레임워크|라이브러리|도구|툴)/i,
    ];
    
    // Try to find key phrases (English)
    const englishKeyPhrases = [
      /(.+?)\s*(?:usage|how to|example|sample|code|implementation|setup|integration|connection|problem|error|issue)/i,
      /(.+?)\s*(?:SDK|API|framework|library|tool)/i,
    ];

    for (const pattern of [...koreanKeyPhrases, ...englishKeyPhrases]) {
      const match = extracted.match(pattern);
      if (match && match[1]) {
        extracted = match[1].trim();
        break;
      }
    }
  }

  // Don't truncate - keep the full meaningful content
  // Only remove trailing ellipsis if it was added unnecessarily
  return extracted || cleaned || 'New Chat';
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
        const convertedSessions: Session[] = await Promise.all(
          sessionData.map(async (s) => {
            const session: Session = {
              id: s.session_id,
              title: s.title || undefined,
              status: (s.status || 'open') as 'open' | 'closed' | 'archived', // Default to 'open' if status doesn't exist
              createdAt: s.created_at || new Date().toISOString(),
              updatedAt: s.updated_at || s.created_at || new Date().toISOString()
            };

            // If session doesn't have a title, fetch the first message and generate a smart title
            if (!session.title) {
              try {
                const messages = await fetchChatMessagesForSession(s.session_id, groupId);
                // Find the first user message
                const firstUserMessage = messages.find(msg => msg.role === 'user');
                if (firstUserMessage && firstUserMessage.content) {
                  session.firstMessage = generateSmartTitle(firstUserMessage.content);
                }
              } catch (msgError) {
                console.warn(`Could not fetch first message for session ${s.session_id}:`, msgError);
              }
            }

            return session;
          })
        );
        
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
      
      // Delete session and all chat data from Supabase
      await deleteSessionAndChatData(id, groupId);
      
      // Refresh the session list
      await fetchSessions();
      
      // If we deleted the current session, navigate to the most recent one
      const remainingSessions = sessions.filter(s => s.id !== id);
      if (remainingSessions.length > 0) {
        navigate(withGroupParam('/chat', groupId));
      } else {
        navigate(withGroupParam('/chat', groupId));
      }
    } catch (err) {
      console.error('Error in deleteSession:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
      throw err;
    }
  };

  const groupId = searchParams.get('group');
  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]); // Refetch when group changes

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    refresh: fetchSessions
  };
};
