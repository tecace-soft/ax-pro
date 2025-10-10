import React, { useState, useEffect, useRef } from 'react';
import { Session } from './useSessions';
import { useT } from '../../i18n/I18nProvider';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  updateSession: (id: string, updates: { title?: string; status?: string }) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  closeSession: (id: string) => Promise<void>;
  reopenSession: (id: string) => Promise<void>;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ 
  session, 
  isActive, 
  onClick, 
  updateSession, 
  deleteSession, 
  closeSession, 
  reopenSession 
}) => {
  const t = useT();
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(session.title || '');
  const contextMenuRef = useRef<HTMLDivElement>(null);

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
      ? t('context.confirmDeleteClosed')
      : t('context.confirmDelete');
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('Deleting session:', session.id);
        await deleteSession(session.id);
        console.log('Session deleted successfully');
      } catch (error) {
        console.error('Failed to permanently delete session:', error);
        alert(t('context.deleteFailed'));
      }
    }
    setShowContextMenu(false);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContextMenu]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return t('ui.justNow');
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
                    {session.title || t('ui.newChatTitle')}
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
          ref={contextMenuRef}
          className="absolute right-0 top-0 z-20 w-48 card rounded-md shadow-lg border"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setShowContextMenu(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              style={{ color: 'var(--text)' }}
            >
              ✏️ {t('context.rename')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              style={{ color: 'var(--text)' }}
            >
              {session.status === 'closed' ? `🔄 ${t('context.reopen')}` : `🔒 ${t('context.close')}`}
            </button>
            <hr className="my-1" style={{ borderColor: 'var(--border)' }} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePermanentDelete();
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-red-50"
              style={{ color: 'var(--error)' }}
            >
              🗑️ {t('context.deletePermanently')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionListItem;
