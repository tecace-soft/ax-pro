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

/**
 * Parse citationTitle and citationContent by splitting on delimiters
 * citationTitle uses ';;;' separator
 * citationContent uses '<|||>' separator
 * and pair them by index to create multiple citations
 */
export function parseCitations(
  citationTitle?: string,
  citationContent?: string,
  messageId: string = '',
  baseId: string = ''
): MessageCitation[] {

  if (!citationTitle || !citationTitle.trim()) {
    return [];
  }

  // Split citationTitle by ';;;' separator
  const titles = citationTitle.split(';;;').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
  
  // Split citationContent by '<|||>' separator
  // Also check for escaped versions or variations
  let contents: string[] = [];
  if (citationContent) {
    // Try different delimiter patterns
    if (citationContent.includes('<|||>')) {
      contents = citationContent.split('<|||>').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    } else if (citationContent.includes('<|\\|\\|>')) {
      // Escaped version
      contents = citationContent.split('<|\\|\\|>').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    } else if (citationContent.includes('&lt;|||&gt;')) {
      // HTML entity version
      contents = citationContent.split('&lt;|||&gt;').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
    } else {
      // No delimiter found - split by title count
      
      // If we have multiple titles but no delimiter, split content evenly
      if (titles.length > 1 && citationContent.length > 0) {
        const contentLength = citationContent.length;
        const chunkSize = Math.ceil(contentLength / titles.length);
        contents = [];
        for (let i = 0; i < titles.length; i++) {
          const start = i * chunkSize;
          const end = i === titles.length - 1 ? contentLength : (i + 1) * chunkSize;
          const chunk = citationContent.substring(start, end).trim();
          if (chunk.length > 0) {
            contents.push(chunk);
          }
        }
      } else {
        // Single title or no titles - treat entire content as single citation
        contents = [citationContent.trim()].filter((c: string) => c.length > 0);
      }
    }
  }

  // Create citations for all titles, even if content is missing
  // This allows citations to show title even when content is empty
  const count = titles.length;

  const citations: MessageCitation[] = [];
  for (let i = 0; i < count; i++) {
    citations.push({
      id: baseId ? `citation_${baseId}_${i}` : `citation_${Date.now()}_${i}`,
      messageId: messageId,
      sourceType: 'document' as const,
      title: titles[i] || 'Untitled Source',
      snippet: contents[i] || '',
      sourceId: `doc_${baseId || Date.now()}_${i}`,
      metadata: {}
    });
  }
  return citations;
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
  const requestBody = JSON.stringify(request);
 
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60000);
    
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: requestBody,
      signal: controller.signal
    };
    
    const response = await fetch(webhookUrl, fetchOptions);
    
    clearTimeout(timeoutId);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
    }
    
    if (!responseText || responseText.trim() === '') {
      throw new Error('Empty response from webhook. Please check your workflow configuration.');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`Invalid JSON response from n8n: ${responseText.substring(0, 100)}...`);
    }
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
        throw new Error('Webhook returned error: ' + responseData.answer);
      }
      
      if (responseData.answer === null || responseData.answer === '') {
        throw new Error('Empty response from webhook. Please check your workflow configuration.');
      }
    }
    
    return responseData;
  } catch (error: any) {
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
      // Webhook endpoint is determined by group's openai_chat setting
      const N8N_WEBHOOK_URL = 'https://n8n.srv1153481.hstgr.cloud/webhook/bdf7e8e7-8592-4518-a4ee-335c235ff94b';
      const OPENAI_WEBHOOK_URL = 'https://n8n.srv1153481.hstgr.cloud/webhook/758f5df5-94b4-4a97-9f5e-15be9d1cb375';
      try {
        const session = getSession();
        // Get groupId from URL ONLY (allows multiple tabs with different groups)
        const urlParams = new URLSearchParams(window.location.search);
        const groupId = urlParams.get('group');
        
        // Validate that groupId exists
        if (!groupId) {
          throw new Error('No group selected. Please select a group first.');
        }
        
        // Fetch group data (top_k and vector_store_id)
        // NOTE: Always using OpenAI route - openai_chat check removed
        let topK: number | undefined;
        let vectorStoreId: string | undefined;
        let webhookUrl: string = OPENAI_WEBHOOK_URL; // Always use OpenAI webhook
        
        try {
          const { defaultSupabase } = await import('./groupService');
          const { data: groupData, error: groupError } = await defaultSupabase
            .from('group')
            .select('top_k, vector_store_id')
            .eq('group_id', groupId)
            .single();
          
          if (!groupError && groupData) {
            // Get top_k
            if (groupData.top_k !== null && groupData.top_k !== undefined) {
              topK = Number(groupData.top_k);
            } else {
            }
            
            // Always get vector_store_id (OpenAI route)
            vectorStoreId = groupData.vector_store_id || undefined;
            if (vectorStoreId) {
            } else {
            }
          } else {
          }
        } catch (error) {
          // Continue with OpenAI webhook if fetch fails
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
          ...(vectorStoreId ? { vectorStoreId } : {}), // Include vectorStoreId if it exists
        };
        // Retry mechanism for webhook requests with chat ID regeneration
        let response: N8nResponse;
        let lastError: Error | null = null;
        let currentRequest = request;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Use the webhook URL determined by group's openai_chat setting
            response = await sendToChatbotWebhook(currentRequest, webhookUrl);

            break; // Success, exit retry loop
          } catch (error) {
            lastError = error as Error;
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
              } else {
              }
              // Generate new chatId for retry
              const newChatId = `chat_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              currentRequest = {
                ...currentRequest,
                chatId: newChatId
              };
            }
            
            if (attempt < 3) {
              // Wait before retry (exponential backoff)
              const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // Check if all attempts failed
        if (!response! || !response!.answer) {
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
          
          throw new Error(`Webhook failed after 3 attempts: ${errorMessage}`);
        }
        
        // Use chatId as messageId so feedback can link correctly
        // chatId was sent to webhook and will be in the database
        if (onStream) {
          const answerText = response.answer;
          const words = answerText.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            onStream({
              type: 'delta',
              text: words[i] + (i < words.length - 1 ? ' ' : '')
            });
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          const parsedCitations = parseCitations(response.citationTitle, response.citationContent, chatId, String(Date.now()));
          onStream({
            type: 'final',
            messageId: chatId,
            citations: parsedCitations
          });
        }

        const parsedCitations = parseCitations(response.citationTitle, response.citationContent, chatId, String(Date.now()));
        return {
          messageId: chatId,  // Return the chatId that was sent to webhook
          citations: parsedCitations
        };
      } catch (error) {
        // Check if simulation mode is enabled
        if (isSimulationModeEnabled()) {
          // Fall back to simulation
        } else {
          throw new Error(`Chat service unavailable: ${error instanceof Error ? error.message : 'webhook failed'}`);
        }
      }
      
      // Only reach here if simulation mode is enabled
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