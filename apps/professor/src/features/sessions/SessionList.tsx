import React, { useState, useEffect } from 'react';
import { useSessions } from './useSessions';
import { useT } from '../../i18n/I18nProvider';
import SessionListItem from './SessionListItem';

interface SessionListProps {
  currentSessionId?: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: (sessionId: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({ currentSessionId, onSessionSelect, onNewSession }) => {
  const { sessions, loading, createSession, refresh, updateSession, deleteSession, error } = useSessions();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.firstMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const handleNewChat = async () => {
    try {
      setCreateError(null);
      const newSessionId = await createSession();
      if (newSessionId) {
        onNewSession(newSessionId);
      }
    } catch (error) {
      console.error('Failed to create new chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create new chat';
      setCreateError(errorMessage);
      // Show error for 5 seconds
      setTimeout(() => setCreateError(null), 5000);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for session updates
  useEffect(() => {
    const handleSessionUpdate = () => {
      refresh();
    };

    window.addEventListener('sessionUpdated', handleSessionUpdate);
    return () => window.removeEventListener('sessionUpdated', handleSessionUpdate);
  }, [refresh]);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Search and New Chat - Fixed at top, never scrolls */}
      <div style={{ 
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: 'var(--bg)', 
        flexShrink: 0,
        position: 'relative',
        zIndex: 5
      }}>
        {createError && (
          <div className="p-2 rounded-md text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {createError}
          </div>
        )}
        {error && !createError && (
          <div className="p-2 rounded-md text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            {error}
          </div>
        )}
        <button
          onClick={handleNewChat}
          className="w-full btn-primary py-2 px-4 rounded-md text-sm font-medium"
          title="Create new chat (⌘N or Ctrl+N)"
        >
          + {t('ui.newChat')}
        </button>
        
        <input
          type="text"
          placeholder={t('ui.searchConversations')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full px-3 py-2 rounded-md text-sm"
        />
      </div>

      {/* Session List - ONLY this section scrolls when content overflows */}
      <div style={{ 
        flex: '1 1 0%',
        overflowY: 'auto', 
        overflowX: 'hidden',
        minHeight: 0,
        maxHeight: '100%',
        position: 'relative',
        WebkitOverflowScrolling: 'touch'
      }}>
        {loading ? (
          <div className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery ? (
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {t('ui.noConversations')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {t('ui.noConversations')}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('ui.startConversation')}
                </p>
                <button
                  onClick={handleNewChat}
                  className="btn-primary px-4 py-2 text-sm rounded-md"
                >
                  {t('ui.startNewChat')}
                </button>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t('ui.backendNote')}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {filteredSessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={currentSessionId === session.id}
                onClick={() => {
                  onSessionSelect(session.id);
                }}
                deleteSession={deleteSession}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionList;
