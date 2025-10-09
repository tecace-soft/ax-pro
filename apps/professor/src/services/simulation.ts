// Message simulation service for development
export interface SimulationRequest {
  sessionId: string;
  action: 'sendMessage';
  chatInput: string;
}

export interface SimulationResponse {
  reply: string;
  citations?: Array<{
    sourceType: string;
    title: string;
    snippet: string;
    sourceId?: string;
  }>;
}

// Simulate different types of responses based on input
const generateSimulatedResponse = (input: string): SimulationResponse => {
  const lowerInput = input.toLowerCase();
  
  // PSDAP program specific response
  if (lowerInput.includes('psdap') || lowerInput.includes('program')) {
    return {
      reply: `The PSDAP (Professional Skills Development and Assessment Program) is a comprehensive initiative designed to enhance professional competencies across various domains. 

Key features include:
• Structured skill assessment frameworks
• Personalized learning pathways
• Industry-aligned competency standards
• Continuous professional development tracking

The program integrates with existing educational systems and provides real-time feedback mechanisms to support career advancement and professional growth.`,
      citations: [
        {
          sourceType: 'document',
          title: 'PSDAP Program Overview',
          snippet: 'Professional Skills Development and Assessment Program framework documentation',
          sourceId: 'https://example.com/psdap-overview'
        },
        {
          sourceType: 'kb',
          title: 'Competency Standards',
          snippet: 'Industry-aligned competency standards for professional development',
          sourceId: 'https://example.com/competency-standards'
        }
      ]
    };
  }

  // Technical questions
  if (lowerInput.includes('api') || lowerInput.includes('integration')) {
    return {
      reply: `Based on your question about APIs and integration, here's what you need to know:

**API Integration Best Practices:**
• Use proper authentication mechanisms
• Implement rate limiting and error handling
• Follow RESTful design principles
• Maintain comprehensive documentation

**Security Considerations:**
• Store API keys securely using environment variables
• Implement proper access controls
• Use HTTPS for all communications
• Regular security audits and updates

For your specific use case, I recommend starting with a simple REST API and gradually adding more complex features as needed.`,
      citations: [
        {
          sourceType: 'web',
          title: 'API Security Best Practices',
          snippet: 'Comprehensive guide to securing API endpoints and managing authentication',
          sourceId: 'https://example.com/api-security'
        }
      ]
    };
  }

  // General questions
  if (lowerInput.includes('help') || lowerInput.includes('how')) {
    return {
      reply: `I'm here to help! I can assist you with:

**Technical Support:**
• API integration and configuration
• System troubleshooting
• Best practices and recommendations

**Information & Research:**
• Program documentation and guidelines
• Technical specifications
• Industry standards and compliance

**Development Assistance:**
• Code review and optimization
• Architecture recommendations
• Security implementation

What specific area would you like to explore? Feel free to ask detailed questions about any topic.`,
      citations: [
        {
          sourceType: 'kb',
          title: 'Help Documentation',
          snippet: 'Comprehensive help and support documentation',
          sourceId: 'https://example.com/help-docs'
        }
      ]
    };
  }

  // Default response - make it simpler
  return {
    reply: `Hello! I received your message: "${input}"

This is a simulation response. I'm here to help with your questions and provide assistance.

What would you like to know?`,
    citations: [
      {
        sourceType: 'web',
        title: 'General Information',
        snippet: 'General information and support resources',
        sourceId: 'https://example.com/general-info'
      }
    ]
  };
};

// Simulate streaming response
export const simulateStreamingResponse = async function* (
  request: SimulationRequest
): AsyncGenerator<{ type: 'delta' | 'final'; text?: string; messageId?: string; citations?: any[] }> {
  console.log('Starting simulation for:', request.chatInput);
  const response = generateSimulatedResponse(request.chatInput);
  console.log('Generated response:', response.reply);
  
  const words = response.reply.split(' ');
  console.log('Words to stream:', words);
  
  // Simulate streaming by sending words one by one
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const isLastWord = i === words.length - 1;
    const textToSend = word + (isLastWord ? '' : ' ');
    
    console.log(`Streaming word ${i + 1}/${words.length}:`, textToSend);
    
    yield {
      type: 'delta',
      text: textToSend
    };
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  }
  
  // Send final response
  const messageId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log('Final message ID:', messageId);
  console.log('Final response content:', response.reply);
  
  yield {
    type: 'final',
    messageId,
    citations: response.citations
  };
};

// Simulate non-streaming response
export const simulateResponse = async (request: SimulationRequest): Promise<SimulationResponse> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  return generateSimulatedResponse(request.chatInput);
};
