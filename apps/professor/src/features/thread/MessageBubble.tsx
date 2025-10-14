import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../services/chat';
import References from './References';
import FeedbackBar from './FeedbackBar';
import { useUICustomization } from '../../hooks/useUICustomization';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [showReferences, setShowReferences] = useState(false);
  const { customization } = useUICustomization();
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  // Only mark as simulated if it actually starts with 'sim_'
  // Real n8n messages will have IDs like 'chat_...'
  const isSimulated = message.id.startsWith('sim_');

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-3`}>
      {/* Avatar for assistant */}
      {isAssistant && (
        <div className="flex-shrink-0">
          <img 
            src={customization.avatarUrl} 
            alt="Assistant" 
            className="w-8 h-8 rounded-full"
            style={{ objectFit: 'cover' }}
          />
        </div>
      )}
      
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
            className="prose prose-sm max-w-none" 
            style={{ 
              fontSize: '14px',
              lineHeight: '1.5',
              color: isUser ? '#ffffff' : 'var(--text)'
            }}
          >
            {message.content && message.content.trim() ? (
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Custom styling for markdown elements
                  p: ({ children }) => <p style={{ margin: '0 0 8px 0' }}>{children}</p>,
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code style={{ 
                        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)', 
                        color: isUser ? '#ffffff' : 'var(--text)',
                        padding: '2px 4px', 
                        borderRadius: '3px',
                        fontSize: '0.9em'
                      }}>
                        {children}
                      </code>
                    ) : (
                      <pre style={{ 
                        backgroundColor: isUser ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)', 
                        color: isUser ? '#ffffff' : 'var(--text)',
                        padding: '8px', 
                        borderRadius: '4px',
                        overflow: 'auto',
                        margin: '8px 0'
                      }}>
                        <code>{children}</code>
                      </pre>
                    );
                  },
                  ul: ({ children }) => <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ul>,
                  ol: ({ children }) => <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>{children}</ol>,
                  li: ({ children }) => <li style={{ margin: '4px 0' }}>{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote style={{ 
                      borderLeft: `3px solid ${isUser ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`, 
                      paddingLeft: '12px', 
                      margin: '8px 0',
                      fontStyle: 'italic',
                      color: isUser ? '#ffffff' : 'var(--text)'
                    }}>
                      {children}
                    </blockquote>
                  ),
                  h1: ({ children }) => <h1 style={{ fontSize: '1.2em', fontWeight: 'bold', margin: '8px 0', color: isUser ? '#ffffff' : 'var(--text)' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ fontSize: '1.1em', fontWeight: 'bold', margin: '8px 0', color: isUser ? '#ffffff' : 'var(--text)' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ fontSize: '1em', fontWeight: 'bold', margin: '8px 0', color: isUser ? '#ffffff' : 'var(--text)' }}>{children}</h3>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <span style={{ color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', fontStyle: 'italic' }}>
                {message.role === 'assistant' ? 'Thinking...' : 'No content available'}
              </span>
            )}
          </div>
        </div>

        {/* Timestamp and Simulation Badge */}
        <div className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {formatTime(message.createdAt)}
          </div>
          {isSimulated && isAssistant && (
            <div 
              className="text-xs px-2 py-0.5 rounded"
              style={{ 
                backgroundColor: 'var(--warning-bg, rgba(255, 193, 7, 0.1))',
                color: 'var(--warning-text, #ff9800)',
                border: '1px solid var(--warning-border, rgba(255, 152, 0, 0.3))',
                fontSize: '10px',
                fontWeight: '500'
              }}
            >
              SIMULATION MODE
            </div>
          )}
        </div>

        {/* Assistant-specific features */}
        {isAssistant && (
          <div className="mt-2 space-y-2">
            {/* References Toggle */}
            {message.citations && message.citations.length > 0 && (
              <button
                onClick={() => setShowReferences(!showReferences)}
                className="text-xs link flex items-center space-x-2"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>
                  {showReferences ? 'Hide' : 'Show'} References ({message.citations.length})
                </span>
              </button>
            )}

            {/* References */}
            {showReferences && message.citations && (
              <References citations={message.citations} />
            )}

            {/* Feedback Bar - Only show for real messages (not simulated) */}
            {!isSimulated && (
              <FeedbackBar messageId={message.id} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
