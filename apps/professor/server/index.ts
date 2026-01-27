import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

// Types
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

interface ChatSession {
  id: string;
  userId: string;
  title?: string;
  status: 'open' | 'closed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  meta: Record<string, any>;
  createdAt: Date;
}

interface MessageFeedback {
  id: string;
  messageId: string;
  userId: string;
  rating: 1 | -1;
  note?: string;
  createdAt: Date;
}

interface MessageCitation {
  id: string;
  messageId: string;
  sourceType: 'web' | 'document' | 'kb' | 'blob';
  sourceId?: string;
  title?: string;
  snippet?: string;
  metadata: Record<string, any>;
}

// In-memory store (replace with database later)
const users: Map<string, User> = new Map();
const sessions: Map<string, ChatSession> = new Map();
const messages: Map<string, ChatMessage> = new Map();
const feedback: Map<string, MessageFeedback> = new Map();
const citations: Map<string, MessageCitation> = new Map();

// Demo users
const demoUsers = [
  { email: 'demo@tecace.com', password: 'demo1234', role: 'user' as const },
  { email: 'admin@tecace.com', password: 'admin1234', role: 'admin' as const }
];

// Session store for auth
const sessions_store: Map<string, string> = new Map(); // sessionId -> userId

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve paths for serving the frontend build in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '..', 'dist');

