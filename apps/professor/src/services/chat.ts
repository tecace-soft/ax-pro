import { messagesApi } from './api';
import { isBackendAvailable, isSimulationModeEnabled } from './devMode';
import { N8nRequest, N8nResponse } from './n8nUserSpecific';
import { getSession } from './auth';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta?: Record<string, any>;
  createdAt: string;
  citations?: MessageCitation[];
}

export interface MessageCitation {
  id: string;
  messageId: string;
  sourceType: 'web' | 'document' | 'knowledge';
  title: string;
  snippet: string;
  sourceId: string;
  metadata?: Record<string, any>;
}

export interface StreamEvent {
  type: 'delta' | 'final';
  text?: string;
  messageId?: string;
  citations?: MessageCitation[];
}

export class ChatStreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;

  constructor(response: Response) {
    this.reader = response.body!.getReader();
  }

  async *read(): AsyncGenerator<StreamEvent> {
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              yield parsed;
            } catch (e) {
              console.warn('Failed to parse SSE data:', data);
            }
          }
        }
      }
    } finally {
      this.reader.releaseLock();
    }
  }
}

/**
 * Send message to the universal chatbot webhook (bypasses user settings)
 * This ensures all chatbot requests use the same endpoint regardless of user configuration
 */
const sendToChatbotWebhook = async (request: N8nRequest, webhookUrl: string): Promise<N8nResponse> => {
  console.log('Sending to universal chatbot webhook:', webhookUrl);
  console.log('Request payload:', request);
  
  try {
    console.log('Making request to:', webhookUrl);
    console.log('Request payload:', JSON.stringify(request));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('n8n webhook request timed out after 60 seconds');
      controller.abort();
    }, 60000);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify(request),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    const responseText = await response.text();
    console.log('=== CHATBOT WEBHOOK DEBUG ===');
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text:', responseText);
    console.log('=============================');
    
    if (!response.ok) {
      console.error('Response error:', responseText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
    }
    
    if (!responseText || responseText.trim() === '') {
      console.warn('Empty response from webhook');
      throw new Error('Empty response from webhook. Please check your workflow configuration.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Response text was:', responseText);
      throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}...`);
    }
    
    console.log('n8n response:', data);
    
    let responseData;
    if (Array.isArray(data)) {
      responseData = data[0];
    } else if (data && typeof data === 'object') {
      responseData = data;
    } else {
      throw new Error('Unexpected response format from n8n webhook');
    }
    
    if (responseData && responseData.answer) {
      if (responseData.answer.includes('No response from webhook')) {
        console.error('Webhook returned error message:', responseData.answer);
        throw new Error('Webhook returned error: ' + responseData.answer);
      }
      
      if (responseData.answer === null || responseData.answer === '') {
        console.error('Webhook returned null or empty answer');
        throw new Error('Empty response from webhook. Please check your workflow configuration.');
      }
    }
    
    return responseData;
  } catch (error: any) {
    console.error('Failed to send to chatbot webhook:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Webhook request timed out after 60 seconds');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach webhook');
    } else {
      throw error;
    }
  }
};

// Chat service functions
export const chatService = {
  async sendMessage(
    sessionId: string,
    content: string,
    onStream?: (event: StreamEvent) => void
  ): Promise<{ messageId: string; citations: MessageCitation[] }> {
    
    const backendAvailable = await isBackendAvailable();
    console.log('Backend available:', backendAvailable);
    
    if (backendAvailable) {
      // Use backend API
      if (onStream) {
        // Use streaming
        const response = await messagesApi.send(sessionId, content, true) as Response;
        const streamReader = new ChatStreamReader(response);
        
        let messageId = '';
        let citations: MessageCitation[] = [];

        for await (const event of streamReader.read()) {
          onStream(event);
          
          if (event.type === 'final') {
            messageId = event.messageId || '';
            citations = event.citations || [];
          }
        }

        return { messageId, citations };
      } else {
        // Use non-streaming
        const result = await messagesApi.send(sessionId, content, false) as any;
        return {
          messageId: result.messageId || `backend_${Date.now()}`,
          citations: result.citations || []
        };
      }
    } else {
      // Use n8n webhook for chat messages (sessions are handled locally)
      // ALWAYS use the universal chatbot endpoint - user settings do not apply to chatbot
      const CHATBOT_WEBHOOK_URL = 'https://n8n.srv1153481.hstgr.cloud/webhook/db3d9fbd-73bd-444a-a689-842446fffdd9';
      
      console.log('Backend unavailable, using universal chatbot webhook...');
      console.log('Chatbot webhook URL:', CHATBOT_WEBHOOK_URL);
      
      // Always use the universal chatbot webhook (bypasses user settings)
      try {
        console.log('Using universal chatbot webhook:', CHATBOT_WEBHOOK_URL);
        try {
          const session = getSession();
          // Get groupId from URL ONLY (allows multiple tabs with different groups)
          const urlParams = new URLSearchParams(window.location.search);
          const groupId = urlParams.get('group');
          
          // Validate that groupId exists
          if (!groupId) {
            console.error('❌ No group_id in session or URL. Session:', session);
            throw new Error('No group selected. Please select a group first.');
          }
          
          // Fetch top_k from group data
          let topK: number | undefined;
          try {
            const { defaultSupabase } = await import('./groupService');
            const { data: groupData, error: groupError } = await defaultSupabase
              .from('group')
              .select('top_k')
              .eq('group_id', groupId)
              .single();
            
            if (!groupError && groupData && groupData.top_k !== null && groupData.top_k !== undefined) {
              topK = Number(groupData.top_k);
              console.log(`📊 Using top_k from group: ${topK}`);
            } else {
              console.log(`⚠️ Group ${groupId} has no top_k value, using default`);
            }
          } catch (error) {
            console.warn(`⚠️ Error fetching group top_k:`, error);
            // Continue without topK if fetch fails
          }
          
          // Generate unique chatId for this message (for future feedback API)
          // Use sessionId + timestamp + random to ensure uniqueness across sessions
          const chatId = `chat_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const request: N8nRequest = {
            sessionId,
            chatId,
            // Only include userId if user is logged in
            ...(session?.userId ? { userId: session.userId } : {}),
            action: 'sendMessage',
            chatInput: content,
            groupId: groupId, // Always include groupId (validated above)
            ...(topK !== undefined ? { topK } : {}), // Include topK only if it exists
          };

          console.log('=== CHAT SERVICE DEBUG ===');
          console.log('Session:', session);
          console.log('GroupId from session:', groupId);
          console.log('Sending request to n8n:', request);
          console.log('Request includes groupId:', !!request.groupId);
          
          // Retry mechanism for n8n requests with chat ID regeneration
          let response: N8nResponse;
          let lastError: Error | null = null;
          let currentRequest = request;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`n8n request attempt ${attempt}/3`);
              console.log('Using chatId:', currentRequest.chatId);
              // Always use the universal chatbot webhook URL directly
              response = await sendToChatbotWebhook(currentRequest, CHATBOT_WEBHOOK_URL);
              console.log('n8n response received successfully:', response);
              console.log('Response type:', typeof response);
              console.log('Response has answer?', !!response?.answer);
              console.log('Response answer:', response?.answer);
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error as Error;
              console.warn(`n8n request attempt ${attempt} failed:`, error);
              
              // Check if error is related to chat ID duplication or timeout
              const errorMessage = error instanceof Error ? error.message : String(error);
              const isChatIdError = errorMessage.includes('chat') && 
                (errorMessage.includes('duplicate') || 
                 errorMessage.includes('already exists') || 
                 errorMessage.includes('not unique') ||
                 errorMessage.includes('unique constraint'));
              
              const isTimeoutError = errorMessage.includes('timeout') || 
                                     errorMessage.includes('timed out') ||
                                     errorMessage.includes('aborted');
              
              // Generate new chatId for retry if:
              // 1. Chat ID duplication error detected
              // 2. Timeout error (server may have received the request but not responded)
              // This ensures each retry uses a unique chatId
              if (attempt < 3 && (isChatIdError || isTimeoutError)) {
                if (isTimeoutError) {
                  console.log('Timeout detected, generating new chatId for retry (previous request may have been received)...');
                } else {
                  console.log('Chat ID duplication detected, generating new chatId...');
                }
                // Generate new chatId for retry
                const newChatId = `chat_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                currentRequest = {
                  ...currentRequest,
                  chatId: newChatId
                };
                console.log('New chatId generated:', newChatId);
              }
              
              if (attempt < 3) {
                // Wait before retry (exponential backoff)
                const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
                console.log(`Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // Check if all attempts failed
          if (!response! || !response!.answer) {
            console.error('All n8n attempts failed, last error:', lastError);
            
            // Provide more specific error messages based on real server testing
            let errorMessage = 'Chat service unavailable';
            if (lastError?.message.includes('Empty response')) {
              errorMessage += ': Empty response from webhook. Please check your workflow configuration.';
            } else if (lastError?.message.includes('timeout') || lastError?.message.includes('ECONNRESET')) {
              errorMessage += ': Request timed out or connection reset. The service may be overloaded.';
            } else if (lastError?.message.includes('Network error')) {
              errorMessage += ': Network connection failed. Please check your internet connection.';
            } else if (lastError?.message.includes('socket hang up')) {
              errorMessage += ': Connection lost. Please try again.';
            } else if (lastError?.message.includes('chat') && lastError?.message.includes('duplicate')) {
              errorMessage += ': Chat ID conflict detected and resolved, but service still unavailable.';
            } else {
              errorMessage += `: ${lastError?.message || 'Unknown error occurred'}`;
            }
            
            throw new Error(`n8n webhook failed after 3 attempts: ${errorMessage}`);
          }
          
          console.log('==========================');
          
          // Use chatId as messageId so feedback can link correctly
          // chatId was sent to n8n and will be in the database
          if (onStream) {
            const answerText = response.answer;
            console.log('Streaming answer text:', answerText);
            const words = answerText.split(' ');
            
            for (let i = 0; i < words.length; i++) {
              onStream({
                type: 'delta',
                text: words[i] + (i < words.length - 1 ? ' ' : '')
              });
              
              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            onStream({
              type: 'final',
              messageId: chatId,
              citations: response.citationTitle ? [{
                id: `citation_${Date.now()}`,
                messageId: chatId,
                sourceType: 'document' as const,
                title: response.citationTitle,
                snippet: response.citationContent || '',
                sourceId: `doc_${Date.now()}`,
                metadata: {}
              }] : []
            });
          }

          return {
            messageId: chatId,  // Return the chatId that was sent to n8n
            citations: response.citationTitle ? [{
              id: `citation_${Date.now()}`,
              messageId: chatId,
              sourceType: 'document' as const,
              title: response.citationTitle,
              snippet: response.citationContent || '',
              sourceId: `doc_${Date.now()}`,
              metadata: {}
            }] : []
          };
        } catch (error) {
          console.error('Failed to send to n8n:', error);
          console.log('n8n failed, checking simulation mode setting');
          
          // Check if simulation mode is enabled
          if (isSimulationModeEnabled()) {
            console.log('Simulation mode enabled, falling back to simulation');
            // Fall back to simulation
          } else {
            console.log('Simulation mode disabled, throwing error');
            throw new Error(`Chat service unavailable: ${error instanceof Error ? error.message : 'n8n webhook failed'}`);
          }
        }
      } catch (error) {
        console.error('Failed to send to chatbot webhook:', error);
        console.log('n8n failed, checking simulation mode setting');
        
        // Check if simulation mode is enabled
        if (isSimulationModeEnabled()) {
          console.log('Simulation mode enabled, falling back to simulation');
          // Fall back to simulation
        } else {
          console.log('Simulation mode disabled, throwing error');
          throw new Error(`Chat service unavailable: ${error instanceof Error ? error.message : 'n8n webhook failed'}`);
        }
      }
      
      // Only reach here if simulation mode is enabled
      console.log('Falling back to simulation');
      const simulationModule = await import('./simulation');
      const simulatedResponse = simulationModule.generateSimulatedResponse(content);
      const responseText = simulatedResponse.reply;
      
      if (onStream) {
        const words = responseText.split(' ');
        for (let i = 0; i < words.length; i++) {
          onStream({
            type: 'delta',
            text: words[i] + (i < words.length - 1 ? ' ' : '')
          });
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        onStream({
          type: 'final',
          messageId: `sim_${Date.now()}`,
          citations: (simulatedResponse.citations || []).map((citation, index) => ({
            id: `sim_citation_${Date.now()}_${index}`,
            messageId: `sim_${Date.now()}`,
            sourceType: citation.sourceType as 'web' | 'document' | 'knowledge',
            title: citation.title,
            snippet: citation.snippet,
            sourceId: citation.sourceId || `sim_${Date.now()}`,
            metadata: {}
          }))
        });
      }
      
      return {
        messageId: `sim_${Date.now()}`,
        citations: (simulatedResponse.citations || []).map((citation, index) => ({
          id: `sim_citation_${Date.now()}_${index}`,
          messageId: `sim_${Date.now()}`,
          sourceType: citation.sourceType as 'web' | 'document' | 'knowledge',
          title: citation.title,
          snippet: citation.snippet,
          sourceId: citation.sourceId || `sim_${Date.now()}`,
          metadata: {}
        }))
      };
    }
  },

  async getMessages(
    sessionId: string,
    limit = 50,
    cursor?: string,
    direction = 'older'
  ): Promise<ChatMessage[]> {
    const backendAvailable = await isBackendAvailable();
    
    if (backendAvailable) {
      return await messagesApi.list(sessionId, limit, cursor, direction);
    } else {
      // Use local messages for simulation mode
      const localMessages = JSON.parse(localStorage.getItem(`axpro_sim_messages_${sessionId}`) || '[]');
      return localMessages;
    }
  }
};