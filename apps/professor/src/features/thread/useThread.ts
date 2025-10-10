import { useState, useEffect, useCallback } from 'react';
import { chatService, ChatMessage } from '../../services/chat';
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    console.log('=== SEND MESSAGE START ===');
    console.log('Session ID:', sessionId);
    console.log('Content:', content);

    setSending(true);
    setError(null);

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
      }

    } catch (err) {
      console.error('Error in sendMessage:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Remove the temporary assistant message if an error occurs
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        sessionId,
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Failed to send message',
        meta: {},
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
      console.log('=== SEND MESSAGE END ===');
    }
  }, [sessionId, messages]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage
  };
};