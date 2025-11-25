import React, { useState } from 'react';
import { submitUserFeedback } from '../../services/feedback';
import { getSession } from '../../services/auth';

interface FeedbackBarProps {
  messageId: string;
}

const FeedbackBar: React.FC<FeedbackBarProps> = ({ messageId }) => {
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentRating, setCurrentRating] = useState<1 | -1 | null>(null);
  const [note, setNote] = useState('');
  const [showToast, setShowToast] = useState<'success' | 'error' | null>(null);

  const handleRating = (newRating: 1 | -1) => {
    setCurrentRating(newRating);
    setShowNoteModal(true);
    setNote(''); // Reset note
  };

  const handleNoteSubmit = async () => {
    if (currentRating === null) return;
    
    try {
      const session = getSession();
      if (!session || !session.userId) {
        console.error('No user session found');
        alert('Please log in to submit feedback');
        return;
      }

      // Use messageId as chat_id to link feedback to the specific message
      const chatId = messageId;
      const reaction = currentRating === 1 ? 'good' : 'bad';

      console.log('Submitting feedback:', { chatId, userId: session.userId, reaction, feedbackText: note });

      await submitUserFeedback(chatId, session.userId, reaction, note || undefined);

      console.log('✅ Feedback submitted successfully');
      setRating(currentRating);
      setShowNoteModal(false);
      setNote('');
      
      // Show success toast
      setShowToast('success');
      setTimeout(() => setShowToast(null), 3000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      setShowNoteModal(false);
      
      // Show error toast
      setShowToast('error');
      setTimeout(() => setShowToast(null), 3000);
    }
  };

  return (
    <>
      <button
        onClick={() => handleRating(1)}
        className="p-1.5 rounded transition-colors"
        style={{
          backgroundColor: rating === 1 ? 'var(--success-light, rgba(16, 185, 129, 0.1))' : 'transparent',
          color: rating === 1 ? 'var(--success, #10b981)' : 'var(--text-muted)'
        }}
        onMouseEnter={(e) => {
          if (rating !== 1) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (rating !== 1) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Thumbs up"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
        </svg>
      </button>
      <button
        onClick={() => handleRating(-1)}
        className="p-1.5 rounded transition-colors"
        style={{
          backgroundColor: rating === -1 ? 'var(--error-light, rgba(239, 68, 68, 0.1))' : 'transparent',
          color: rating === -1 ? 'var(--error, #ef4444)' : 'var(--text-muted)'
        }}
        onMouseEnter={(e) => {
          if (rating !== -1) {
            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (rating !== -1) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
        title="Thumbs down"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
        </svg>
      </button>

      {/* Feedback Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 rounded-lg max-w-md w-full mx-4" style={{ backgroundColor: 'var(--card)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                Submit feedback to HR Ax Pro
              </h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <p className="text-sm mb-3" style={{ color: 'var(--text)' }}>
              What did you like?
            </p>
            
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Give as much detail as you can, but don't include any private or sensitive information."
              className="input w-full h-24 resize-none text-sm"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                borderColor: 'var(--border)',
                padding: '12px'
              }}
              autoFocus
            />
            
            <p className="text-xs mt-2 mb-4" style={{ color: 'var(--text-secondary)' }}>
              We'll also share the content you're providing feedback on to help improve future responses.
            </p>
            
            <div className="flex justify-end">
              <button
                onClick={handleNoteSubmit}
                className="px-6 py-2 text-sm font-medium rounded-md"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div 
          className="fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2"
          style={{
            backgroundColor: showToast === 'success' ? 'var(--success, #10b981)' : 'var(--error, #ef4444)',
            color: 'white'
          }}
        >
          {showToast === 'success' ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Feedback submitted successfully!</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Failed to submit feedback. Please try again.</span>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default FeedbackBar;
