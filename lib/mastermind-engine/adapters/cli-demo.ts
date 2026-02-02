#!/usr/bin/env node

/**
 * CLI Demo Script for Mastermind Engine
 * 
 * This script demonstrates how to use the CLI adapter to create interactive
 * mastermind conversations in terminal environments. It provides a complete
 * example of setting up and running conversations with various personas.
 * 
 * Usage:
 *   npx tsx lib/mastermind-engine/adapters/cli-demo.ts
 *   node lib/mastermind-engine/adapters/cli-demo.js
 * 
 * Features:
 * - Interactive persona selection
 * - Configurable conversation settings
 * - Real-time streaming responses
 * - Director insights display
 * - Session persistence options
 */

import { startCLIMastermind } from './cli-adapter';
import { createCLISessionManager } from './cli-session-manager';
import { createCLIMemoryManager } from './cli-memory-manager';
import { ConversationConfig, PersonaId, ModelId } from '../types';
import { PersonaFactory } from '@/lib/personas/persona-factory';
import * as readline from 'readline';

/**
 * Simple color utility for CLI output
 */
const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`
};

/**
 * Available persona presets for quick selection
 */
const PERSONA_PRESETS = {
  default: ['cs-lewis', 'chris-hedges', 'dostoevsky', 'george-orwell'] as PersonaId[],
  philosophers: ['socrates', 'aristotle', 'plato', 'nietzsche', 'kierkegaard'] as PersonaId[],
  writers: ['mark-twain', 'george-orwell', 'jorge-luis-borges', 'philip-k-dick', 'octavia-butler'] as PersonaId[],
  critics: ['cs-lewis', 'chris-hedges', 'dostoevsky', 'george-orwell'] as PersonaId[],
  scientists: ['albert-einstein', 'nikola-tesla', 'carl-sagan', 'marie-curie', 'darwin'] as PersonaId[],
  mystics: ['alan-watts', 'terence-mckenna', 'rumi', 'buddha', 'laozi'] as PersonaId[],
  innovators: ['leonardo-da-vinci', 'benjamin-franklin', 'isaac-asimov', 'frank-herbert', 'william-gibson'] as PersonaId[],
  classic: ['socrates', 'friedrich-nietzsche', 'alan-watts', 'albert-einstein', 'mark-twain'] as PersonaId[]
};

/**
 * Available model options
 */
const MODEL_OPTIONS: ModelId[] = [
  'claude-sonnet-4-20250514',
  'claude-3-5-haiku-20241022',
  'claude-3-5-sonnet-20240620',
  'gpt-4o-mini',
  'gpt-4.5-preview'
];

/**
 * Interactive setup for conversation configuration
 */
async function setupConversation(): Promise<ConversationConfig> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (question: string): Promise<string> => {
    return new Promise(resolve => {
      rl.question(question, resolve);
    });
  };

  try {
    console.log(colors.cyan('🎭 Welcome to Mastermind CLI Demo!'));
    console.log(colors.gray('Let\'s configure your conversation...\n'));

    // Model selection
    console.log(colors.yellow('Available models:'));
    MODEL_OPTIONS.forEach((model, index) => {
      console.log(colors.gray(`  ${index + 1}. ${model}`));
    });
    
    const modelChoice = await ask('\nSelect model (1-4, default: 1): ');
    const modelIndex = parseInt(modelChoice) - 1;
    const selectedModel = MODEL_OPTIONS[modelIndex] || MODEL_OPTIONS[0];

    // Persona selection
    console.log(colors.yellow('\nPersona presets:'));
    Object.entries(PERSONA_PRESETS).forEach(([name, personas], index) => {
      console.log(colors.gray(`  ${index + 1}. ${name} (${personas.slice(0, 3).join(', ')}...)`));
    });

    const presetChoice = await ask('\nSelect preset (1-6, default: 6): ');
    const presetIndex = parseInt(presetChoice) - 1;
    const presetKeys = Object.keys(PERSONA_PRESETS);
    const selectedPreset = presetKeys[presetIndex] || 'default';
    const selectedPersonas = PERSONA_PRESETS[selectedPreset as keyof typeof PERSONA_PRESETS];

    // Max responses
    const maxResponsesInput = await ask('\nMax responses (default: 10): ');
    const maxResponses = parseInt(maxResponsesInput) || 10;

    // Memory option
    const enableMemoryInput = await ask('\nEnable memory? (y/N): ');
    const enableMemory = enableMemoryInput.toLowerCase().startsWith('y');

    // Session persistence
    const enablePersistenceInput = await ask('\nEnable session persistence? (y/N): ');
    const enablePersistence = enablePersistenceInput.toLowerCase().startsWith('y');

    rl.close();

    console.log(colors.green('\n✅ Configuration complete!'));
    console.log(colors.gray(`   Model: ${selectedModel}`));
    console.log(colors.gray(`   Personas: ${selectedPersonas.join(', ')}`));
    console.log(colors.gray(`   Max responses: ${maxResponses}`));
    console.log(colors.gray(`   Memory: ${enableMemory ? 'enabled' : 'disabled'}`));
    console.log(colors.gray(`   Persistence: ${enablePersistence ? 'enabled' : 'disabled'}`));

    return {
      modelId: selectedModel,
      selectedPersonas,
      maxResponses,
      enableMemory,
      sessionConfig: {
        sessionId: `cli_demo_${Date.now()}`,
        timeout: 3600000 // 1 hour
      }
    };

  } catch (error) {
    rl.close();
    throw error;
  }
}

/**
 * Quick start with default configuration
 */
function getDefaultConfig(): ConversationConfig {
  return {
    modelId: 'claude-sonnet-4-20250514',
    selectedPersonas: PERSONA_PRESETS.default,
    maxResponses: 10,
    enableMemory: false,
    sessionConfig: {
      sessionId: `cli_demo_${Date.now()}`,
      timeout: 3600000
    }
  };
}

/**
 * Main demo function
 */
async function runDemo(): Promise<void> {
  console.log(colors.magenta('🎭 Mastermind CLI Demo\n'));

  try {
    // Check if we should use interactive setup
    const args = process.argv.slice(2);
    const useInteractive = !args.includes('--quick') && !args.includes('-q');
    
    let config: ConversationConfig;
    
    if (useInteractive) {
      config = await setupConversation();
    } else {
      console.log(colors.yellow('Using default configuration...'));
      config = getDefaultConfig();
    }

    // Create optional managers if needed
    if (args.includes('--persist')) {
      createCLISessionManager({
        enablePersistence: true,
        verbose: args.includes('--verbose')
      });
    }
    
    if (config.enableMemory) {
      createCLIMemoryManager({
        verbose: args.includes('--verbose')
      });
    }

    // Configure CLI adapter
    const adapterConfig = {
      enableColors: !args.includes('--no-color'),
      showDirectorInsights: !args.includes('--no-insights'),
      showMetadata: args.includes('--metadata'),
      verbose: args.includes('--verbose'),
      enableMemory: config.enableMemory || false,
      welcomeMessage: `
