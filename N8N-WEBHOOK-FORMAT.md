# n8n Webhook Body Format

## Current Implementation Status: ✅ CORRECT

The n8n webhook integration is **already correctly implemented** with the exact format required by the developer.

## Request Body Format

```json
{
  "sessionId": "test2a0ea75d4e1c94f8afa2c39f8a10",
  "chatId": "test9230frq193ow9i30d8ffh29edek",
  "userId": "409esj1923",
  "action": "sendMessage",
  "chatInput": "What is the PSDAP program?"
}
```

## Field Details

### `chatId`
- **Must be unique for each message**
- Generated using: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
- Example: `"chat_1760398765432_x7k2m9p1q"`
- Used for linking messages to feedback in Supabase

### `sessionId`
- Unique identifier for the chat session
- Remains constant for all messages in a session
- Example: `"4afd2a0ea75d4e1c94f8afa2c39f8a10"`

### `userId`
- Unique identifier for the user
- Retrieved from the user's session
- Example: `"409esj1923"`

### `action`
- Always: `"sendMessage"`
- Fixed value for this webhook type

### `chatInput`
- The actual message text from the user
- Example: `"What is the PSDAP program?"`

## Implementation Files

1. **`/apps/professor/src/services/n8n.ts`**
   - Line 199: `body: JSON.stringify(request)`
   - Sends the request object as-is (not wrapped in array)

2. **`/apps/professor/src/services/chat.ts`**
   - Lines 124-132: Creates unique `chatId` for each message
   - Builds the complete `N8nRequest` object

3. **`/apps/professor/test-n8n.html`**
   - Lines 41-47: Test page with correct format
   - Line 60: `body: JSON.stringify(requestBody)`

## Expected Response Format

```json
{
  "answer": "The response text from the AI",
  "citationTitle": "Optional citation title",
  "citationContent": "Optional citation content"
}
```

## Notes

- Previous implementation used array format: `[{...}]` ❌
- Current implementation uses object format: `{...}` ✅
- The `chatId` is generated fresh for each message, not reused
- This ensures each message can be uniquely identified for feedback tracking
