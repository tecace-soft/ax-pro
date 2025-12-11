import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatService, ChatMessage } from '../../services/chat';
import { isBackendAvailable } from '../../services/devMode';
import { submitUserFeedback } from '../../services/feedback';
import { getSession } from '../../services/auth';
import { fetchChatMessagesForSession } from '../../services/chatData';

export const useThread = (sessionId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  const [lastSentTime, setLastSentTime] = useState<number>(0);
  const [searchParams] = useSearchParams();

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get group_id from URL or session
      const groupId = searchParams.get('group') || (getSession() as any)?.selectedGroupId;
      
      if (!groupId) {
        console.warn('No group_id available, cannot fetch messages');
        setMessages([]);
        setLoading(false);
        return;
      }
      
      // Fetch messages from Supabase filtered by session_id and group_id
      const chatMessages = await fetchChatMessagesForSession(sessionId, groupId);
      
      // Preserve citations from current messages (they're not stored in database)
      setMessages(prev => {
        // Create a map of citations by message ID
        // Message IDs from Supabase are in format: assistant_${chat_id}
        const citationsMap = new Map<string, ChatMessage['citations']>();
        prev.forEach(msg => {
          if (msg.citations && msg.citations.length > 0) {
            // Store by message ID
            citationsMap.set(msg.id, msg.citations);
            
            // Also store by chat_id if we can extract it from assistant_${chat_id} format
            if (msg.id.startsWith('assistant_')) {
              const chatId = msg.id.replace('assistant_', '');
              citationsMap.set(chatId, msg.citations);
            }
            
            // Also store by citation messageId (which is the chatId)
            msg.citations.forEach(citation => {
              if (citation.messageId) {
                citationsMap.set(`assistant_${citation.messageId}`, msg.citations);
              }
            });
          }
        });
        
        // Merge citations into fetched messages
        const mergedMessages = chatMessages.map(msg => {
          // Try to find citations by exact message ID match
          let existingCitations = citationsMap.get(msg.id);
          
          // If not found and message ID is assistant_${chat_id}, try matching by chat_id
          if (!existingCitations && msg.id.startsWith('assistant_')) {
            const chatId = msg.id.replace('assistant_', '');
            existingCitations = citationsMap.get(chatId);
          }
          
          if (existingCitations) {
            console.log(`✅ Preserved citations for message ${msg.id}:`, existingCitations);
            return { ...msg, citations: existingCitations };
          }
          return msg;
        });
        
        return mergedMessages;
      });
      
      console.log(`✅ Loaded ${chatMessages.length} messages from Supabase for session: ${sessionId}, group: ${groupId}`);
    } catch (err) {
      console.error('Failed to fetch messages from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, searchParams.get('group')]);

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
      // Use assistant_${chatId} format to match what we get from Supabase
      setMessages(prev => prev.map(msg => {
        if (msg.id === assistantMessageId) {
          const finalContent = accumulatedContent || 'No response received';
          // Format the message ID to match Supabase format: assistant_${chatId}
          const finalId = finalMessageId 
            ? `assistant_${finalMessageId}` 
            : assistantMessageId;
          const updatedMessage = {
            ...msg,
            id: finalId,
            content: finalContent, // Use accumulated content
            citations: finalCitations,
            meta: { isStreaming: false }
          };
          console.log('Final assistant message:', updatedMessage);
          console.log('Citations preserved:', finalCitations);
          return updatedMessage;
        }
        return msg;
      }));

      // Messages are automatically saved to Supabase by the chatbot backend
      // No need to refetch - messages are already in state from streaming
      
      // Trigger session list refresh so new session appears in sidebar
      // Delay slightly to allow backend to create/update session
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('sessionUpdated'));
      }, 1000);

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

      // Extract chat_id from messageId (remove assistant_ prefix)
      const chatId = messageId.startsWith('assistant_') ? messageId.replace('assistant_', '') : messageId;
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