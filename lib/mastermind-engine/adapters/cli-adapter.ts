/**
 * CLI Adapter for Mastermind Engine
 * 
 * This adapter provides a command-line interface to the mastermind conversation engine,
 * enabling testing and interaction in terminal environments. It handles user input,
 * conversation flow, and displays responses in a clean, readable format.
 * 
 * Features:
 * - Interactive readline interface
 * - Real-time streaming responses
 * - Director insights and conversation metadata
 * - Graceful error handling and recovery
 * - Clean session management
 * - Support for custom configurations
 */

import * as readline from 'readline';
import {
  ConversationAdapter,
  ConversationConfig,
  ConversationRequest,
  ConversationResponse,
  ConversationStreamHandler,
  ConversationStreamChunk,
  ConversationState,
  MastermindEngineError,
  PersonaId,
} from '../types';
import { MastermindConversationEngine } from '../conversation-engine';
import { CLISessionManager } from './cli-session-manager';
import { CLIMemoryManager } from './cli-memory-manager';
import { PersonaFactory } from '@/lib/personas/persona-factory';

/**
 * Director insight interface for CLI display
 */
interface DirectorInsight {
  rationale?: string;
  goal?: string;
  reasoning?: string;
  significance?: string;
  opportunities?: string[];
  direction?: string;
}

/**
 * Simple color utility for CLI output (replaces chalk dependency)
 */
const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  grey: (text: string) => `\x1b[90m${text}\x1b[0m`
};

/**
 * Configuration specific to the CLI adapter
 */
export interface CLIAdapterConfig {
  /** Enable colored output */
  enableColors: boolean;
  
  /** Show director insights */
  showDirectorInsights: boolean;
  
  /** Show conversation metadata */
  showMetadata: boolean;
  
  /** Enable verbose logging */
  verbose: boolean;
  
  /** Prompt for user input */
  userPrompt: string;
  
  /** Whether to enable memory */
  enableMemory: boolean;
  
  /** Custom welcome message */
  welcomeMessage?: string;
  
  /** Exit commands */
  exitCommands: string[];
  
  /** Help commands */
  helpCommands: string[];
}

/**
 * Default CLI adapter configuration
 */
const DEFAULT_CLI_CONFIG: CLIAdapterConfig = {
  enableColors: true,
  showDirectorInsights: true,
  showMetadata: false,
  verbose: false,
  userPrompt: '> ',
  enableMemory: false,
  exitCommands: ['quit', 'exit', 'q', '/quit', '/exit'],
  helpCommands: ['help', '/help', '?']
};

/**
 * CLI Stream Handler for processing streaming responses
 */
class CLIStreamHandler implements ConversationStreamHandler {
  private currentPersona: PersonaId | null = null;
  private responseBuffer = '';
  private startTime = Date.now();
  
  constructor(
    private config: CLIAdapterConfig,
    private onResponseComplete?: (response: string, persona: PersonaId) => void
  ) {}

  async onChunk(chunk: ConversationStreamChunk): Promise<void> {
    switch (chunk.type) {
      case 'start':
        this.handleStartChunk(chunk);
        break;
        
      case 'chunk':
        this.handleTextChunk(chunk);
        break;
        
      case 'end':
        this.handleEndChunk();
        break;
        
      case 'error':
        this.handleErrorChunk(chunk);
        break;
        
      case 'complete':
        this.handleCompleteChunk(chunk);
        break;
    }
  }

  async onComplete(finalState: ConversationState): Promise<void> {
    if (this.config.showMetadata) {
      this.printMetadata(finalState);
    }
    console.log(colors.gray('\n--- Conversation Complete ---\n'));
  }

  async onError(error: Error): Promise<void> {
    console.error(colors.red('\n❌ Error:'), error.message);
    if (this.config.verbose) {
      console.error(colors.gray(error.stack || 'No stack trace available'));
    }
  }

