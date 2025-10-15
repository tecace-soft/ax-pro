import { messagesApi } from './api';
import { isBackendAvailable, isN8nWebhookAvailable } from './devMode';
import { getActiveN8nConfig, sendToN8n, N8nRequest, N8nResponse } from './n8n';
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
      // Use n8n webhook if available
      console.log('Backend unavailable, trying n8n...');
      const n8nAvailable = isN8nWebhookAvailable();
      const n8nConfig = getActiveN8nConfig();
      console.log('n8n webhook available:', n8nAvailable);
      console.log('Active n8n config:', n8nConfig);
      
      if (n8nAvailable && n8nConfig && n8nConfig.webhookUrl) {
        console.log('Using n8n webhook:', n8nConfig.webhookUrl);
        try {
          const session = getSession();
          // Generate unique chatId for this message (for future feedback API)
          const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const request: N8nRequest = {
            sessionId,
            chatId,
            userId: session?.userId || 'unknown',
            action: 'sendMessage',
            chatInput: content
          };

          console.log('=== CHAT SERVICE DEBUG ===');
          console.log('Sending request to n8n:', request);
          const response: N8nResponse = await sendToN8n(request);
          console.log('n8n response received successfully:', response);
          console.log('Response type:', typeof response);
          console.log('Response has answer?', !!response?.answer);
          console.log('Response answer:', response?.answer);
          console.log('==========================');
          
          // Check if response is valid
          if (!response || !response.answer) {
            console.error('Invalid webhook response:', response);
            throw new Error('Invalid response from webhook');
          }
          
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
          console.log('n8n failed, falling back to simulation');
          // Fall back to simulation instead of throwing error
        }
      } else {
        console.log('No n8n config found or webhook URL missing, falling back to simulation');
        console.log('n8n config was:', n8nConfig);
      }
      
      // Fall back to simulation (either no n8n config or n8n failed)
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