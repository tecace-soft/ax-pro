import React, { useState } from 'react';
import { useThread } from './useThread';

interface FeedbackBarProps {
  messageId: string;
}

const FeedbackBar: React.FC<FeedbackBarProps> = ({ messageId }) => {
  const { submitFeedback } = useThread(messageId);
  const [rating, setRating] = useState<1 | -1 | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [note, setNote] = useState('');

  const handleRating = async (newRating: 1 | -1) => {
    try {
      await submitFeedback(messageId, newRating, note || undefined);
      setRating(newRating);
      if (newRating === -1) {
        setShowNoteModal(true);
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleNoteSubmit = async () => {
    try {
      await submitFeedback(messageId, -1, note);
      setShowNoteModal(false);
    } catch (error) {
      console.error('Failed to submit note:', error);
    }
  };

  return (
    <>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleRating(1)}
          className={`p-1 rounded transition-colors ${
            rating === 1 
              ? 'bg-green-100 text-green-600' 
              : 'hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: rating === 1 ? 'var(--success-light)' : 'transparent',
            color: rating === 1 ? 'var(--success)' : 'var(--text-muted)'
          }}
          title="Thumbs up"
        >
          👍
        </button>
        <button
          onClick={() => handleRating(-1)}
          className={`p-1 rounded transition-colors ${
            rating === -1 
              ? 'bg-red-100 text-red-600' 
              : 'hover:bg-gray-100'
          }`}
          style={{
            backgroundColor: rating === -1 ? 'var(--error-light)' : 'transparent',
            color: rating === -1 ? 'var(--error)' : 'var(--text-muted)'
          }}
          title="Thumbs down"
        >
          👎
        </button>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text)' }}>
              What could be improved?
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional: Share specific feedback..."
              className="input w-full h-24 resize-none"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-sm border rounded-md"
                style={{ borderColor: 'var(--border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleNoteSubmit}
                className="btn-primary px-4 py-2 text-sm"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackBar;
