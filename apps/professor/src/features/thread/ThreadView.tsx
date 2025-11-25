import React, { useRef, useEffect } from 'react';
import { useThread } from './useThread';
import MessageBubble from './MessageBubble';
import Composer from './Composer';
import { useT } from '../../i18n/I18nProvider';
import { useUICustomization } from '../../hooks/useUICustomization';

interface ThreadViewProps {
  sessionId: string;
}

const ThreadView: React.FC<ThreadViewProps> = ({ sessionId }) => {
  const { messages, loading, sending, error, sendMessage } = useThread(sessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const t = useT();
  const { customization } = useUICustomization();

  // Debug: Log messages
  React.useEffect(() => {
    console.log('ThreadView messages for sessionId:', sessionId, messages);
  }, [messages, sessionId]);

  const scrollToBottom = () => {
    // Scroll the messages container, NOT the entire page
    if (messagesContainerRef.current && messagesEndRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure DOM is updated before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 0);
    return () => clearTimeout(timeoutId);
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
    <div className="flex-1 flex flex-col h-full" style={{ overflow: 'hidden' }}>
      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ overflowY: 'auto', overflowX: 'hidden' }}
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="max-w-2xl w-full text-center">
              <div className="mb-8">
                <h1 className="text-4xl font-light mb-4" style={{ color: 'var(--text)' }}>
                  {customization.chatTitle}
                </h1>
                <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                  {customization.chatSubtitle}
                </p>
              </div>
              
              {(() => {
                const questions = [
                  { text: customization.suggestedQuestions.question1, icon: 'question1' },
                  { text: customization.suggestedQuestions.question2, icon: 'question2' },
                  { text: customization.suggestedQuestions.question3, icon: 'question3' },
                  { text: customization.suggestedQuestions.question4, icon: 'question4' },
                ].filter(q => q.text && q.text.trim() !== '');

                if (questions.length === 0) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                    {questions.map((q, index) => {
                      const icons = {
                        question1: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/></svg>,
                        question2: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1 .34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0-.34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>,
                        question3: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>,
                        question4: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>,
                      };

                      return (
                        <button
                          key={index}
                          onClick={() => sendMessage(q.text)}
                          className="p-4 text-left rounded-lg border hover:bg-gray-50 transition-colors"
                          style={{ 
                            borderColor: 'var(--border)',
                            backgroundColor: 'var(--card)',
                            color: 'var(--text)'
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                              {icons[q.icon as keyof typeof icons]}
                            </div>
                            <span className="text-sm">{q.text}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((message) => {
              console.log('Rendering message:', message);
              return <MessageBubble key={message.id} message={message} />;
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 flex-shrink-0">
          <div className="error p-3 rounded-md">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t p-4 flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <Composer
          onSend={(content) => sendMessage(content)}
          disabled={sending}
        />
      </div>
    </div>
  );
};

export default ThreadView;
