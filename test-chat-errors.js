#!/usr/bin/env node

// Test script to check actual server error responses
const https = require('https');
const http = require('http');

// Test configurations
const testConfigs = [
  {
    name: 'Duplicate Chat ID Test',
    url: 'https://your-n8n-webhook-url.com/webhook/chat',
    payload: {
      sessionId: 'test-session-123',
      chatId: 'chat_test-session-123_1234567890_duplicate', // Intentionally duplicate
      userId: 'test-user',
      action: 'sendMessage',
      chatInput: 'What is the curriculum of the veterinary medicine class?'
    }
  },
  {
    name: 'Invalid Session Test',
    url: 'https://your-n8n-webhook-url.com/webhook/chat',
    payload: {
      sessionId: 'invalid-session',
      chatId: 'chat_invalid-session_1234567890_abc123',
      userId: 'test-user',
      action: 'sendMessage',
      chatInput: 'Test message'
    }
  },
  {
    name: 'Malformed Request Test',
    url: 'https://your-n8n-webhook-url.com/webhook/chat',
    payload: {
      sessionId: 'test-session-123',
      chatId: 'chat_test-session-123_1234567890_abc123',
      userId: 'test-user',
      action: 'invalidAction', // Wrong action
      chatInput: 'Test message'
    }
  }
];

async function makeRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'ChatBot-Test/1.0'
      },
      timeout: 30000 // 30 second timeout
    };

    console.log(`\n=== Making request to ${url} ===`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const req = client.request(options, (res) => {
      console.log(`\n--- Response ---`);
      console.log(`Status Code: ${res.statusCode}`);
      console.log(`Status Message: ${res.statusMessage}`);
      console.log('Headers:', JSON.stringify(res.headers, null, 2));
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n--- Response Body ---`);
        console.log(`Raw Response: "${data}"`);
        console.log(`Response Length: ${data.length}`);
        console.log(`Is Empty: ${!data || data.trim() === ''}`);
        
        if (data.trim()) {
          try {
            const parsed = JSON.parse(data);
            console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));
          } catch (e) {
            console.log('Not valid JSON, raw text:', data);
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      console.log(`\n--- Request Error ---`);
      console.log('Error:', error.message);
      console.log('Error Code:', error.code);
      console.log('Error Type:', error.constructor.name);
      reject(error);
    });

    req.on('timeout', () => {
      console.log(`\n--- Request Timeout ---`);
      req.destroy();
      reject(new Error('Request timeout after 30 seconds'));
    });

    req.write(postData);
    req.end();
  });
}

async function testServerErrors() {
  console.log('🔍 Testing actual server error responses...\n');
  
  // First, let's check if we have any configured webhook URLs
  console.log('Note: You need to replace the webhook URLs in this script with your actual n8n webhook URLs.');
  console.log('You can find them in your browser\'s developer tools or in the Settings page.\n');
  
  for (const config of testConfigs) {
    try {
      console.log(`\n🧪 Testing: ${config.name}`);
      console.log('='.repeat(50));
      
      const result = await makeRequest(config.url, config.payload);
      
      console.log(`\n✅ Test completed for ${config.name}`);
      console.log(`Success: ${result.success}`);
      
    } catch (error) {
      console.log(`\n❌ Test failed for ${config.name}`);
      console.log(`Error: ${error.message}`);
      console.log(`Error Type: ${error.constructor.name}`);
    }
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 All tests completed!');
  console.log('\nTo use this script:');
  console.log('1. Replace the webhook URLs with your actual n8n webhook URLs');
  console.log('2. Run: node test-chat-errors.js');
  console.log('3. Check the console output for actual error responses');
}

// Run the tests
testServerErrors().catch(console.error);