  private handleStartChunk(chunk: ConversationStreamChunk): void {
    this.currentPersona = chunk.personaId!;
    this.responseBuffer = '';
    this.startTime = Date.now();
    
    const persona = PersonaFactory.getPersonaById(this.currentPersona);
    const personaName = persona?.name || this.currentPersona;
    
    console.log(colors.cyan(`\n🎭 ${personaName}:`));
    
    if (this.config.showDirectorInsights && chunk.directorInsight) {
      this.printDirectorInsights(chunk.directorInsight);
    }
    
    console.log(); // Add space before response
  }

  private handleTextChunk(chunk: ConversationStreamChunk): void {
    if (chunk.chunk) {
      process.stdout.write(chunk.chunk);
      this.responseBuffer += chunk.chunk;
    }
  }

  private handleEndChunk(): void {
    console.log(); // New line after response
    
    if (this.onResponseComplete && this.currentPersona) {
      this.onResponseComplete(this.responseBuffer, this.currentPersona);
    }
    
    if (this.config.showMetadata) {
      const responseTime = Date.now() - this.startTime;
      console.log(colors.gray(`   [${responseTime}ms, ${this.responseBuffer.length} chars]`));
    }
  }

  private handleErrorChunk(chunk: ConversationStreamChunk): void {
    if (chunk.error) {
      console.error(colors.red(`\n❌ Error from ${chunk.personaId}:`), chunk.error.message);
      if (chunk.error.recoverable) {
        console.log(colors.yellow('   Attempting to continue with another persona...'));
      }
    }
  }

  private handleCompleteChunk(chunk: ConversationStreamChunk): void {
    if (chunk.completion) {
      console.log(colors.green(`\n🏁 Conversation completed after ${chunk.completion.totalResponses} responses`));
      console.log(colors.gray(`   Reason: ${chunk.completion.reason}`));
    }
  }

  private printDirectorInsights(insight: DirectorInsight): void {
    console.log(colors.gray('  📋 Director\'s Choice:'));
    console.log(colors.gray(`      Rationale: ${insight?.rationale || 'N/A'}`));
    console.log(colors.gray(`      Goal: ${insight?.goal || 'N/A'}`));
    if (this.config.verbose) {
      console.log(colors.gray(`      Reasoning: ${insight?.reasoning || 'N/A'}`));
      console.log(colors.gray(`      Significance: ${insight?.significance || 'N/A'}`));
      if (insight?.opportunities && insight.opportunities.length > 0) {
        console.log(colors.gray(`      Opportunities: ${insight.opportunities.join(', ')}`));
      }
      console.log(colors.gray(`      Direction: ${insight.direction}`));
    }
  }

  private printMetadata(state: ConversationState): void {
    console.log(colors.gray('\n📊 Conversation Statistics:'));
    console.log(colors.gray(`   Session ID: ${state.sessionId}`));
    console.log(colors.gray(`   Total Messages: ${state.messages.length}`));
    console.log(colors.gray(`   Response Count: ${state.responseCount}`));
    console.log(colors.gray(`   Duration: ${Date.now() - (state.metadata?.startTime || Date.now())}ms`));
    if (state.recentFailedPersonas.length > 0) {
      console.log(colors.gray(`   Failed Personas: ${state.recentFailedPersonas.join(', ')}`));
    }
  }
}

/**
 * Main CLI Adapter class
 */
export class CLIAdapter implements ConversationAdapter {
  private engine: MastermindConversationEngine;
  private sessionManager: CLISessionManager;
  private memoryManager?: CLIMemoryManager;
  private rl: readline.Interface | null = null;
  private currentSession: ConversationState | null = null;
  private config: CLIAdapterConfig;
  private conversationConfig: ConversationConfig | null = null;

  constructor(
    config: Partial<CLIAdapterConfig> = {},
    sessionManager?: CLISessionManager,
    memoryManager?: CLIMemoryManager
  ) {
    this.config = { ...DEFAULT_CLI_CONFIG, ...config };
    this.sessionManager = sessionManager || new CLISessionManager();
    this.memoryManager = memoryManager;
    
    // Initialize the conversation engine with CLI-friendly settings
    this.engine = new MastermindConversationEngine(
      {
        enableLogging: this.config.verbose,
        enableMemory: this.config.enableMemory,
        streamingChunkSize: 1, // Character-by-character for better CLI UX
        streamingDelayMs: 5,    // Faster streaming for CLI
        responseDelayMs: 1000   // Brief pause between responses
      },
      this.sessionManager,
      this.memoryManager
    );
  }

