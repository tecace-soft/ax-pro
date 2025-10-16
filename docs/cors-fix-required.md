# CORS Fix Required for n8n Webhooks

## Issue
The unindex webhook is failing with CORS errors:
```
Access to XMLHttpRequest at 'https://n8n.srv978041.hstgr.cloud/webhook/unindex-file' from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution Required
The n8n webhook needs to include CORS headers in its response:

```javascript
// Add these headers to the webhook response
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
```

## Current Workaround
The frontend now includes a fallback that uses `fetch` with `mode: 'no-cors'` to bypass CORS, but this means:
- We can't read the response
- We can't get the actual deleted count
- The request is sent but we can't confirm success

## Webhooks Affected
- `/webhook/unindex-file` - Currently failing with CORS
- `/webhook/upload-file` - May also need CORS headers

## Test After Fix
1. Try unindexing a file from Knowledge Index
2. Check browser console for success message
3. Verify chunks are actually removed from database
