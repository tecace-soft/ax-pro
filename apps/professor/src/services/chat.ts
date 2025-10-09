import { messagesApi } from './api';

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
