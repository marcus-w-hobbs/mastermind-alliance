/**
 * Mastermind Engine - Server-only exports
 * 
 * This file provides server-compatible exports only, avoiding Node.js-specific
 * modules that cause issues in Edge runtime environments.
 */

// Core engine exports (server-compatible)
export { MastermindConversationEngine } from './conversation-engine';
export { ConversationDirector } from './director';
export { PersonaManager } from './persona-manager';

// Server-only adapter exports
export { MastermindServerAdapter } from './adapters/server-adapter';
export { ServerSessionManager, getServerSessionManager } from './adapters/server-session-manager';
export { ServerMemoryManager, createServerMemoryManager } from './adapters/server-memory-manager';

// Essential types for server use
export type {
  ConversationEngine,
  ConversationConfig,
  ConversationState,
  ConversationResponse,
  SessionManager,
  MemoryManager,
  DirectorContext,
  DirectorDecision,
  MastermindMessage,
  PersonaId,
  ModelId
} from './types';