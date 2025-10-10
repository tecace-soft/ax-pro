import React, { useState } from 'react';
import { Session } from './useSessions';
import { useSessions } from './useSessions';
import { useT } from '../../i18n/I18nProvider';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ session, isActive, onClick }) => {
  const { updateSession, deleteSession, closeSession, reopenSession } = useSessions();
  const t = useT();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title || '');

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(!showContextMenu);
  };

  const handleRename = async () => {
    if (newTitle.trim() && newTitle !== session.title) {
      try {
        await updateSession(session.id, { title: newTitle.trim() });
      } catch (error) {
        console.error('Failed to rename session:', error);
      }
    }
    setIsRenaming(false);
    setShowContextMenu(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await deleteSession(session.id);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    }
    setShowContextMenu(false);
  };

  const handleClose = async () => {
    try {
      if (session.status === 'closed') {
        await reopenSession(session.id);
      } else {
        await closeSession(session.id);
      }
    } catch (error) {
      console.error('Failed to toggle session status:', error);
    }
    setShowContextMenu(false);
  };

  const handlePermanentDelete = async () => {
    const confirmMessage = session.status === 'closed' 
      ? 'Are you sure you want to permanently delete this closed conversation? This action cannot be undone.'
      : 'Are you sure you want to permanently delete this conversation? This action cannot be undone.';
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteSession(session.id);
      } catch (error) {
        console.error('Failed to permanently delete session:', error);
      }
    }
    setShowContextMenu(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="relative">
      <div
        className={`p-3 cursor-pointer transition-colors group ${
          isActive ? 'bg-gray-100 border-r-2 border-gray-400' : 'hover:bg-gray-50'
        }`}
        style={{
          backgroundColor: isActive ? 'var(--primary-light)' : undefined,
          borderRightColor: isActive ? 'var(--text)' : undefined
        }}
        onClick={onClick}
        onContextMenu={handleContextMenu}
      >
        {isRenaming ? (
          <div className="space-y-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setNewTitle(session.title || '');
                }
              }}
              className="input w-full px-2 py-1 text-sm"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleRename}
                className="text-xs px-2 py-1 rounded bg-blue-500 text-white"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsRenaming(false);
                  setNewTitle(session.title || '');
                }}
                className="text-xs px-2 py-1 rounded border"
                style={{ borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className={`text-sm font-medium truncate ${
                    session.status === 'closed' ? 'opacity-60' : ''
                  }`} style={{ color: 'var(--text)' }}>
                    {session.title || 'New Chat'}
                  </h3>
                  {session.status === 'closed' && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100" style={{ color: 'var(--text-muted)' }}>
                      🔒
                    </span>
                  )}
                </div>
                {session.lastMessage && (
                  <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                    {session.lastMessage.role === 'user' ? 'You: ' : 'Assistant: '}
                    {session.lastMessage.content}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(session.lastMessage?.createdAt || session.updatedAt)}
                </span>
                <button
                  onClick={handleContextMenu}
                  className="opacity-0 group-hover:opacity-100 text-xs px-1 py-1 rounded hover:bg-gray-200"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ⋯
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Context Menu */}
      {showContextMenu && !isRenaming && (
        <div
          className="absolute right-0 top-0 z-10 w-48 card rounded-md shadow-lg border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="py-1">
            <button
              onClick={() => {
                setIsRenaming(true);
                setShowContextMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              style={{ color: 'var(--text)' }}
            >
              ✏️ Rename
            </button>
            <button
              onClick={handleClose}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              style={{ color: 'var(--text)' }}
            >
              {session.status === 'closed' ? '🔄 Reopen' : '🔒 Close'}
            </button>
            <hr className="my-1" style={{ borderColor: 'var(--border)' }} />
            <button
              onClick={handlePermanentDelete}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50"
              style={{ color: 'var(--error)' }}
            >
              {session.status === 'closed' ? '🗑️ Delete permanently' : '🗑️ Delete permanently'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionListItem;
