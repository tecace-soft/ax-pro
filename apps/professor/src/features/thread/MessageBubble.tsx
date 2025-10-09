import React, { useState } from 'react';
import { ChatMessage } from '../../services/chat';
import References from './References';
import FeedbackBar from './FeedbackBar';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showReferences, setShowReferences] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Message Content */}
        <div
          className={`p-3 rounded-lg ${
            isUser 
              ? 'message-user' 
              : 'message-assistant'
          }`}
        >
          <div 
            className="whitespace-pre-wrap" 
            style={{ 
              fontSize: '14px',
              lineHeight: '1.5'
            }}
          >
            {message.content || 'No content available'}
          </div>
        </div>

        {/* Timestamp */}
        <div className={`text-xs mt-1 ${isUser ? 'text-right' : 'text-left'}`} style={{ color: 'var(--text-muted)' }}>
          {formatTime(message.createdAt)}
        </div>

        {/* Assistant-specific features */}
        {isAssistant && (
          <div className="mt-2 space-y-2">
            {/* References Toggle */}
            {message.citations && message.citations.length > 0 && (
              <button
                onClick={() => setShowReferences(!showReferences)}
                className="text-xs link flex items-center space-x-1"
              >
                <span>📚</span>
                <span>
                  {showReferences ? 'Hide' : 'Show'} References ({message.citations.length})
                </span>
              </button>
            )}

            {/* References */}
            {showReferences && message.citations && (
              <References citations={message.citations} />
            )}

            {/* Feedback Bar */}
            <FeedbackBar messageId={message.id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
