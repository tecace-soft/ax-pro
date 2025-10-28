// Browser console test script for actual webhook testing
// Run this in your browser's developer console while on the chat page

async function testActualWebhookErrors() {
  console.log('🔍 Testing actual webhook error responses...');
  
  // Get the current webhook configuration from localStorage
  const n8nConfigs = JSON.parse(localStorage.getItem('axpro_n8n_configs') || '[]');
  const activeConfigId = localStorage.getItem('axpro_active_n8n_config');
  const activeConfig = n8nConfigs.find(config => config.id === activeConfigId);
  
  if (!activeConfig) {
    console.error('❌ No active n8n configuration found');
    console.log('Please configure n8n webhook in Settings first');
    return;
  }
  
  console.log('📡 Using webhook:', activeConfig.webhookUrl);
  
  const testCases = [
    {
      name: 'Duplicate Chat ID Test',
      payload: {
        sessionId: 'test-session-duplicate',
        chatId: 'chat_test-session-duplicate_1234567890_duplicate123', // Same ID twice
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: 'What is the curriculum of the veterinary medicine class?'
      }
    },
    {
      name: 'Same Chat ID Test (should fail on second request)',
      payload: {
        sessionId: 'test-session-same',
        chatId: 'chat_test-session-same_1234567890_sameid123',
        userId: 'test-user',
        action: 'sendMessage',
        chatInput: 'First message'
      }
    },
    {
      name: 'Invalid Action Test',
      payload: {
        sessionId: 'test-session-invalid',
        chatId: 'chat_test-session-invalid_1234567890_invalid123',
        userId: 'test-user',
        action: 'invalidAction',
        chatInput: 'Test message'
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
    }
  ];
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🧪 Test ${i + 1}: ${testCase.name}`);
    console.log('='.repeat(50));
    
    try {
      const response = await fetch(activeConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(testCase.payload)
      });
      
      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
      console.log('📋 Response Headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log(`📄 Response Body: "${responseText}"`);
      console.log(`📏 Response Length: ${responseText.length}`);
      console.log(`🔍 Is Empty: ${!responseText || responseText.trim() === ''}`);
      
      if (responseText.trim()) {
        try {
          const parsed = JSON.parse(responseText);
          console.log('📦 Parsed JSON:', parsed);
          
          // Check for specific error patterns
          if (parsed.error) {
            console.log('🚨 Error field found:', parsed.error);
          }
          if (parsed.message) {
            console.log('💬 Message field found:', parsed.message);
          }
          if (parsed.answer && parsed.answer.includes('error')) {
            console.log('🤖 Answer contains error:', parsed.answer);
          }
        } catch (e) {
          console.log('⚠️ Not valid JSON, raw text:', responseText);
        }
      }
      
      console.log(`✅ Test ${i + 1} completed`);
      
    } catch (error) {
      console.log(`❌ Test ${i + 1} failed:`, error.message);
      console.log('🔍 Error type:', error.constructor.name);
      console.log('🔍 Error code:', error.code);
    }
    
    // Wait between tests
    if (i < testCases.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n🏁 All tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Check the console output above for actual error responses');
  console.log('- Look for patterns in error messages and status codes');
  console.log('- Use this information to improve error handling in the code');
}

// Run the test
testActualWebhookErrors();
