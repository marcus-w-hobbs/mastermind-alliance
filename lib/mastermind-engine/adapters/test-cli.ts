#!/usr/bin/env node

/**
 * Simple test script for the CLI adapter
 * 
 * This script tests the basic functionality of the CLI adapter
 * to ensure everything is working correctly.
 */

import { createCLIAdapter, startCLIMastermind } from './cli-adapter';
import { ConversationConfig, PersonaId, ModelId } from '../types';

/**
 * Simple color utility for output
 */
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`
};

/**
 * Test basic CLI adapter functionality
 */
async function testBasicFunctionality(): Promise<void> {
  console.log(colors.cyan('🧪 Testing Basic CLI Adapter Functionality\n'));

  try {
    const adapter = createCLIAdapter({
      enableColors: true,
      showDirectorInsights: true,
      verbose: true
    });

    const config: ConversationConfig = {
      modelId: 'claude-3-5-haiku-20241022' as ModelId,
      selectedPersonas: ['socrates', 'helpful-assistant'] as PersonaId[],
      maxResponses: 2,
      enableMemory: false
    };

    console.log(colors.yellow('🔧 Initializing adapter...'));
    await adapter.initialize(config);
    console.log(colors.green('✅ Adapter initialized successfully'));

    console.log(colors.yellow('🚀 Testing conversation start...'));
    const startResponse = await adapter.handleRequest({
      type: 'start',
      config,
      message: 'What is wisdom?'
    });
    
    if (startResponse.success) {
      console.log(colors.green('✅ Conversation started successfully'));
      console.log(colors.gray(`   Session ID: ${startResponse.sessionId}`));
    } else {
      console.log(colors.red('❌ Failed to start conversation'));
      return;
    }

    console.log(colors.yellow('💬 Testing conversation continue...'));
    const continueResponse = await adapter.handleRequest({
      type: 'continue',
      sessionId: startResponse.sessionId,
      config,
      message: 'Can you give me a practical example?'
    });

    if (continueResponse.success) {
      console.log(colors.green('✅ Conversation continued successfully'));
      console.log(colors.gray(`   Speaking persona: ${continueResponse.speakingPersona}`));
      if (continueResponse.responseText) {
        console.log(colors.gray(`   Response preview: ${continueResponse.responseText.slice(0, 100)}...`));
      }
    } else {
      console.log(colors.red('❌ Failed to continue conversation'));
    }

    console.log(colors.yellow('🏁 Testing conversation end...'));
    await adapter.handleRequest({
      type: 'end',
      sessionId: startResponse.sessionId,
      config
    });
    console.log(colors.green('✅ Conversation ended successfully'));

    await adapter.cleanup();
    console.log(colors.green('✅ Adapter cleaned up successfully'));

  } catch (error) {
    console.error(colors.red('❌ Test failed:'), error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error(colors.gray(error.stack));
    }
  }
}

/**
 * Test quick start function
 */
async function testQuickStart(): Promise<void> {
  console.log(colors.cyan('\n🧪 Testing Quick Start Function\n'));

  const config: ConversationConfig = {
    modelId: 'claude-3-5-haiku-20241022' as ModelId,
    selectedPersonas: ['mark-twain', 'benjamin-franklin'] as PersonaId[],
    maxResponses: 1,
    enableMemory: false
  };

  const adapterConfig = {
    enableColors: true,
    showDirectorInsights: false,
    verbose: false,
    userPrompt: 'test> ',
    welcomeMessage: colors.cyan('🧪 CLI Test Mode - Type "quit" to exit')
  };

  try {
    console.log(colors.yellow('⚡ Testing quick start (this will start interactive mode)...'));
    console.log(colors.gray('Type "quit" immediately to exit the test'));
    
    // Note: This will start an interactive session
    // In a real test, you might want to mock the readline interface
    await startCLIMastermind(config, adapterConfig);
    
  } catch (error) {
    console.error(colors.red('❌ Quick start test failed:'), error instanceof Error ? error.message : String(error));
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log(colors.cyan('🎭 CLI Adapter Test Suite\n'));

  // Test basic functionality
  await testBasicFunctionality();

  // Ask user if they want to test interactive mode
  const args = process.argv.slice(2);
  if (args.includes('--interactive')) {
    await testQuickStart();
  } else {
    console.log(colors.yellow('\n💡 To test interactive mode, run with --interactive flag'));
  }

  console.log(colors.green('\n🎉 All tests completed!'));
}

/**
 * Show help
 */
function showHelp(): void {
  console.log(colors.cyan(`
🧪 CLI Adapter Test Suite

Usage: npx tsx test-cli.ts [options]

Options:
  --interactive    Test interactive mode (will start CLI session)
  --help, -h       Show this help message

Examples:
  npx tsx test-cli.ts                # Run basic tests only
  npx tsx test-cli.ts --interactive  # Run all tests including interactive mode
`));
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(colors.red('Test suite failed:'), error);
    process.exit(1);
  });
}

export { testBasicFunctionality, testQuickStart, runTests };