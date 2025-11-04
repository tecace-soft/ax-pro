#!/usr/bin/env node

// Test script using actual webhook URLs from the application
const https = require('https');
const http = require('http');

// Real webhook URLs from the application
const WEBHOOK_URLS = [
  {
    name: 'Default Webhook',
    url: 'https://n8n.srv978041.hstgr.cloud/webhook/328757ba-62e6-465e-be1b-2fff0fd1d353'
  },
  {
    name: 'SeokHoon Kang Webhook',
    url: 'https://n8n.srv978041.hstgr.cloud/webhook/63647efd-8c39-42d5-8e1f-b465d62091c6'
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
        'User-Agent': 'ChatBot-Test/1.0',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
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
            
            // Analyze the response for error patterns
            console.log('\n--- Error Analysis ---');
            if (parsed.error) {
              console.log('🚨 Error field:', parsed.error);
            }
            if (parsed.message) {
              console.log('💬 Message field:', parsed.message);
            }
            if (parsed.answer) {
              console.log('🤖 Answer field:', parsed.answer);
              if (parsed.answer.includes('error') || parsed.answer.includes('Error')) {
                console.log('⚠️ Answer contains error text');
              }
            }
            if (parsed.status) {
              console.log('📊 Status field:', parsed.status);
            }
            
            // Check for common error patterns
            const responseStr = JSON.stringify(parsed).toLowerCase();
            if (responseStr.includes('duplicate')) {
              console.log('🔄 DUPLICATE ERROR DETECTED');
            }
            if (responseStr.includes('unique')) {
              console.log('🔑 UNIQUE CONSTRAINT ERROR DETECTED');
            }
            if (responseStr.includes('already exists')) {
              console.log('📋 ALREADY EXISTS ERROR DETECTED');
            }
            if (responseStr.includes('not found')) {
              console.log('🔍 NOT FOUND ERROR DETECTED');
            }
            if (responseStr.includes('invalid')) {
              console.log('❌ INVALID ERROR DETECTED');
            }
            if (responseStr.includes('timeout')) {
              console.log('⏰ TIMEOUT ERROR DETECTED');
            }
            
          } catch (e) {
            console.log('⚠️ Not valid JSON, raw text:', data);
            
            // Check raw text for error patterns
            const lowerData = data.toLowerCase();
            if (lowerData.includes('duplicate')) {
              console.log('🔄 DUPLICATE ERROR DETECTED (raw text)');
            }
            if (lowerData.includes('unique')) {
              console.log('🔑 UNIQUE CONSTRAINT ERROR DETECTED (raw text)');
            }
            if (lowerData.includes('already exists')) {
              console.log('📋 ALREADY EXISTS ERROR DETECTED (raw text)');
            }
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

async function testWebhookErrors() {
  console.log('🔍 Testing actual webhook error responses...\n');
  
  const testCases = [
    {
      name: 'Normal Request (should work)',
      payload: {
        sessionId: 'test-session-normal',
        chatId: 'chat_test-session-normal_1234567890_normal123',
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: 'Hello, this is a test message'
      }
    },
    {
      name: 'Duplicate Chat ID Test',
      payload: {
        sessionId: 'test-session-duplicate',
        chatId: 'chat_test-session-duplicate_1234567890_duplicate123',
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: 'First message with duplicate ID'
      }
    },
    {
      name: 'Same Chat ID Test (should fail)',
      payload: {
        sessionId: 'test-session-duplicate',
        chatId: 'chat_test-session-duplicate_1234567890_duplicate123', // Same as above
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: 'Second message with same ID'
      }
    },
    {
      name: 'Invalid Action Test',
      payload: {
        sessionId: 'test-session-invalid',
        chatId: 'chat_test-session-invalid_1234567890_invalid123',
        userId: 'test-user',
        action: 'invalidAction',
        chatInput: 'Test message with invalid action'
      }
    },
    {
      name: 'Missing Required Field Test',
      payload: {
        sessionId: 'test-session-missing',
        chatId: 'chat_test-session-missing_1234567890_missing123',
        userId: 'test-user',
        action: 'sendMessage'
        // Missing chatInput
      }
    },
    {
      name: 'Empty Chat Input Test',
      payload: {
        sessionId: 'test-session-empty',
        chatId: 'chat_test-session-empty_1234567890_empty123',
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: ''
      }
    }
  ];
  
  for (const webhook of WEBHOOK_URLS) {
    console.log(`\n🌐 Testing Webhook: ${webhook.name}`);
    console.log(`URL: ${webhook.url}`);
    console.log('='.repeat(80));
    
    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n🧪 Test ${i + 1}: ${testCase.name}`);
      console.log('-'.repeat(50));
      
      try {
        const result = await makeRequest(webhook.url, testCase.payload);
        
        console.log(`\n✅ Test ${i + 1} completed for ${webhook.name}`);
        console.log(`Success: ${result.success}`);
        
        // Special handling for duplicate ID test
        if (testCase.name.includes('Same Chat ID') && result.success) {
          console.log('⚠️ WARNING: Duplicate ID test succeeded - this might indicate the server allows duplicates');
        }
        
      } catch (error) {
        console.log(`\n❌ Test ${i + 1} failed for ${webhook.name}`);
        console.log(`Error: ${error.message}`);
        console.log(`Error Type: ${error.constructor.name}`);
      }
      
      // Wait between tests
      if (i < testCases.length - 1) {
        console.log('\n⏳ Waiting 3 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Check the console output above for actual error responses');
  console.log('- Look for patterns in error messages and status codes');
  console.log('- Pay special attention to duplicate ID tests');
  console.log('- Use this information to improve error handling in the code');
}

// Run the tests
testWebhookErrors().catch(console.error);
