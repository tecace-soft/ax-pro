import { messagesApi } from './api';
import { sendToN8n, getActiveN8nConfig, N8nRequest, N8nResponse } from './n8n';
import { isBackendAvailable } from './devMode';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta: Record<string, any>;
  createdAt: string;
  citations?: MessageCitation[];
}

export interface MessageCitation {
  id: string;
  messageId: string;
  sourceType: 'web' | 'document' | 'kb' | 'blob';
  sourceId?: string;
  title?: string;
  snippet?: string;
  metadata: Record<string, any>;
}

export interface StreamEvent {
  type: 'delta' | 'final' | 'error';
  text?: string;
  messageId?: string;
  citations?: MessageCitation[];
  message?: string;
}

// SSE stream reader
export class ChatStreamReader {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private decoder: TextDecoder;

  constructor(response: Response) {
    this.reader = response.body!.getReader();
    this.decoder = new TextDecoder();
  }

  async *read(): AsyncGenerator<StreamEvent> {
    try {
      while (true) {
        const { done, value } = await this.reader.read();
        if (done) break;

        const chunk = this.decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield data;
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
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
    // Check if backend is available
    const backendAvailable = await isBackendAvailable();
    console.log('Backend available:', backendAvailable);
    
    if (backendAvailable) {
      // Use backend API
      if (onStream) {
        // Use streaming
        const response = await messagesApi.send(sessionId, content, true);
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
        const result = await messagesApi.send(sessionId, content, false);
        return {
          messageId: result.messageId,
          citations: result.citations
        };
      }
    } else {
      // Use n8n webhook if available
      console.log('Backend unavailable, trying n8n...');
      const n8nConfig = getActiveN8nConfig();
      console.log('Active n8n config:', n8nConfig);
      
      if (n8nConfig && n8nConfig.webhookUrl) {
        console.log('Using n8n webhook:', n8nConfig.webhookUrl);
        try {
          const request: N8nRequest = {
            sessionId,
            action: 'sendMessage',
            chatInput: content
          };

                  const response: N8nResponse = await sendToN8n(request);
                  console.log('n8n response received:', response);
                  
                  // Simulate streaming for n8n response
                  const messageId = `n8n_${Date.now()}`;
                  if (onStream) {
                    const answerText = response.answer || 'No response from n8n';
                    console.log('Streaming answer text:', answerText);
                    const words = answerText.split(' ');
                    let accumulatedText = '';
                    
                    for (let i = 0; i < words.length; i++) {
                      accumulatedText += (i > 0 ? ' ' : '') + words[i];
                      
                      onStream({
                        type: 'delta',
                        text: words[i] + (i < words.length - 1 ? ' ' : '')
                      });
                      
                      // Small delay to simulate streaming
                      await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    
                    onStream({
                      type: 'final',
                      messageId: messageId,
                      citations: response.citationTitle ? [{
                        id: `citation_${Date.now()}`,
                        messageId: messageId,
                        sourceType: 'document',
                        title: response.citationTitle,
                        snippet: response.citationContent,
                        metadata: {}
                      }] : []
                    });
                  }

          return {
            messageId: messageId,
            citations: response.citationTitle ? [{
              id: `citation_${Date.now()}`,
              messageId: messageId,
              sourceType: 'document',
              title: response.citationTitle,
              snippet: response.citationContent,
              metadata: {}
            }] : []
          };
        } catch (error) {
          console.error('Failed to send to n8n:', error);
          throw new Error('Failed to connect to n8n webhook. Please check your configuration.');
        }
      } else {
        console.log('No n8n config found or webhook URL missing, falling back to simulation');
        console.log('n8n config was:', n8nConfig);
        // Fall back to simulation
        const { generateSimulatedResponse } = await import('./simulation');
        const simulatedResponse = generateSimulatedResponse(content);
        
        if (onStream) {
          const words = simulatedResponse.split(' ');
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
            citations: []
          });
        }
        
        return {
          messageId: `sim_${Date.now()}`,
          citations: []
        };
      }
    }
  },

  async getMessages(
    sessionId: string,
    limit = 50,
    cursor?: string,
    direction = 'older'
  ): Promise<ChatMessage[]> {
    return messagesApi.list(sessionId, limit, cursor, direction);
  }
};
