import { useState, useEffect, useCallback } from 'react';
import { chatService, ChatMessage } from '../../services/chat';
import { feedbackApi } from '../../services/api';
import { simulateStreamingResponse, simulateResponse } from '../../services/simulation';
import { isBackendAvailable } from '../../services/devMode';

export const useThread = (sessionId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        const data = await chatService.getMessages(sessionId);
        setMessages(data);
      } else {
        // Use local messages for simulation mode
        const localMessages = JSON.parse(localStorage.getItem(`axpro_sim_messages_${sessionId}`) || '[]');
        console.log('Loading local messages:', localMessages);
        setMessages(localMessages);
        
        // If no messages, create a test message
        if (localMessages.length === 0) {
          const testMessage = {
            id: 'test-1',
            sessionId,
            role: 'assistant' as const,
            content: 'Hello! This is a test message to verify the display is working.',
            meta: {},
            createdAt: new Date().toISOString()
          };
          setMessages([testMessage]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const sendMessage = async (content: string, onStream?: (text: string) => void) => {
    try {
      setSending(true);
      setError(null);

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        sessionId,
        role: 'user',
        content,
        meta: {},
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      // Create temporary assistant message for streaming
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        role: 'assistant',
        content: '',
        meta: {},
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if backend is available
      const backendAvailable = await isBackendAvailable();
      
      if (backendAvailable) {
        // Use real backend
        const result = await chatService.sendMessage(sessionId, content, (event) => {
          if (event.type === 'delta' && event.text) {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: msg.content + event.text! }
                : msg
            ));
            onStream?.(event.text);
          } else if (event.type === 'final') {
            // Replace temporary message with real one
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { 
                    ...msg, 
                    id: event.messageId!,
                    content: msg.content,
                    citations: event.citations
                  }
                : msg
            ));
          } else if (event.type === 'error') {
            setError(event.message || 'Stream failed');
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
          }
        });

        return result;
      } else {
        // Use simulation
        console.log('Backend unavailable, using simulation mode');
        
        const simulationRequest = {
          sessionId,
          action: 'sendMessage' as const,
          chatInput: content
        };

        // Simulate streaming response
        console.log('Starting simulation streaming...');
        let accumulatedContent = '';
        
        for await (const event of simulateStreamingResponse(simulationRequest)) {
          console.log('Simulation event:', event);
          if (event.type === 'delta' && event.text) {
            accumulatedContent += event.text;
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent }
                : msg
            ));
            onStream?.(event.text);
          } else if (event.type === 'final') {
            console.log('Final event received:', event);
            console.log('Accumulated content:', accumulatedContent);
            
            // Replace temporary message with simulated one
            const finalMessage = {
              id: event.messageId!,
              sessionId,
              role: 'assistant' as const,
              content: accumulatedContent,
              meta: {},
              createdAt: new Date().toISOString(),
              citations: event.citations
            };
            
            console.log('Final message:', finalMessage);
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId ? finalMessage : msg
            ));
            
            // Save to localStorage for simulation mode
            const currentMessages = messages.filter(msg => !msg.id.startsWith('temp-'));
            const allMessages = [
              ...currentMessages,
              userMessage,
              finalMessage
            ];
            console.log('Saving to localStorage:', allMessages);
            localStorage.setItem(`axpro_sim_messages_${sessionId}`, JSON.stringify(allMessages));
            
            // Force update the messages state
            setMessages(prev => {
              const filtered = prev.filter(msg => !msg.id.startsWith('temp-'));
              const updated = [...filtered, userMessage, finalMessage];
              console.log('Updated messages state:', updated);
              return updated;
            });
            
            // Auto-generate session name from first user message if not set
            const sessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
            const sessionIndex = sessions.findIndex((s: any) => s.id === sessionId);
            if (sessionIndex !== -1 && (!sessions[sessionIndex].title || sessions[sessionIndex].title === 'New Chat')) {
              const sessionName = content.length > 50 
                ? content.substring(0, 50) + '...' 
                : content;
              sessions[sessionIndex].title = sessionName;
              sessions[sessionIndex].updatedAt = new Date().toISOString();
              localStorage.setItem('axpro_sim_sessions', JSON.stringify(sessions));
            }
          }
        }

        return { messageId: assistantMessageId, citations: [] };
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      // Remove temporary messages on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')));
      throw err;
    } finally {
      setSending(false);
    }
  };

  const submitFeedback = async (messageId: string, rating: 1 | -1, note?: string) => {
    try {
      await feedbackApi.submit(messageId, rating, note);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    submitFeedback,
    refresh: fetchMessages
  };
};