  /**
   * Initialize the CLI adapter
   */
  async initialize(config: ConversationConfig): Promise<void> {
    this.conversationConfig = config;
    
    // Setup readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.config.userPrompt
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', async () => {
      console.log(colors.yellow('\n\n👋 Goodbye!'));
      await this.cleanup();
      process.exit(0);
    });

    console.log(this.getWelcomeMessage(config));
  }

  /**
   * Start an interactive CLI session
   */
  async startInteractiveSession(): Promise<void> {
    if (!this.rl || !this.conversationConfig) {
      throw new Error('CLI adapter not properly initialized');
    }

    // Start conversation
    this.currentSession = await this.engine.startConversation(this.conversationConfig);
    console.log(colors.green('✅ Conversation started!'));
    console.log(colors.gray(`   Session ID: ${this.currentSession.sessionId}`));
    console.log(colors.gray(`   Selected Personas: ${this.conversationConfig.selectedPersonas.join(', ')}`));
    console.log();

    // Start input loop
    this.rl.prompt();
    
    this.rl.on('line', async (input) => {
      const trimmedInput = input.trim();
      
      if (this.isExitCommand(trimmedInput)) {
        await this.handleExit();
        return;
      }
      
      if (this.isHelpCommand(trimmedInput)) {
        this.showHelp();
        this.rl!.prompt();
        return;
      }
      
      if (!trimmedInput) {
        this.rl!.prompt();
        return;
      }
      
      await this.handleUserInput(trimmedInput);
    });
  }

  /**
   * Handle a single conversation request (non-interactive)
   */
  async handleRequest(request: ConversationRequest): Promise<ConversationResponse> {
    if (request.type === 'start') {
      this.currentSession = await this.engine.startConversation(request.config, request.message);
      
      if (request.message) {
        return await this.engine.generateNextResponse(this.currentSession.sessionId);
      }
      
      return {
        sessionId: this.currentSession.sessionId,
        success: true,
        shouldContinue: true,
        metadata: {
          attempts: 0,
          responseTime: 0,
          wasFallback: false
        },
        conversationState: this.currentSession
      };
    }
    
    if (request.type === 'continue' && request.sessionId && request.message) {
      await this.engine.addUserMessage(request.sessionId, request.message);
      return await this.engine.generateNextResponse(request.sessionId);
    }
    
    if (request.type === 'end' && request.sessionId) {
      await this.engine.endConversation(request.sessionId);
      const state = await this.engine.getConversationState(request.sessionId);
      
      return {
        sessionId: request.sessionId,
        success: true,
        shouldContinue: false,
        metadata: {
          attempts: 0,
          responseTime: 0,
          wasFallback: false,
          endReason: 'User requested end'
        },
        conversationState: state!
      };
    }
    
    throw new MastermindEngineError('Invalid request type or missing parameters', 'INVALID_REQUEST');
  }

  /**
   * Handle streaming conversation request
   */
  async handleStreamingRequest(
    request: ConversationRequest,
    handler: ConversationStreamHandler
  ): Promise<void> {
    if (request.type === 'start') {
      this.currentSession = await this.engine.startConversation(request.config, request.message);
      
      if (request.message) {
        await this.engine.generateStreamingResponse(this.currentSession.sessionId, handler);
      }
      return;
    }
    
    if (request.type === 'continue' && request.sessionId && request.message) {
      await this.engine.addUserMessage(request.sessionId, request.message);
      await this.engine.generateStreamingResponse(request.sessionId, handler);
      return;
    }
    
    throw new MastermindEngineError('Invalid streaming request', 'INVALID_STREAMING_REQUEST');
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
    
    if (this.currentSession) {
      await this.engine.endConversation(this.currentSession.sessionId, 'CLI session ended');
    }
    
    await this.engine.cleanup();
  }

  // === PRIVATE HELPER METHODS ===

  private async handleUserInput(input: string): Promise<void> {
    if (!this.currentSession) {
      console.error(colors.red('❌ No active conversation session'));
      this.rl!.prompt();
      return;
    }

    try {
      console.log(colors.blue(`\n👤 You: ${input}`));
      
      // Add user message
      await this.engine.addUserMessage(this.currentSession.sessionId, input);
      
      // Create stream handler
      const streamHandler = new CLIStreamHandler(this.config);
      
      // Generate streaming response
      await this.engine.generateStreamingResponse(this.currentSession.sessionId, streamHandler);
      
      console.log(); // Add space before next prompt
      this.rl!.prompt();
      
    } catch (error) {
      console.error(colors.red('❌ Error processing input:'), error instanceof Error ? error.message : String(error));
      
      if (this.config.verbose && error instanceof Error) {
        console.error(colors.gray(error.stack || 'No stack trace available'));
      }
      
      this.rl!.prompt();
    }
  }

  private async handleExit(): Promise<void> {
    console.log(colors.yellow('\n👋 Ending conversation...'));
    
    if (this.currentSession) {
      const finalState = await this.engine.getConversationState(this.currentSession.sessionId);
      if (finalState && this.config.showMetadata) {
        console.log(colors.gray('\n📊 Final Statistics:'));
        console.log(colors.gray(`   Total Messages: ${finalState.messages.length}`));
        console.log(colors.gray(`   Responses Generated: ${finalState.responseCount}`));
        console.log(colors.gray(`   Session Duration: ${Date.now() - (finalState.metadata?.startTime || Date.now())}ms`));
      }
    }
    
    await this.cleanup();
    console.log(colors.green('Goodbye! 👋'));
    process.exit(0);
  }

  private showHelp(): void {
    console.log(colors.cyan('\n📖 CLI Mastermind Help:'));
    console.log(colors.gray('   Commands:'));
    console.log(colors.gray(`     ${this.config.helpCommands.join(', ')} - Show this help`));
    console.log(colors.gray(`     ${this.config.exitCommands.join(', ')} - Exit the conversation`));
    console.log(colors.gray('   Usage:'));
    console.log(colors.gray('     Type your message and press Enter to engage with the personas'));
    console.log(colors.gray('     The director will choose which persona responds based on context'));
    if (this.conversationConfig) {
      console.log(colors.gray('   Active Personas:'));
      this.conversationConfig.selectedPersonas.forEach(id => {
        const persona = PersonaFactory.getPersonaById(id);
        console.log(colors.gray(`     • ${persona?.name || id}`));
      });
    }
    console.log();
  }

  private isExitCommand(input: string): boolean {
    return this.config.exitCommands.includes(input.toLowerCase());
  }

  private isHelpCommand(input: string): boolean {
    return this.config.helpCommands.includes(input.toLowerCase());
  }

  private getWelcomeMessage(config: ConversationConfig): string {
    if (this.config.welcomeMessage) {
      return this.config.welcomeMessage;
    }

    const personas = config.selectedPersonas
      .map(id => PersonaFactory.getPersonaById(id)?.name || id)
      .join(', ');

    return colors.green(`
🎭 Welcome to Mastermind CLI!

Configuration:
  Model: ${config.modelId}
  Max Responses: ${config.maxResponses || 10}
  Personas: ${personas}

Type your message to start the conversation.
Type 'help' for commands or 'quit' to exit.
`);
  }
}

/**
 * Factory function for creating CLI adapters
 */
export function createCLIAdapter(
  config?: Partial<CLIAdapterConfig>,
  sessionManager?: CLISessionManager,
  memoryManager?: CLIMemoryManager
): CLIAdapter {
  return new CLIAdapter(config, sessionManager, memoryManager);
}

/**
 * Quick start function for CLI mastermind sessions
 */
export async function startCLIMastermind(
  conversationConfig: ConversationConfig,
  adapterConfig?: Partial<CLIAdapterConfig>
): Promise<void> {
  const adapter = createCLIAdapter(adapterConfig);
  
  try {
    await adapter.initialize(conversationConfig);
    await adapter.startInteractiveSession();
  } catch (error) {
    console.error(colors.red('Failed to start CLI Mastermind:'), error);
    await adapter.cleanup();
    process.exit(1);
  }
}