/**
 * Mastermind Engine - Main exports
 * 
 * This is the main entry point for the Mastermind Engine, providing clean exports
 * of all the core components and utilities needed to build mastermind conversations.
 * 
 * The engine is designed to be environment-agnostic and can be used in:
 * - Web applications (Next.js, Express, etc.)
 * - CLI applications 
 * - API services
 * - Standalone scripts
 * 
 * Key Components:
 * - ConversationEngine: Main orchestration engine
 * - ConversationDirector: Strategic decision-making for persona selection
 * - PersonaManager: Handles persona response generation and context management
 * - Types: Comprehensive type definitions for all components
 */

// === CORE ENGINE EXPORTS ===

// Main conversation engine
export {
  MastermindConversationEngine,
  createMastermindEngine,
  defaultMastermindEngine,
  type MastermindEngineConfig
} from './conversation-engine';

// Director for strategic conversation management
export {
  ConversationDirector,
  createConversationDirector,
  createDirectorContext,
  type DirectorConfig
} from './director';

// Persona management and response generation
export {
  PersonaManager,
  createPersonaManager,
  createVerbosePersonaManager,
  defaultPersonaManager,
  type PersonaResponseResult,
  type RoundtableContext,
  type MessageHistoryConfig
} from './persona-manager';

// === TYPE EXPORTS ===

// Core interfaces
export type {
  ConversationEngine,
  ConversationConfig,
  ConversationState,
  ConversationResponse,
  ConversationStreamChunk,
  ConversationStreamHandler,
  ConversationRequest,
  ConversationAdapter
} from './types';

// Session and memory management
export type {
  SessionManager,
  MemoryManager,
  PersonaResponseConfig
} from './types';

// Director and decision-making types
export type {
  DirectorContext,
  DirectorDecision,
  PersonaDirectorProfile
} from './types';

// Message and persona types
export type {
  MastermindMessage,
  PersonaId,
  ModelId,
  Mem0Message
} from './types';

// Error types
export {
  MastermindEngineError,
  SessionNotFoundError,
  PersonaNotFoundError,
  ResponseGenerationError,
  DirectorDecisionError
} from './types';

// Event types
export type {
  ConversationEvent,
  ConversationEventHandler,
  MastermindEngineConfig as EngineConfig,
  MastermindEngineFactory
} from './types';

// Utility types
export type {
  PartialConversationState
} from './types';

// === UTILITY FUNCTIONS ===

// Import types for utility functions
import type { 
  ModelId, 
  PersonaId, 
  ConversationConfig, 
  ConversationState, 
  MastermindMessage,
  ConversationStreamChunk,
  ConversationStreamHandler
} from './types';

/**
 * Create a basic conversation configuration with sensible defaults
 */
export function createBasicConfig(
  modelId: ModelId,
  selectedPersonas: PersonaId[],
  options: {
    maxResponses?: number;
    enableMemory?: boolean;
    userMemoryId?: string;
  } = {}
): ConversationConfig {
  return {
    modelId,
    selectedPersonas,
    maxResponses: options.maxResponses || 10,
    enableMemory: options.enableMemory || false,
    userMemoryId: options.userMemoryId,
    sessionConfig: {
      timeout: 3600000 // 1 hour
    }
  };
}

/**
 * Create a streaming handler with common logging and error handling
 */
export function createLoggingStreamHandler(
  onChunkCallback?: (chunk: ConversationStreamChunk) => Promise<void>,
  onCompleteCallback?: (state: ConversationState) => Promise<void>,
  onErrorCallback?: (error: Error) => Promise<void>
): ConversationStreamHandler {
  return {
    async onChunk(chunk: ConversationStreamChunk): Promise<void> {
      console.log(`📤 Stream chunk: ${chunk.type}`, {
        sessionId: chunk.sessionId,
        personaId: chunk.personaId,
        timestamp: new Date(chunk.timestamp).toISOString()
      });
      
      if (onChunkCallback) {
        await onChunkCallback(chunk);
      }
    },

    async onComplete(finalState: ConversationState): Promise<void> {
      console.log('🏁 Conversation completed:', {
        sessionId: finalState.sessionId,
        responseCount: finalState.responseCount,
        duration: Date.now() - (finalState.metadata?.startTime || 0)
      });
      
      if (onCompleteCallback) {
        await onCompleteCallback(finalState);
      }
    },

    async onError(error: Error): Promise<void> {
      console.error('❌ Conversation error:', error.message);
      
      if (onErrorCallback) {
        await onErrorCallback(error);
      }
    }
  };
}

