/**
 * Server-only exports for Mastermind Engine Adapters
 * 
 * This module provides only the server-compatible adapters for Next.js integration.
 * CLI-specific modules are excluded to avoid Node.js compatibility issues in Edge runtime.
 */

// Server Adapter exports
export {
  MastermindServerAdapter
} from './server-adapter';

// Server Session Manager exports
export {
  ServerSessionManager,
  getServerSessionManager,
  resetServerSessionManager
} from './server-session-manager';

// Server Memory Manager exports
export {
  ServerMemoryManager,
  createServerMemoryManager,
  getProductionMemoryManager
} from './server-memory-manager';

// Re-export server-compatible types
export type {
  SessionManager,
  MemoryManager,
  ConversationConfig,
  ConversationState,
  ConversationResponse
} from '../types';