# Chatbot API/Webhook Integration Guide

## Overview

This guide explains how to integrate with the AX Pro chatbot using either the REST API or n8n webhook approach.

---

## Integration Methods

### Method 1: REST API (Recommended for Backend Integration)

If you have access to the backend API server:

#### Base URL
```
http://localhost:3000/api
```

#### Authentication
- Use session-based authentication
- Include credentials in requests: `credentials: 'include'`

#### Send a Message

**Endpoint:** `POST /sessions/{sessionId}/messages`

**Request:**
```json
{
  "content": "Your message here",
  "stream": false
}
```

**Response (Non-streaming):**
```json
{
  "reply": "AI response text",
  "messageId": "msg_123456789",
  "citations": [
    {
      "id": "cite_1",
      "messageId": "msg_123456789",
      "title": "Document Title",
      "content": "Cited content...",
      "metadata": {}
    }
  ]
}
```

**Response (Streaming):**
When `stream: true`, the response is a Server-Sent Events (SSE) stream:
```
data: {"type":"delta","content":"Hello"}
data: {"type":"delta","content":" world"}
data: {"type":"final","messageId":"msg_123","citations":[]}
```

#### Example (JavaScript/TypeScript)

```typescript
// Non-streaming request
const response = await fetch('http://localhost:3000/api/sessions/session_123/messages', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'What is machine learning?',
    stream: false
  })
});

const data = await response.json();
console.log('AI Response:', data.reply);
console.log('Message ID:', data.messageId);
console.log('Citations:', data.citations);
```

```typescript
// Streaming request
const response = await fetch('http://localhost:3000/api/sessions/session_123/messages', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Explain neural networks',
    stream: true
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      
      if (data.type === 'delta') {
        process.stdout.write(data.content); // Print incrementally
      } else if (data.type === 'final') {
        console.log('\nMessage ID:', data.messageId);
        console.log('Citations:', data.citations);
      }
    }
  }
}
```

---

### Method 2: n8n Webhook (Recommended for External Integration)

If you don't have access to the backend API, use the n8n webhook for direct integration.

#### Webhook URL
```
https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353
```

#### Request Format

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "sessionId": "unique_session_identifier",
  "chatId": "chat_1234567890_abc123",
  "userId": "user@example.com",
  "action": "sendMessage",
  "chatInput": "Your message here"
}
```

**Field Descriptions:**
- `sessionId` (string, required): Unique identifier for the chat session
- `chatId` (string, required): Unique identifier for this specific message (for feedback tracking)
  - Format: `chat_{sessionId}_{timestamp}_{random}`
  - Example: `chat_session123_1234567890_abc123def`
- `userId` (string, required): Identifier for the user sending the message
- `action` (string, required): Must be `"sendMessage"`
- `chatInput` (string, required): The actual message content from the user

#### Response Format

```json
{
  "answer": "AI generated response text",
  "citationTitle": "Source Document Title (optional)",
  "citationContent": "Relevant excerpt from source (optional)"
}
```

**Field Descriptions:**
- `answer` (string): The chatbot's response to the user's message
- `citationTitle` (string, optional): Title of the document/source cited in the response
- `citationContent` (string, optional): Relevant content excerpt from the cited source

#### Example (cURL)

```bash
curl -X POST https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_abc123",
    "chatId": "chat_session_abc123_1234567890_xyz",
    "userId": "john.doe@company.com",
    "action": "sendMessage",
    "chatInput": "What are the benefits of machine learning?"
  }'
