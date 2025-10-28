import { messagesApi } from './api';
import { isBackendAvailable, isN8nWebhookAvailable, isSimulationModeEnabled } from './devMode';
import { getActiveN8nConfig, sendToN8n, N8nRequest, N8nResponse } from './n8nUserSpecific';
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
      console.log('Backend unavailable, trying n8n for chat...');
      const n8nAvailable = isN8nWebhookAvailable();
      const n8nConfig = getActiveN8nConfig();
      console.log('n8n webhook available:', n8nAvailable);
      console.log('Active n8n config:', n8nConfig);
      
      if (n8nAvailable && n8nConfig && n8nConfig.webhookUrl) {
        console.log('Using n8n webhook:', n8nConfig.webhookUrl);
        try {
          const session = getSession();
          // Generate unique chatId for this message (for future feedback API)
          // Use sessionId + timestamp + random to ensure uniqueness across sessions
          const chatId = `chat_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const request: N8nRequest = {
            sessionId,
            chatId,
            userId: session?.userId || 'unknown',
            action: 'sendMessage',
            chatInput: content
          };

          console.log('=== CHAT SERVICE DEBUG ===');
          console.log('Sending request to n8n:', request);
          
          // Retry mechanism for n8n requests with chat ID regeneration
          let response: N8nResponse;
          let lastError: Error | null = null;
          let currentRequest = request;
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              console.log(`n8n request attempt ${attempt}/3`);
              console.log('Using chatId:', currentRequest.chatId);
              response = await sendToN8n(currentRequest);
              console.log('n8n response received successfully:', response);
              console.log('Response type:', typeof response);
              console.log('Response has answer?', !!response?.answer);
              console.log('Response answer:', response?.answer);
              break; // Success, exit retry loop
            } catch (error) {
              lastError = error as Error;
              console.warn(`n8n request attempt ${attempt} failed:`, error);
              
              // Check if error is related to chat ID duplication (based on real server testing)
              const errorMessage = error instanceof Error ? error.message : String(error);
              const isChatIdError = errorMessage.includes('chat') && 
                (errorMessage.includes('duplicate') || 
                 errorMessage.includes('already exists') || 
                 errorMessage.includes('not unique') ||
                 errorMessage.includes('unique constraint'));
              
              // Note: Real server testing shows the server doesn't actually enforce unique chat IDs
              // But we'll keep this logic for other potential servers
              if (isChatIdError && attempt < 3) {
                console.log('Chat ID duplication detected, generating new chatId...');
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
      } else {
        console.log('No n8n config found or webhook URL missing');
        console.log('n8n config was:', n8nConfig);
        
        // Check if simulation mode is enabled
        if (isSimulationModeEnabled()) {
          console.log('Simulation mode enabled, falling back to simulation');
          // Fall back to simulation
        } else {
          console.log('Simulation mode disabled, throwing error');
          throw new Error('Chat service unavailable: No n8n webhook configured');
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