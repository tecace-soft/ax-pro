import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSessions, Session } from './useSessions';
import { useT } from '../../i18n/I18nProvider';
import SessionListItem from './SessionListItem';

const SessionList: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { sessions, loading, createSession } = useSessions();
  const t = useT();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = !searchQuery || 
      session.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleNewChat = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error('Failed to create new chat:', error);
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
      fetchSessions();
    };

    window.addEventListener('sessionUpdated', handleSessionUpdate);
    return () => window.removeEventListener('sessionUpdated', handleSessionUpdate);
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and New Chat */}
      <div className="p-4 space-y-3">
        <button
          onClick={handleNewChat}
          className="w-full btn-primary py-2 px-4 rounded-md text-sm font-medium"
          title="Create new chat (⌘N or Ctrl+N)"
        >
          + New Chat
        </button>
        
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full px-3 py-2 rounded-md text-sm"
        />
      </div>

      {/* Status Filter */}
      <div className="px-4 pb-2">
        <div className="flex space-x-1">
          {(['all', 'open', 'closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                statusFilter === status
                  ? 'text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              style={{
                backgroundColor: statusFilter === status ? 'var(--text)' : 'transparent',
                color: statusFilter === status ? 'var(--bg)' : 'var(--text-secondary)'
              }}
            >
              {status === 'all' ? 'All' : status === 'open' ? 'Open' : 'Closed'}
            </button>
          ))}
        </div>
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto">
        {filteredSessions.length === 0 ? (
          <div className="p-4 text-center">
            {searchQuery ? (
              <div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No conversations found
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  Try a different search term
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl mb-2">💬</div>
                <h3 className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                  No conversations yet
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Start a new conversation to begin chatting
                </p>
                <button
                  onClick={handleNewChat}
                  className="btn-primary px-4 py-2 text-sm rounded-md"
                >
                  Start New Chat
                </button>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Note: Full chat features require backend server
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={sessionId === session.id}
                onClick={() => navigate(`/chat/${session.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionList;