// Middleware
app.use(cors({
  origin: true, // reflect request origin (supports Render preview URL and custom domains)
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  const sessionId = req.cookies.sid;
  if (!sessionId || !sessions_store.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const userId = sessions_store.get(sessionId)!;
  req.userId = userId;
  next();
};

// Chat connector interface
export interface ChatConnector {
  send(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: { stream: boolean }
  ): AsyncIterable<string> | Promise<{ reply: string; citations: any[] }>;
}

// Mock connector for demo
class MockConnector implements ChatConnector {
  async *send(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    opts: { stream: boolean }
  ): AsyncIterable<string> {
    if (opts.stream) {
      const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.";
      const words = lorem.split(' ');
      
      for (const word of words) {
        yield word + ' ';
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    } else {
      return {
        reply: "This is a mock response from the assistant. In a real implementation, this would connect to an AI service.",
        citations: [
          { sourceType: 'web', title: 'Example Source', snippet: 'This is an example citation' }
        ]
      };
    }
  }
}

const connector = new MockConnector();

// Auth routes
app.post('/api/auth/demo-login', (req, res) => {
  const { email, password } = req.body;
  
  const user = demoUsers.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Create or get user
  let userId = user.email; // Using email as ID for demo
  if (!users.has(userId)) {
    users.set(userId, {
      id: userId,
      email: user.email,
      role: user.role,
      createdAt: new Date()
    });
  }

  // Create session
  const sessionId = uuidv4();
  sessions_store.set(sessionId, userId);

  res.cookie('sid', sessionId, { httpOnly: true, secure: false, sameSite: 'lax' });
  res.json({ email: user.email, role: user.role });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = users.get(req.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }
  res.json({ email: user.email, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.cookies.sid;
  if (sessionId) {
    sessions_store.delete(sessionId);
  }
  res.clearCookie('sid');
  res.json({ success: true });
});

// Session routes
app.get('/api/sessions', requireAuth, (req, res) => {
  const { limit = 20, cursor } = req.query;
  const userId = req.userId;
  
  let userSessions = Array.from(sessions.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  if (cursor) {
    const cursorIndex = userSessions.findIndex(s => s.id === cursor);
    if (cursorIndex !== -1) {
      userSessions = userSessions.slice(cursorIndex + 1);
    }
  }

  const limited = userSessions.slice(0, parseInt(limit as string));
  
  // Add last message preview
  const sessionsWithPreview = limited.map(session => {
    const sessionMessages = Array.from(messages.values())
      .filter(m => m.sessionId === session.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    
    const lastMessage = sessionMessages[sessionMessages.length - 1];
    
    return {
      ...session,
      lastMessage: lastMessage ? {
        content: lastMessage.content.substring(0, 100) + (lastMessage.content.length > 100 ? '...' : ''),
        role: lastMessage.role,
        createdAt: lastMessage.createdAt
      } : null
    };
  });

  res.json(sessionsWithPreview);
});

app.post('/api/sessions', requireAuth, (req, res) => {
  const { title } = req.body;
  const userId = req.userId;
  
  const session: ChatSession = {
    id: uuidv4(),
    userId,
    title,
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  sessions.set(session.id, session);
  res.json({ id: session.id });
});

app.get('/api/sessions/:id', requireAuth, (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const messageCount = Array.from(messages.values()).filter(m => m.sessionId === sessionId).length;
  
  res.json({
    ...session,
    messageCount
  });
});

app.patch('/api/sessions/:id', requireAuth, (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const { title, status } = req.body;
  if (title !== undefined) session.title = title;
  if (status !== undefined) session.status = status;
  session.updatedAt = new Date();
  
  sessions.set(sessionId, session);
  res.json(session);
});

app.delete('/api/sessions/:id', requireAuth, (req, res) => {
  const sessionId = req.params.id;
  const session = sessions.get(sessionId);
  
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Delete all messages and related data
  Array.from(messages.keys()).forEach(messageId => {
    const message = messages.get(messageId);
    if (message && message.sessionId === sessionId) {
      messages.delete(messageId);
      // Delete feedback and citations
      Array.from(feedback.keys()).forEach(feedbackId => {
        const fb = feedback.get(feedbackId);
        if (fb && fb.messageId === messageId) {
          feedback.delete(feedbackId);
        }
      });
      Array.from(citations.keys()).forEach(citationId => {
        const citation = citations.get(citationId);
        if (citation && citation.messageId === messageId) {
          citations.delete(citationId);
        }
      });
    }
  });
  
  sessions.delete(sessionId);
  res.json({ success: true });
});

// Message routes
app.get('/api/sessions/:id/messages', requireAuth, (req, res) => {
  const sessionId = req.params.id;
  const { limit = 50, cursor, direction = 'older' } = req.query;
  
  const session = sessions.get(sessionId);
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  let sessionMessages = Array.from(messages.values())
    .filter(m => m.sessionId === sessionId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  
  if (cursor) {
    const cursorIndex = sessionMessages.findIndex(m => m.id === cursor);
    if (cursorIndex !== -1) {
      if (direction === 'older') {
        sessionMessages = sessionMessages.slice(0, cursorIndex);
      } else {
        sessionMessages = sessionMessages.slice(cursorIndex + 1);
      }
    }
  }
  
  const limited = sessionMessages.slice(-parseInt(limit as string));
  
  // Add citations to assistant messages
  const messagesWithCitations = limited.map(message => {
    if (message.role === 'assistant') {
      const messageCitations = Array.from(citations.values())
        .filter(c => c.messageId === message.id);
      return { ...message, citations: messageCitations };
    }
    return message;
  });
  
  res.json(messagesWithCitations);
});

app.post('/api/sessions/:id/messages', requireAuth, async (req, res) => {
  const sessionId = req.params.id;
  const { content, stream = false } = req.body;
  
  const session = sessions.get(sessionId);
  if (!session || session.userId !== req.userId) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  // Create user message
  const userMessage: ChatMessage = {
    id: uuidv4(),
    sessionId,
    role: 'user',
    content,
    meta: {},
    createdAt: new Date()
  };
  
  messages.set(userMessage.id, userMessage);
  
  // Update session title if it's the first message
  if (!session.title) {
    session.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    session.updatedAt = new Date();
    sessions.set(sessionId, session);
  }
  
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    let assistantContent = '';
    
    try {
      for await (const chunk of connector.send([{ role: 'user', content }], { stream: true })) {
        assistantContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'delta', text: chunk })}\n\n`);
      }
      
      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        sessionId,
        role: 'assistant',
        content: assistantContent,
        meta: { tokens: assistantContent.split(' ').length },
        createdAt: new Date()
      };
      
      messages.set(assistantMessage.id, assistantMessage);
      
      // Add mock citations
      const mockCitations: MessageCitation[] = [
        {
          id: uuidv4(),
          messageId: assistantMessage.id,
          sourceType: 'web',
          sourceId: 'https://example.com',
          title: 'Example Source',
          snippet: 'This is an example citation snippet',
          metadata: {}
        }
      ];
      
      mockCitations.forEach(citation => {
        citations.set(citation.id, citation);
      });
      
      res.write(`data: ${JSON.stringify({ 
        type: 'final', 
        messageId: assistantMessage.id, 
        citations: mockCitations 
      })}\n\n`);
      
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
    }
    
    res.end();
  } else {
    try {
      const result = await connector.send([{ role: 'user', content }], { stream: false });
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        sessionId,
        role: 'assistant',
        content: result.reply,
        meta: { tokens: result.reply.split(' ').length },
        createdAt: new Date()
      };
      
      messages.set(assistantMessage.id, assistantMessage);
      
      // Add citations
      result.citations.forEach((citation: any) => {
        const messageCitation: MessageCitation = {
          id: uuidv4(),
          messageId: assistantMessage.id,
          sourceType: citation.sourceType || 'web',
          sourceId: citation.sourceId,
          title: citation.title,
          snippet: citation.snippet,
          metadata: citation.metadata || {}
        };
        citations.set(messageCitation.id, messageCitation);
      });
      
      res.json({
        reply: result.reply,
        messageId: assistantMessage.id,
        citations: result.citations
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate response' });
    }
  }
});

// Feedback routes
app.post('/api/messages/:id/feedback', requireAuth, (req, res) => {
  const messageId = req.params.id;
  const { rating, note } = req.body;
  
  const message = messages.get(messageId);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  // Check if user owns the session
  const session = sessions.get(message.sessionId);
  if (!session || session.userId !== req.userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const feedbackId = uuidv4();
  const messageFeedback: MessageFeedback = {
    id: feedbackId,
    messageId,
    userId: req.userId,
    rating,
    note,
    createdAt: new Date()
  };
  
  feedback.set(feedbackId, messageFeedback);
  res.json({ success: true });
});

// ChatKit embed endpoints
// GET /session - Creates a ChatKit session and returns client_secret
app.get('/session', async (req, res) => {
  // Set cache prevention headers
  res.setHeader('Cache-Control', 'no-store');
  
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const WORKFLOW_ID = process.env.WORKFLOW_ID;
  
  // Validate required environment variables
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY environment variable is not set' });
  }
  
  if (!WORKFLOW_ID) {
    return res.status(500).json({ error: 'WORKFLOW_ID environment variable is not set' });
  }
  
  try {
    // Call OpenAI ChatKit session create endpoint
    const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'chatkit_beta=v1',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        user: `user_${Date.now()}`
      })
    });
    
    const data = await response.json();
    
    // If OpenAI returns non-2xx, forward the status and error
    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error?.message || data.error || 'Failed to create ChatKit session',
        details: data 
      });
    }
    
    // Return client_secret
    res.json({ client_secret: data.client_secret });
  } catch (error: any) {
    console.error('Error creating ChatKit session:', error);
    res.status(500).json({ 
      error: 'Internal server error while creating ChatKit session',
      message: error.message 
    });
  }
});

// GET /chat - Returns HTML page that initializes ChatKit UI
app.get('/chat', (req, res) => {
  // Set headers to allow iframe embedding
  // Note: For cross-site iframe support, we avoid X-Frame-Options: DENY
  // CSP frame-ancestors can be configured later for allowlist
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatKit Embed</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
    }
    .container {
      width: 100%;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      color: #666;
    }
    .error {
      padding: 20px;
      background: #fee;
      color: #c00;
      border: 1px solid #fcc;
      margin: 20px;
      border-radius: 4px;
    }
    .test-info {
      padding: 10px;
      background: #e3f2fd;
      color: #1976d2;
      font-size: 12px;
      border-bottom: 1px solid #bbdefb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="loading" class="loading">
      <p>Loading ChatKit session...</p>
    </div>
    <div id="error" style="display: none;"></div>
    <div id="chatkit-container" style="display: none; flex: 1;"></div>
  </div>
  
  <script>
    (async function() {
      const loadingEl = document.getElementById('loading');
      const errorEl = document.getElementById('error');
      const containerEl = document.getElementById('chatkit-container');
      
      try {
        // Fetch session from same origin
        const response = await fetch('/session', {
          method: 'GET',
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || \`Failed to fetch session: \${response.status}\`);
        }
        
        const data = await response.json();
        const clientSecret = data.client_secret;
        
        if (!clientSecret) {
          throw new Error('No client_secret received from session endpoint');
        }
        
        // Hide loading, show container
        loadingEl.style.display = 'none';
        containerEl.style.display = 'flex';
        
        // TODO: Initialize ChatKit UI here when ChatKit SDK is available
        // For now, show a test page that confirms session was created
        containerEl.innerHTML = \`
          <div style="padding: 20px; text-align: center;">
            <h2>Session OK</h2>
            <p style="color: #666; font-size: 14px;">
              ChatKit session created successfully.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Client secret received (not displayed for security).
            </p>
            <p style="color: #999; font-size: 11px; margin-top: 10px;">
              ChatKit UI integration pending.
            </p>
          </div>
        \`;
        
        // Log to console for debugging (but NOT the secret)
        console.log('ChatKit session created successfully');
        console.log('Client secret length:', clientSecret ? clientSecret.length : 0);
        
      } catch (error) {
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.className = 'error';
        errorEl.textContent = \`Error: \${error.message}\`;
        console.error('Failed to initialize ChatKit:', error);
      }
    })();
  </script>
</body>
</html>
  `);
});

// Serve static frontend in production (must be after specific routes like /chat and /session)
try {
  app.use(express.static(distDir));
  // SPA fallback to index.html
  app.get('*', (_, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} catch {}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