```

#### Example (JavaScript/TypeScript)

```typescript
async function sendMessageToN8n(
  sessionId: string,
  userId: string,
  message: string
): Promise<{ answer: string; citationTitle?: string; citationContent?: string }> {
  // Generate unique chatId
  const chatId = `chat_${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const response = await fetch(
    'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      body: JSON.stringify({
        sessionId: sessionId,
        chatId: chatId,
        userId: userId,
        action: 'sendMessage',
        chatInput: message
      })
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  // Handle array or object response
  if (Array.isArray(data)) {
    return data[0];
  }
  
  return data;
}

// Usage
try {
  const result = await sendMessageToN8n(
    'session_12345',
    'user@example.com',
    'Explain neural networks'
  );
  
  console.log('Answer:', result.answer);
  if (result.citationTitle) {
    console.log('Source:', result.citationTitle);
    console.log('Excerpt:', result.citationContent);
  }
} catch (error) {
  console.error('Error:', error.message);
}
```

#### Example (Python)

```python
import requests
import json
import time
import random
import string

def generate_chat_id(session_id):
    timestamp = int(time.time() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=9))
    return f"chat_{session_id}_{timestamp}_{random_str}"

def send_message_to_n8n(session_id, user_id, message):
    url = "https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353"
    
    payload = {
        "sessionId": session_id,
        "chatId": generate_chat_id(session_id),
        "userId": user_id,
        "action": "sendMessage",
        "chatInput": message
    }
    
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=30)
    response.raise_for_status()
    
    data = response.json()
    
    # Handle array or object response
    if isinstance(data, list):
        return data[0]
    
    return data

# Usage
try:
    result = send_message_to_n8n(
        session_id="session_12345",
        user_id="user@example.com",
        message="What is machine learning?"
    )
    
    print("Answer:", result["answer"])
    if "citationTitle" in result:
        print("Source:", result["citationTitle"])
        print("Excerpt:", result["citationContent"])
except Exception as e:
    print("Error:", str(e))
```

---

## Error Handling

### Common Errors

1. **Timeout (30s)**
   - The webhook has a 30-second timeout
   - If no response is received, retry with exponential backoff

2. **Empty Response**
   - Check that your n8n workflow is properly configured
   - Ensure the "Respond to Webhook" node is connected

3. **CORS Errors**
   - If calling from a browser, ensure CORS is configured in n8n
   - For production, use a backend proxy

4. **Invalid JSON**
   - Ensure all request fields are properly formatted
   - Check that `action` is exactly `"sendMessage"`

### Retry Strategy (Recommended)

```typescript
async function sendWithRetry(request: any, maxAttempts = 3) {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.trim() === '') {
        throw new Error('Empty response');
      }
      
      return JSON.parse(text);
    } catch (error: any) {
      console.warn(`Attempt ${attempt} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxAttempts) {
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed after ${maxAttempts} attempts: ${lastError?.message}`);
}
```

---

## Best Practices

1. **Unique Chat IDs**: Always generate unique `chatId` values for each message
   - Format: `chat_{sessionId}_{timestamp}_{randomString}`
   - This ensures proper feedback tracking in the admin dashboard

2. **Session Management**: 
   - Use consistent `sessionId` for conversations within the same session
   - Create a new `sessionId` for each new conversation

3. **Error Handling**: 
   - Implement retry logic with exponential backoff
   - Log failed requests for debugging

4. **Timeout**: 
   - Set a reasonable timeout (30s recommended)
   - Show loading indicators to users

5. **Citations**: 
   - Display `citationTitle` and `citationContent` when available
   - This helps users understand the source of information

---

## Testing

### Test with cURL

```bash
# Test webhook connection
curl -X POST https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353 \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test_session",
    "chatId": "chat_test_'$(date +%s)'_test",
    "userId": "test_user",
    "action": "sendMessage",
    "chatInput": "Hello"
  }'
```

### Test with Postman

1. Create a new POST request
2. URL: `https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON):
```json
{
  "sessionId": "postman_test",
  "chatId": "chat_postman_1234567890_test",
  "userId": "test@example.com",
  "action": "sendMessage",
  "chatInput": "What is AI?"
}
```
5. Send and inspect the response

---

## Configuration Management

### Changing Webhook URL

If you need to use a different n8n webhook:

1. Go to **Settings** > **API Configuration** in the AX Pro dashboard
2. Click **Add Webhook Configuration**
3. Enter your webhook URL and give it a name
4. Set it as active
5. Test the connection

### Environment Variables (Backend API)

If using the backend API, configure these in your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# n8n Webhook (optional, can be managed in UI)
VITE_N8N_WEBHOOK_URL=your_n8n_webhook_url
```

---

## Support

For issues or questions:
- Check the admin dashboard logs for detailed error messages
- Review n8n workflow configuration
- Contact your development team for webhook access

---

## Changelog

- **2024-01**: Initial documentation
- **2024-02**: Added retry mechanism and error handling
- **2024-03**: Added Python examples and best practices

