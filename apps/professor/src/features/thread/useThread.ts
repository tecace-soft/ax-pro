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
        console.log('Loading local messages for session:', sessionId, localMessages);
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
      
      // Always use chatService - it handles backend/n8n/simulation fallback
      console.log('Using chatService for message sending');
      let accumulatedContent = '';
      const result = await chatService.sendMessage(sessionId, content, (event) => {
        console.log('Stream event received:', event);
        if (event.type === 'delta' && event.text) {
          console.log('Delta text:', event.text);
          accumulatedContent += event.text;
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              const newContent = (msg.content || '') + event.text!;
              console.log('Updating message content:', newContent);
              return { ...msg, content: newContent };
            }
            return msg;
          }));
          onStream?.(event.text);
        } else if (event.type === 'final') {
          console.log('Final event:', event);
          console.log('Accumulated content for final event:', accumulatedContent);
          // Replace temporary message with real one
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              const finalMessage = { 
                ...msg, 
                id: event.messageId!,
                content: msg.content || accumulatedContent,
                citations: event.citations
              };
              console.log('Final message:', finalMessage);
              return finalMessage;
            }
            return msg;
          }));
        } else if (event.type === 'error') {
          console.error('Stream error:', event.message);
          setError(event.message || 'Stream failed');
          setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
        }
      });

      // Save messages to localStorage for simulation mode
      if (!backendAvailable) {
        const currentMessages = messages.filter(msg => !msg.id.startsWith('temp-'));
        const allMessages = [...currentMessages, userMessage];
        
        // Add assistant message if it exists
        if (result && result.messageId) {
          const assistantMessage = {
            id: result.messageId,
            sessionId,
            role: 'assistant' as const,
            content: accumulatedContent || (result.messageId.startsWith('n8n_') ? 'Response from n8n webhook' : 'Simulated response'),
            meta: {},
            createdAt: new Date().toISOString(),
            citations: result.citations
          };
          allMessages.push(assistantMessage);
        }
        
        console.log('Saving messages to localStorage:', allMessages);
        localStorage.setItem(`axpro_sim_messages_${sessionId}`, JSON.stringify(allMessages));
        
        // Update messages state
        setMessages(allMessages);
      }

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
        console.log('Auto-generated session name:', sessionName);
        
        // Dispatch event to update session list
        window.dispatchEvent(new CustomEvent('sessionUpdated', { 
          detail: { sessionId, title: sessionName } 
        }));
      }

      return result;
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
    console.log('useThread useEffect triggered for sessionId:', sessionId);
    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId]); // Remove fetchMessages from dependencies

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
