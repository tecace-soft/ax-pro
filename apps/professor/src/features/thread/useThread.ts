import { useState, useEffect, useCallback } from 'react';
import { chatService, ChatMessage } from '../../services/chat';
import { isBackendAvailable } from '../../services/devMode';
import { submitUserFeedback } from '../../services/feedback';
import { getSession } from '../../services/auth';

export const useThread = (sessionId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<number>(0);

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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Generate title from first message
  const generateTitle = (content: string): string => {
    // Take first 50 characters or until first newline
    const firstLine = content.split('\n')[0];
    const truncated = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
    return truncated || 'New Chat';
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Prevent duplicate message sending within 5 seconds
    const now = Date.now();
    if (lastSentMessage === content && (now - lastSentTime) < 5000) {
      console.log('Preventing duplicate message send within 5 seconds');
      return;
    }

    console.log('=== SEND MESSAGE START ===');
    console.log('Session ID:', sessionId);
    console.log('Content:', content);

    setSending(true);
    setError(null);
    setLastSentMessage(content);
    setLastSentTime(now);

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sessionId,
      role: 'user',
      content,
      meta: {},
      createdAt: new Date().toISOString()
    };
    
    setMessages(prev => {
      console.log('Adding user message:', userMessage);
      return [...prev, userMessage];
    });

    // Create a temporary assistant message for streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    setMessages(prev => {
      const newAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        sessionId,
        role: 'assistant',
        content: '', // Start with empty content
        createdAt: new Date().toISOString(),
        meta: { isStreaming: true }
      };
      console.log('Created new assistant message:', newAssistantMessage);
      return [...prev, newAssistantMessage];
    });

    let accumulatedContent = '';
    let finalMessageId: string | undefined;
    let finalCitations: ChatMessage['citations'] = [];

    try {
      // Call chat service
      console.log('Calling chatService.sendMessage...');
      const result = await chatService.sendMessage(sessionId, content, (event) => {
        console.log('=== STREAM EVENT ===');
        console.log('Event type:', event.type);
        console.log('Event text:', event.text);
        console.log('Event messageId:', event.messageId);
        console.log('===================');

        if (event.type === 'delta' && event.text) {
          accumulatedContent += event.text;
          setMessages(prev => prev.map(msg => {
            if (msg.id === assistantMessageId) {
              const newContent = (msg.content || '') + event.text!;
              console.log('Updated assistant message content:', newContent);
              return { ...msg, content: newContent };
            }
            return msg;
          }));
        } else if (event.type === 'final') {
          finalMessageId = event.messageId;
          finalCitations = event.citations;
          console.log('Final event received - messageId:', event.messageId, 'citations:', event.citations);
        }
      });

      console.log('Chat service result:', result);

      // After streaming, update the temporary assistant message with final content and ID
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantMessageId) {
          const finalContent = accumulatedContent || 'No response received';
          const updatedMessage = {
            ...msg,
            id: finalMessageId || assistantMessageId, // Use final ID if available
            content: finalContent, // Use accumulated content
            citations: finalCitations,
            meta: { isStreaming: false }
          };
          console.log('Final assistant message:', updatedMessage);
          return updatedMessage;
        }
        return msg;
      }));

      // Save to localStorage for simulation mode
      const backendAvailable = await isBackendAvailable();
      if (!backendAvailable) {
        const allMessages = [...messages.filter(msg => !msg.id.startsWith('temp-')), userMessage, {
          id: finalMessageId || assistantMessageId,
          sessionId,
          role: 'assistant' as const,
          content: accumulatedContent || 'No response received',
          meta: { isStreaming: false },
          createdAt: new Date().toISOString(),
          citations: finalCitations
        }];
        console.log('Saving to localStorage:', allMessages);
        localStorage.setItem(`axpro_sim_messages_${sessionId}`, JSON.stringify(allMessages));
        
        // Auto-generate title from first message if session title is "New Chat"
        const sessions = JSON.parse(localStorage.getItem('axpro_sim_sessions') || '[]');
        const currentSession = sessions.find((s: any) => s.id === sessionId);
        if (currentSession && currentSession.title === 'New Chat' && messages.length === 0) {
          const newTitle = generateTitle(content);
          currentSession.title = newTitle;
          currentSession.updatedAt = new Date().toISOString();
          localStorage.setItem('axpro_sim_sessions', JSON.stringify(sessions));
          console.log('Auto-generated title:', newTitle);
          
          // Trigger session update event to refresh the session list
          window.dispatchEvent(new Event('sessionUpdated'));
        }
      }

    } catch (err) {
      console.error('Error in sendMessage:', err);
      
      // Clear the last sent message tracking on error to allow retry
      setLastSentMessage(null);
      setLastSentTime(0);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      
      // Remove the temporary assistant message if an error occurs
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      // Add error message with more user-friendly content
      const userFriendlyError = errorMessage.includes('Empty response') 
        ? 'Chat service is temporarily unavailable. Please try again in a moment.'
        : errorMessage.includes('timeout')
        ? 'Request timed out. The service may be busy. Please try again.'
        : errorMessage.includes('Network error')
        ? 'Network connection failed. Please check your internet connection.'
        : errorMessage;
      
      const errorMessageObj: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: userFriendlyError,
        meta: { isError: true },
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setSending(false);
      console.log('=== SEND MESSAGE END ===');
    }
  }, [sessionId, messages]);

  const submitFeedback = useCallback(async (
    messageId: string,
    rating: 1 | -1,
    feedbackText?: string
  ) => {
    try {
      const session = getSession();
      if (!session || !session.userId) {
        console.error('No user session found');
        throw new Error('Please log in to submit feedback');
      }

      // Find the message to get its chatId (if available from n8n response)
      const message = messages.find(msg => msg.id === messageId);
      if (!message) {
        console.error('Message not found:', messageId);
        throw new Error('Message not found');
      }

      // Use the messageId as chatId (this should be the chatId from n8n response)
      const chatId = messageId;
      const reaction = rating === 1 ? 'good' : 'bad';

      console.log('Submitting feedback:', { chatId, userId: session.userId, reaction, feedbackText });

      await submitUserFeedback(chatId, session.userId, reaction, feedbackText);

      console.log('✅ Feedback submitted successfully');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }, [messages]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    submitFeedback
  };
};