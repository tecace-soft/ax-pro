import React, { useState } from 'react';
import { Session } from './useSessions';
import { useT } from '../../i18n/I18nProvider';

interface SessionListItemProps {
  session: Session;
  isActive: boolean;
  onClick: () => void;
  deleteSession: (id: string) => Promise<void>;
}

const SessionListItem: React.FC<SessionListItemProps> = ({ 
  session, 
  isActive, 
  onClick, 
  deleteSession
}) => {
  const t = useT();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSession(session.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete chat. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

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
          isActive ? 'bg-gray-100 border-r-2 border-gray-400' : ''
        }`}
        style={{
          backgroundColor: isActive ? 'var(--primary-light)' : undefined,
          borderRightColor: isActive ? 'var(--text)' : undefined
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.08)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        onClick={onClick}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
              {session.title || session.firstMessage || t('ui.newChatTitle')}
            </h3>
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
              onClick={handleDeleteClick}
              className="opacity-0 group-hover:opacity-100 text-xs px-1 py-1 rounded hover:bg-red-100 transition-opacity"
              style={{ color: 'var(--error)' }}
              title="Delete chat"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCancelDelete}
        >
          <div
            className="card rounded-lg p-6 max-w-md w-full mx-4"
            style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)' }}>
              Delete Chat
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Are you sure you want to delete this chat? This will permanently delete the conversation and all messages. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelDelete}
                className="px-4 py-2 text-sm rounded-md border"
                style={{ 
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                  backgroundColor: 'transparent'
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-sm rounded-md text-white"
                style={{ 
                  backgroundColor: 'var(--error)',
                  opacity: isDeleting ? 0.6 : 1
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionListItem;
