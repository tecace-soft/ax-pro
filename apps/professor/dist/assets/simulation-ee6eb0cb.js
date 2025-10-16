const i=t=>{const e=t.toLowerCase();return e.includes("psdap")||e.includes("program")?{reply:`The PSDAP (Professional Skills Development and Assessment Program) is a comprehensive initiative designed to enhance professional competencies across various domains. 

Key features include:
• Structured skill assessment frameworks
• Personalized learning pathways
• Industry-aligned competency standards
• Continuous professional development tracking

The program integrates with existing educational systems and provides real-time feedback mechanisms to support career advancement and professional growth.`,citations:[{sourceType:"document",title:"PSDAP Program Overview",snippet:"Professional Skills Development and Assessment Program framework documentation",sourceId:"https://example.com/psdap-overview"},{sourceType:"kb",title:"Competency Standards",snippet:"Industry-aligned competency standards for professional development",sourceId:"https://example.com/competency-standards"}]}:e.includes("api")||e.includes("integration")?{reply:`Based on your question about APIs and integration, here's what you need to know:

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

For your specific use case, I recommend starting with a simple REST API and gradually adding more complex features as needed.`,citations:[{sourceType:"web",title:"API Security Best Practices",snippet:"Comprehensive guide to securing API endpoints and managing authentication",sourceId:"https://example.com/api-security"}]}:e.includes("help")||e.includes("how")?{reply:`I'm here to help! I can assist you with:

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

What specific area would you like to explore? Feel free to ask detailed questions about any topic.`,citations:[{sourceType:"kb",title:"Help Documentation",snippet:"Comprehensive help and support documentation",sourceId:"https://example.com/help-docs"}]}:{reply:`I understand you're asking about "${t}". I'm here to help you with your questions and provide assistance.

How can I help you further?`,citations:[{sourceType:"web",title:"General Information",snippet:"General information and support resources",sourceId:"https://example.com/general-info"}]}},p=async function*(t){console.log("Starting simulation for:",t.chatInput);const e=i(t.chatInput);console.log("Generated response:",e.reply);const n=e.reply.split(" ");console.log("Words to stream:",n);for(let o=0;o<n.length;o++){const r=n[o],c=o===n.length-1,a=r+(c?"":" ");console.log(`Streaming word ${o+1}/${n.length}:`,a),yield{type:"delta",text:a},await new Promise(l=>setTimeout(l,50+Math.random()*100))}const s=`sim_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;console.log("Final message ID:",s),console.log("Final response content:",e.reply),yield{type:"final",messageId:s,citations:e.citations}},d=async t=>(await new Promise(e=>setTimeout(e,500+Math.random()*1e3)),i(t.chatInput));export{i as generateSimulatedResponse,d as simulateResponse,p as simulateStreamingResponse};