/**
 * Validate a conversation configuration
 */
export function validateConversationConfig(config: ConversationConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.modelId) {
    errors.push('modelId is required');
  }

  if (!config.selectedPersonas || config.selectedPersonas.length === 0) {
    errors.push('At least one persona must be selected');
  }

  if (config.maxResponses && config.maxResponses < 1) {
    errors.push('maxResponses must be greater than 0');
  }

  if (config.enableMemory && !config.userMemoryId) {
    errors.push('userMemoryId is required when memory is enabled');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate conversation statistics from a conversation state
 */
export function calculateConversationStats(state: ConversationState): {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageResponseLength: number;
  participationByPersona: Record<string, number>;
  conversationDuration: number;
  responseRate: number; // responses per minute
} {
  const totalMessages = state.messages.length;
  const userMessages = state.messages.filter(m => m.role === 'user').length;
  const assistantMessages = state.messages.filter(m => m.role === 'assistant').length;
  
  const participationByPersona: Record<string, number> = {};
  let totalResponseLength = 0;
  
  state.messages.forEach(msg => {
    if (msg.role === 'assistant' && msg.personaId) {
      participationByPersona[msg.personaId] = (participationByPersona[msg.personaId] || 0) + 1;
      totalResponseLength += msg.content.length;
    }
  });
  
  const averageResponseLength = assistantMessages > 0 ? totalResponseLength / assistantMessages : 0;
  const conversationDuration = Date.now() - (state.metadata?.startTime || Date.now());
  const responseRate = assistantMessages / (conversationDuration / 60000); // per minute
  
  return {
    totalMessages,
    userMessages,
    assistantMessages,
    averageResponseLength,
    participationByPersona,
    conversationDuration,
    responseRate
  };
}

/**
 * Get the last N messages from a conversation
 */
export function getRecentMessages(
  state: ConversationState, 
  count: number = 5
): MastermindMessage[] {
  return state.messages.slice(-count);
}

/**
 * Get messages from a specific persona
 */
export function getMessagesFromPersona(
  state: ConversationState,
  personaId: PersonaId
): MastermindMessage[] {
  return state.messages.filter(msg => msg.personaId === personaId);
}

/**
 * Check if a conversation is healthy (no consecutive failures, balanced participation)
 */
export function assessConversationHealth(state: ConversationState): {
  isHealthy: boolean;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for consecutive failures
  if (state.consecutiveFailures >= 2) {
    issues.push('Multiple consecutive response failures detected');
    recommendations.push('Consider adjusting model parameters or persona selection');
  }

  // Check for too many failed personas
  if (state.recentFailedPersonas.length > state.config.selectedPersonas.length / 2) {
    issues.push('High percentage of personas failing to respond');
    recommendations.push('Review persona configurations and model compatibility');
  }

  // Check for conversation stagnation
  const recentActivity = Date.now() - state.lastActivity;
  if (recentActivity > 600000 && state.isActive) { // 10 minutes
    issues.push('Conversation has been inactive for an extended period');
    recommendations.push('Consider ending the conversation or prompting for new input');
  }

  return {
    isHealthy: issues.length === 0,
    issues,
    recommendations
  };
}

// === ADAPTER EXPORTS ===

// Note: CLI adapters are excluded from main exports to avoid Node.js dependencies in Edge runtime
// Import CLI adapters directly from './adapters' when needed in CLI environments

// === RE-EXPORTS FOR CONVENIENCE ===

// Re-export commonly used external types
export type { Persona } from '@/lib/personas/persona';
export { PersonaFactory } from '@/lib/personas/persona-factory';
export { generateMastermindMessageId } from '@/types/mastermind-message';