${colors.green('🎭 Mastermind CLI Demo')}

${colors.cyan('Configuration:')}
  Model: ${config.modelId}
  Personas: ${config.selectedPersonas.map(id => {
    const persona = PersonaFactory.getPersonaById(id);
    return persona?.name || id;
  }).join(', ')}
  Max Responses: ${config.maxResponses}
  Memory: ${config.enableMemory ? 'enabled' : 'disabled'}

${colors.yellow('Getting started:')}
  • Type your message to start the conversation
  • The director will choose which persona responds
  • Type 'help' for commands or 'quit' to exit
  • Use Ctrl+C for immediate exit

${colors.gray('Tip: Try asking philosophical questions or discussing complex topics!')}
`
    };

    // Start the CLI mastermind session
    await startCLIMastermind(config, adapterConfig);

  } catch (error) {
    console.error(colors.red('\n❌ Demo failed:'), error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error(colors.gray('\nStack trace:'));
      console.error(colors.gray(error.stack));
    }
    
    process.exit(1);
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(colors.cyan(`
🎭 Mastermind CLI Demo

Usage: npx tsx cli-demo.ts [options]

Options:
  --quick, -q          Skip interactive setup, use defaults
  --persist           Enable session persistence to disk
  --verbose           Enable verbose logging
  --no-color          Disable colored output
  --no-insights       Hide director insights
  --metadata          Show conversation metadata
  --help, -h          Show this help message

Examples:
  npx tsx cli-demo.ts                    # Interactive setup
  npx tsx cli-demo.ts --quick            # Quick start with defaults
  npx tsx cli-demo.ts --persist --verbose # Persistent sessions with logging
  npx tsx cli-demo.ts --quick --no-color # Quick start, no colors

Available Persona Presets:
${Object.entries(PERSONA_PRESETS).map(([name, personas]) => 
  `  • ${name}: ${personas.slice(0, 3).join(', ')}${personas.length > 3 ? '...' : ''}`
).join('\n')}

Available Models:
${MODEL_OPTIONS.map(model => `  • ${model}`).join('\n')}
`));
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error(colors.red('Unhandled error:'), error);
    process.exit(1);
  });
}

export { runDemo, setupConversation, getDefaultConfig };