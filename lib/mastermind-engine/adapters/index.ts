/**
 * Mastermind Engine Adapters
 * 
 * This module provides adapters for different deployment environments,
 * enabling the mastermind engine to run in various contexts like CLI,
 * web applications, APIs, and other environments.
 * 
 * Available Adapters:
 * - CLIAdapter: Command-line interface adapter for terminal environments
 * - CLISessionManager: Enhanced session management for CLI environments
 * - CLIMemoryManager: File-based memory management for CLI environments
 * - MastermindServerAdapter: Next.js server integration adapter
 * - ServerSessionManager: In-memory session management for web applications
 * - ServerMemoryManager: Mem0 integration for persistent memory
 */

// CLI Adapter exports
export {
  CLIAdapter,
  createCLIAdapter,
  startCLIMastermind
} from './cli-adapter';
export type { CLIAdapterConfig } from './cli-adapter';

// CLI Session Manager exports
export {
  CLISessionManager,
  createCLISessionManager
} from './cli-session-manager';
export type { CLISessionManagerConfig } from './cli-session-manager';

// CLI Memory Manager exports
export {
  CLIMemoryManager,
  createCLIMemoryManager
} from './cli-memory-manager';
export type { CLIMemoryManagerConfig } from './cli-memory-manager';

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

// Re-export common types for convenience
export type {
  ConversationAdapter,
  ConversationRequest,
  ConversationResponse,
  ConversationStreamHandler,
  ConversationStreamChunk,
  SessionManager,
  MemoryManager
} from '../types';