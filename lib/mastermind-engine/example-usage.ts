/**
 * Example usage of the Mastermind Conversation Engine
 * 
 * This file demonstrates how to use the conversation engine in different scenarios:
 * 1. Basic conversation setup
 * 2. Streaming conversation with custom handler
 * 3. Non-streaming batch conversation
 * 4. Error handling and conversation management
 */

import {
  createMastermindEngine,
  createBasicConfig,
  createLoggingStreamHandler,
  type MastermindEngineConfig,
  type ConversationStreamChunk
} from './index';

// Example 1: Basic conversation setup
async function basicConversationExample() {
  console.log('=== Basic Conversation Example ===');
  
  // Create engine with custom configuration
  const engineConfig: Partial<MastermindEngineConfig> = {
    enableLogging: true,
    maxResponses: 5,
    defaultModelId: 'claude-sonnet-4-20250514',
    directorModelId: 'gpt-4o-mini'
  };
  
  const engine = createMastermindEngine(engineConfig);
  
  // Create conversation configuration
  const conversationConfig = createBasicConfig(
    'claude-3-5-haiku-20241022',
    ['marcus-aurelius', 'socrates', 'helpful-assistant'],
    {
      maxResponses: 5,
      enableMemory: false
    }
  );
  
  // Start conversation
  const conversationState = await engine.startConversation(
    conversationConfig,
    "What are the key principles for living a meaningful life?"
  );
  
  console.log('Conversation started:', conversationState.sessionId);
  
  // Generate a single response
  const response = await engine.generateNextResponse(conversationState.sessionId);
  console.log('Response generated:', {
    success: response.success,
    speaker: response.speakingPersona,
    shouldContinue: response.shouldContinue
  });
  
  return conversationState.sessionId;
}

// Example 2: Streaming conversation with custom handler
async function streamingConversationExample() {
  console.log('\n=== Streaming Conversation Example ===');
  
  const engine = createMastermindEngine({
    enableLogging: true,
    streamingChunkSize: 10, // Smaller chunks for demo
    streamingDelayMs: 50    // Slower for visibility
  });
  
  const conversationConfig = createBasicConfig(
    'claude-3-5-haiku-20241022',
    ['socrates', 'marcus-aurelius'],
    { maxResponses: 3 }
  );
  
  // Create a conversation state
  const conversationState = await engine.startConversation(
    conversationConfig,
    "How should we approach difficult decisions in life?"
  );
  
  // Create custom stream handler
  const handler = createLoggingStreamHandler(
    // Custom chunk handler
    async (chunk: ConversationStreamChunk) => {
      switch (chunk.type) {
        case 'start':
          console.log(`🎤 ${chunk.personaId} is starting to speak...`);
          if (chunk.directorInsight) {
            console.log(`🎬 Director insight: ${chunk.directorInsight.rationale}`);
          }
          break;
        case 'chunk':
          if (chunk.chunk) {
            process.stdout.write(chunk.chunk); // Real-time text output
          }
          break;
        case 'end':
          console.log(`\n✅ ${chunk.personaId} finished speaking`);
          break;
        case 'error':
          console.log(`❌ Error: ${chunk.error?.message}`);
          break;
        case 'complete':
          console.log(`🏁 Conversation completed: ${chunk.completion?.reason}`);
          break;
      }
    },
    // Custom completion handler
    async (finalState) => {
      console.log('\n📊 Final conversation stats:', {
        totalMessages: finalState.messages.length,
        responseCount: finalState.responseCount,
        duration: Date.now() - (finalState.metadata?.startTime || 0)
      });
    }
  );
  
  // Run streaming conversation
  await engine.generateStreamingResponse(conversationState.sessionId, handler);
  
  return conversationState.sessionId;
}

// Example 3: Non-streaming batch conversation
async function batchConversationExample() {
  console.log('\n=== Batch Conversation Example ===');
  
  const engine = createMastermindEngine({
    enableLogging: false, // Quieter for batch processing
    maxResponses: 4
  });
  
  const conversationConfig = createBasicConfig(
    'claude-3-5-haiku-20241022',
    ['helpful-assistant', 'socrates'],
    { maxResponses: 4 }
  );
  
  // Start conversation
  let conversationState = await engine.startConversation(
    conversationConfig,
    "What is the nature of knowledge and learning?"
  );
  
  console.log('Starting batch conversation...');
  
  // Generate responses until completion
  let responseCount = 0;
  while (responseCount < 4) {
    const response = await engine.generateNextResponse(conversationState.sessionId);
    
    if (!response.success || !response.shouldContinue) {
      console.log(`Conversation ended: ${response.metadata.endReason || 'Unknown reason'}`);
      break;
    }
    
    responseCount++;
    console.log(`Response ${responseCount}: ${response.speakingPersona} (${response.responseText?.length} chars)`);
    
    // Update our local state reference
    conversationState = response.conversationState;
  }
  
  console.log('Batch conversation completed');
  return conversationState.sessionId;
}

