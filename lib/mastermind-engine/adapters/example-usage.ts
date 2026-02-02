/**
 * CLI Adapter Example Usage
 * 
 * This file demonstrates various ways to use the CLI adapter for the mastermind engine.
 * It includes examples for both interactive and programmatic usage.
 */

import { 
  createCLIAdapter, 
  startCLIMastermind,
  createCLISessionManager,
  createCLIMemoryManager
} from './index';
import type {
  ConversationConfig,
  PersonaId,
  ModelId,
  ConversationStreamChunk,
  ConversationState
} from '../types';

/**
 * Example 1: Quick start with default configuration
 */
export async function quickStartExample(): Promise<void> {
  console.log('🚀 Quick Start Example');
  
  const config: ConversationConfig = {
    modelId: 'claude-sonnet-4-20250514' as ModelId,
    selectedPersonas: ['cs-lewis', 'chris-hedges', 'dostoevsky', 'george-orwell'] as PersonaId[],
    maxResponses: 5,
    enableMemory: false
  };

  await startCLIMastermind(config, {
    showDirectorInsights: true,
    enableColors: true
  });
}

/**
 * Example 2: Programmatic conversation handling
 */
export async function programmaticExample(): Promise<void> {
  console.log('🤖 Programmatic Example');
  
  const adapter = createCLIAdapter({
    enableColors: true,
    showDirectorInsights: true,
    verbose: true
  });

  const config: ConversationConfig = {
    modelId: 'claude-3-5-haiku-20241022' as ModelId,
    selectedPersonas: ['marcus-aurelius', 'benjamin-franklin'] as PersonaId[],
    maxResponses: 3,
    enableMemory: false
  };

  try {
    await adapter.initialize(config);
    
    // Start conversation with initial message
    const startResponse = await adapter.handleRequest({
      type: 'start',
      config,
      message: 'What is the meaning of wisdom in leadership?'
    });
    
    console.log('Start response:', startResponse.success);
    
    // Continue conversation
    if (startResponse.sessionId) {
      const continueResponse = await adapter.handleRequest({
        type: 'continue',
        sessionId: startResponse.sessionId,
        config,
        message: 'How can we apply this in modern times?'
      });
      
      console.log('Continue response:', continueResponse.success);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 3: Streaming conversation
 */
export async function streamingExample(): Promise<void> {
  console.log('🌊 Streaming Example');
  
  const adapter = createCLIAdapter({
    enableColors: true,
    showDirectorInsights: true
  });

  const config: ConversationConfig = {
    modelId: 'claude-3-5-haiku-20241022' as ModelId,
    selectedPersonas: ['albert-einstein', 'leonardo-da-vinci'] as PersonaId[],
    maxResponses: 2,
    enableMemory: false
  };

  const streamHandler = {
    async onChunk(chunk: ConversationStreamChunk): Promise<void> {
      console.log(`Stream: ${chunk.type}`, chunk.personaId);
    },
    
    async onComplete(finalState: ConversationState): Promise<void> {
      console.log('Streaming complete!', finalState.sessionId);
    },
    
    async onError(error: Error): Promise<void> {
      console.error('Streaming error:', error.message);
    }
  };

  try {
    await adapter.initialize(config);
    
    await adapter.handleStreamingRequest({
      type: 'start',
      config,
      message: 'What drives innovation and creativity?'
    }, streamHandler);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 4: With persistence and memory
 */
export async function persistentExample(): Promise<void> {
  console.log('💾 Persistent Example');
  
  // Create managers with persistence
  const sessionManager = createCLISessionManager({
    enablePersistence: true,
    verbose: true
  });
  
  const memoryManager = createCLIMemoryManager({
    verbose: true
  });

  const adapter = createCLIAdapter({
    enableColors: true,
    showDirectorInsights: true,
    enableMemory: true,
    verbose: true
  }, sessionManager, memoryManager);

  const config: ConversationConfig = {
    modelId: 'claude-3-5-haiku-20241022' as ModelId,
    selectedPersonas: ['carl-jung', 'sigmund-freud'] as PersonaId[],
    maxResponses: 3,
    enableMemory: true,
    userMemoryId: 'example_user_123'
  };

  try {
    await adapter.initialize(config);
    await adapter.startInteractiveSession();
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await adapter.cleanup();
  }
}

/**
 * Example 5: Custom configuration showcase
 */
export async function customConfigExample(): Promise<void> {
  console.log('⚙️ Custom Configuration Example');
  
  const config: ConversationConfig = {
    modelId: 'gpt-4o-mini' as ModelId,
    selectedPersonas: [
      'william-gibson', 
      'philip-k-dick', 
      'isaac-asimov', 
      'frank-herbert'
    ] as PersonaId[],
    maxResponses: 8,
    enableMemory: false,
    directorModelId: 'claude-3-5-sonnet-20240620' as ModelId,
    sessionConfig: {
      sessionId: 'sci_fi_roundtable_' + Date.now(),
      timeout: 7200000 // 2 hours
    }
  };

  const adapterConfig = {
    enableColors: true,
    showDirectorInsights: true,
    showMetadata: true,
    verbose: false,
    userPrompt: '🚀 sci-fi> ',
    welcomeMessage: `
🚀 Welcome to the Science Fiction Authors Roundtable!

Today's panel includes some of the greatest minds in speculative fiction:
• William Gibson - Cyberpunk visionary
• Philip K. Dick - Reality-bending philosopher
• Isaac Asimov - Foundation of robotics
• Frank Herbert - Ecological epic master

Ask them about the future, technology, consciousness, or the human condition!
Type 'quit' to end the discussion.
`,
    exitCommands: ['quit', 'exit', 'end', 'goodbye'],
    helpCommands: ['help', 'info', '?']
  };

  await startCLIMastermind(config, adapterConfig);
}

/**
 * Run examples based on command line arguments
 */
export async function runExamples(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    await quickStartExample();
  } else if (args.includes('--programmatic')) {
    await programmaticExample();
  } else if (args.includes('--streaming')) {
    await streamingExample();
  } else if (args.includes('--persistent')) {
    await persistentExample();
  } else if (args.includes('--custom')) {
    await customConfigExample();
  } else {
    console.log(`
🎭 CLI Adapter Examples

Available examples:
  --quick          Quick start with defaults
  --programmatic   Programmatic conversation handling
  --streaming      Streaming response example
  --persistent     With session persistence and memory
  --custom         Custom configuration showcase

Usage: npx tsx example-usage.ts [--example-name]
`);
  }
}

// Run if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}