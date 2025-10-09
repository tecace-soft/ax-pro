import React, { useRef, useEffect } from 'react';
import { useThread } from './useThread';
import MessageBubble from './MessageBubble';
import Composer from './Composer';

interface ThreadViewProps {
  sessionId: string;
  isClosed?: boolean;
}

const ThreadView: React.FC<ThreadViewProps> = ({ sessionId, isClosed = false }) => {
  const { messages, loading, sending, error, sendMessage } = useThread(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debug: Log messages
  React.useEffect(() => {
    console.log('ThreadView messages:', messages);
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-light mb-4" style={{ color: 'var(--text)' }}>
                Start a conversation
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Send a message to begin chatting
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              console.log('Rendering message:', message);
              return <MessageBubble key={message.id} message={message} />;
            })}
            {sending && (
              <div className="flex justify-start">
                <div className="card p-4 max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="animate-pulse flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Assistant is typing...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2">
          <div className="error p-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
        {isClosed ? (
          <div className="flex items-center justify-center p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <div className="text-center">
              <div className="text-2xl mb-2">🔒</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                This chat is closed
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Reopen the chat to continue the conversation
              </p>
            </div>
          </div>
        ) : (
          <Composer
            onSend={(content) => sendMessage(content)}
            disabled={sending}
          />
        )}
      </div>
    </div>
  );
};

export default ThreadView;