// Example 4: Error handling and conversation management
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const engine = createMastermindEngine({
    enableLogging: true,
    maxResponses: 2
  });
  
  try {
    // Try to get a non-existent conversation
    const nonExistentState = await engine.getConversationState('invalid-session-id');
    console.log('Non-existent conversation:', nonExistentState);
    
    // Try to generate response for non-existent session
    await engine.generateNextResponse('invalid-session-id');
    console.log('This should not execute');
    
  } catch (error) {
    console.log('Caught expected error:', error instanceof Error ? error.message : error);
  }
  
  // Create a real conversation and demonstrate cleanup
  const conversationConfig = createBasicConfig(
    'claude-3-5-haiku-20241022',
    ['helpful-assistant']
  );
  
  const conversationState = await engine.startConversation(conversationConfig);
  console.log('Created conversation for cleanup demo:', conversationState.sessionId);
  
  // End conversation explicitly
  await engine.endConversation(conversationState.sessionId, 'Manual termination');
  console.log('Conversation ended explicitly');
  
  // Run cleanup
  await engine.cleanup();
  console.log('Cleanup completed');
  
  return conversationState.sessionId;
}

// Example 5: Custom engine configuration
async function customConfigurationExample() {
  console.log('\n=== Custom Configuration Example ===');
  
  // Create engine with heavily customized configuration
  const customConfig: Partial<MastermindEngineConfig> = {
    defaultModelId: 'claude-3-5-haiku-20241022',
    directorModelId: 'gpt-4o-mini',
    maxResponses: 6,
    personaConfig: {
      maxRetries: 5,
      minResponseLength: 20,
      temperature: 0.8,
      maxTokens: 300,
      useExponentialBackoff: true
    },
    sessionConfig: {
      timeoutMs: 7200000, // 2 hours
      cleanupIntervalMs: 1800000 // 30 minutes
    },
    streamingChunkSize: 15,
    streamingDelayMs: 25,
    responseDelayMs: 1000,
    enableLogging: true,
    enableMemory: false
  };
  
  const engine = createMastermindEngine(customConfig);
  
  const conversationConfig = createBasicConfig(
    'claude-3-5-haiku-20241022',
    ['marcus-aurelius', 'socrates', 'helpful-assistant'],
    { maxResponses: 3 }
  );
  
  const conversationState = await engine.startConversation(
    conversationConfig,
    "How do we balance individual freedom with social responsibility?"
  );
  
  console.log('Custom configuration conversation started:', conversationState.sessionId);
  
  // Generate one response to demonstrate the custom configuration
  const response = await engine.generateNextResponse(conversationState.sessionId);
  console.log('Custom config response:', {
    success: response.success,
    attempts: response.metadata.attempts,
    responseTime: response.metadata.responseTime
  });
  
  return conversationState.sessionId;
}

// Main function to run all examples
export async function runAllExamples() {
  console.log('🚀 Running Mastermind Engine Examples\n');
  
  try {
    // Run examples sequentially
    await basicConversationExample();
    await streamingConversationExample();
    await batchConversationExample();
    await errorHandlingExample();
    await customConfigurationExample();
    
    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    throw error;
  }
}

// Helper function to run a single example by name
export async function runExample(exampleName: string) {
  const examples: Record<string, () => Promise<string>> = {
    'basic': basicConversationExample,
    'streaming': streamingConversationExample,
    'batch': batchConversationExample,
    'error-handling': errorHandlingExample,
    'custom-config': customConfigurationExample
  };
  
  const example = examples[exampleName];
  if (!example) {
    throw new Error(`Unknown example: ${exampleName}. Available: ${Object.keys(examples).join(', ')}`);
  }
  
  console.log(`Running example: ${exampleName}`);
  return await example();
}

// Export individual examples for testing
export {
  basicConversationExample,
  streamingConversationExample,
  batchConversationExample,
  errorHandlingExample,
  customConfigurationExample
};