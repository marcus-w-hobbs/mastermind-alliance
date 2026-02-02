/**
 * Shared type definitions for the Mastermind Engine
 * 
 * This file contains all the core types needed for the mastermind conversation engine,
 * organizing types from across the codebase into a clean, reusable foundation.
 */

// Re-export types from existing modules
export type { ModelId } from '@/lib/models';
export type { PersonaId, PersonaMetadata } from '@/lib/personas/personas-registry';
export type { MastermindMessage } from '@/types/mastermind-message';
export type { DirectorDecision, PersonaDirectorProfile } from '@/types/persona-director-profile';
export type { Mem0Message } from '@/types/mem0-types';

// Import necessary types for use in our new interfaces
import type { ModelId } from '@/lib/models';
import type { PersonaId } from '@/lib/personas/personas-registry';
import type { MastermindMessage } from '@/types/mastermind-message';
import type { DirectorDecision } from '@/types/persona-director-profile';
import type { Persona } from '@/lib/personas/persona';

/**
 * Configuration for a mastermind conversation
 */
export interface ConversationConfig {
  /** The language model to use for responses */
  modelId: ModelId;
  
  /** Array of persona IDs participating in the conversation */
  selectedPersonas: PersonaId[];
  
  /** Maximum number of responses before conversation ends */
  maxResponses?: number;
  
  /** Model to use for director decisions */
  directorModelId?: ModelId;
  
  /** Whether to enable memory (Mem0) integration */
  enableMemory?: boolean;
  
  /** User-specific memory ID for Mem0 */
  userMemoryId?: string;
  
  /** Session-specific configuration */
  sessionConfig?: {
    /** Unique session identifier */
    sessionId?: string;
    
    /** Session timeout in milliseconds */
    timeout?: number;
  };
}

/**
 * Current state of a conversation
 */
export interface ConversationState {
  /** Unique session identifier */
  sessionId: string;
  
  /** All messages in the conversation (from user perspective) */
  messages: MastermindMessage[];
  
  /** Configuration used for this conversation */
  config: ConversationConfig;
  
  /** Current response count */
  responseCount: number;
  
  /** Timestamp of last activity */
  lastActivity: number;
  
  /** Personas that have recently failed to generate responses */
  recentFailedPersonas: PersonaId[];
  
  /** ID of the last persona to successfully speak */
  lastSuccessfulSpeakerId?: PersonaId;
  
  /** Number of consecutive failures across all personas */
  consecutiveFailures: number;
  
  /** Whether the conversation is currently active */
  isActive: boolean;
  
  /** Optional metadata for tracking conversation state */
  metadata?: {
    startTime: number;
    totalTokensUsed?: number;
    averageResponseTime?: number;
    [key: string]: unknown;
  };
}

/**
 * Context provided to the director for decision making
 */
export interface DirectorContext {
  /** Current conversation state */
  conversationState: ConversationState;
  
  /** Available personas for selection */
  availablePersonas: Persona[];
  
  /** Recent conversation history (limited for performance) */
  recentMessages: MastermindMessage[];
  
  /** Current response count */
  responseCount: number;
  
  /** Personas that have recently failed */
  recentFailedPersonas: PersonaId[];
  
  /** Last successful speaker */
  lastSpeakerId?: PersonaId;
  
  /** Speaker frequency statistics */
  speakerStats: Map<PersonaId, number>;
  
  /** Recent speakers (last few responses) */
  recentSpeakers: PersonaId[];
}

/**
 * Core conversation engine interface
 */
export interface ConversationEngine {
  /**
   * Start a new conversation or continue an existing one
   */
  startConversation(config: ConversationConfig, initialMessage?: string): Promise<ConversationState>;
  
  /**
   * Add a user message to the conversation
   */
  addUserMessage(sessionId: string, message: string): Promise<ConversationState>;
  
  /**
   * Generate the next response in the conversation
   */
  generateNextResponse(sessionId: string): Promise<ConversationResponse>;
  
  /**
   * Get the current state of a conversation
   */
  getConversationState(sessionId: string): Promise<ConversationState | null>;
  
  /**
   * End a conversation
   */
  endConversation(sessionId: string, reason?: string): Promise<void>;
  
  /**
   * Clean up old/inactive conversations
   */
  cleanup(): Promise<void>;
}

/**
 * Response from generating a conversation turn
 */
export interface ConversationResponse {
  /** Session identifier */
  sessionId: string;
  
  /** Whether the response was successful */
  success: boolean;
  
  /** The persona that responded (if successful) */
  speakingPersona?: PersonaId;
  
  /** The generated response text (if successful) */
  responseText?: string;
  
  /** Director's decision that led to this response */
  directorDecision?: DirectorDecision;
  
  /** Whether the conversation should continue */
  shouldContinue: boolean;
  
  /** Response metadata */
  metadata: {
    /** Number of attempts made to generate this response */
    attempts: number;
    
    /** Time taken to generate response (ms) */
    responseTime: number;
    
    /** Whether this persona was selected as a fallback */
    wasFallback: boolean;
    
    /** Reason for ending if shouldContinue is false */
    endReason?: string;
    
    /** Any error that occurred */
    error?: string;
    
    /** Whether the error is recoverable */
    recoverable?: boolean;
  };
  
  /** Updated conversation state */
  conversationState: ConversationState;
}

/**
 * Streaming response chunk from the conversation engine
 */
export interface ConversationStreamChunk {
  /** Type of stream event */
  type: 'start' | 'chunk' | 'end' | 'error' | 'complete';
  
  /** Session identifier */
  sessionId: string;
  
  /** Persona currently speaking (for start/chunk/end events) */
  personaId?: PersonaId;
  
  /** Text chunk (for chunk events) */
  chunk?: string;
  
  /** Whether this persona is done speaking (for end events) */
  done?: boolean;
  
  /** Director insights (for start events) */
  directorInsight?: {
    rationale: string;
    goal: string;
    reasoning: string;
    significance: string;
    opportunities: string[];
    direction: string;
  };
  
  /** Error information (for error events) */
  error?: {
    message: string;
    recoverable: boolean;
    personaId?: PersonaId;
  };
  
  /** Completion information (for complete events) */
  completion?: {
    totalResponses: number;
    reason: string;
    completed: boolean;
  };
  
  /** Timestamp of this chunk */
  timestamp: number;
  
  /** Additional metadata */
  metadata?: {
    contentLength?: number;
    finalContent?: string;
    [key: string]: unknown;
  };
}

/**
 * Interface for streaming conversation responses
 */
export interface ConversationStreamHandler {
  /**
   * Handle a stream chunk
   */
  onChunk(chunk: ConversationStreamChunk): Promise<void>;
  
  /**
   * Handle stream completion
   */
  onComplete(finalState: ConversationState): Promise<void>;
  
  /**
   * Handle stream error
   */
  onError(error: Error): Promise<void>;
}

/**
 * Configuration for persona response generation
 */
export interface PersonaResponseConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  
  /** Minimum response length in characters */
  minResponseLength?: number;
  
  /** Temperature for response generation */
  temperature?: number;
  
  /** Maximum tokens for response */
  maxTokens?: number;
  
  /** Whether to enable exponential backoff on retries */
  useExponentialBackoff?: boolean;
}

/**
 * Session management interface
 */
export interface SessionManager {
  /**
   * Create a new session
   */
  createSession(config: ConversationConfig): Promise<ConversationState>;
  
  /**
   * Get an existing session
   */
  getSession(sessionId: string): Promise<ConversationState | null>;
  
  /**
   * Update session state
   */
  updateSession(sessionId: string, state: Partial<ConversationState>): Promise<ConversationState>;
  
  /**
   * Delete a session
   */
  deleteSession(sessionId: string): Promise<void>;
  
  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): Promise<number>;
  
  /**
   * Get all active sessions
   */
  getActiveSessions(): Promise<ConversationState[]>;
}

/**
 * Memory integration interface
 */
export interface MemoryManager {
  /**
   * Add a message to memory
   */
  addToMemory(userId: string, message: string): Promise<boolean>;
  
  /**
   * Search memories for relevant context
   */
  searchMemories(userId: string, query: string, limit?: number): Promise<string | null>;
  
  /**
   * Get user memory ID
   */
  getUserMemoryId(): Promise<string | null>;
}

/**
 * Adapter interface for different deployment environments
 */
export interface ConversationAdapter {
  /**
   * Initialize the adapter
   */
  initialize(config: ConversationConfig): Promise<void>;
  
  /**
   * Handle a conversation request
   */
  handleRequest(request: ConversationRequest): Promise<ConversationResponse>;
  
  /**
   * Handle streaming conversation request
   */
  handleStreamingRequest(request: ConversationRequest, handler: ConversationStreamHandler): Promise<void>;
  
  /**
   * Clean up resources
   */
  cleanup(): Promise<void>;
}

/**
 * Generic conversation request
 */
export interface ConversationRequest {
  /** Session ID (if continuing existing conversation) */
  sessionId?: string;
  
  /** User message */
  message?: string;
  
  /** Conversation configuration */
  config: ConversationConfig;
  
  /** Request type */
  type: 'start' | 'continue' | 'end';
  
  /** Additional request metadata */
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    timestamp?: number;
    [key: string]: unknown;
  };
}

/**
 * Error types for the mastermind engine
 */
export class MastermindEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = false,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MastermindEngineError';
  }
}

/**
 * Specific error types
 */
export class SessionNotFoundError extends MastermindEngineError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, 'SESSION_NOT_FOUND', false, { sessionId });
  }
}

export class PersonaNotFoundError extends MastermindEngineError {
  constructor(personaId: PersonaId) {
    super(`Persona not found: ${personaId}`, 'PERSONA_NOT_FOUND', false, { personaId });
  }
}

export class ResponseGenerationError extends MastermindEngineError {
  constructor(personaId: PersonaId, attempts: number) {
    super(
      `Failed to generate response for ${personaId} after ${attempts} attempts`,
      'RESPONSE_GENERATION_FAILED',
      true,
      { personaId, attempts }
    );
  }
}

export class DirectorDecisionError extends MastermindEngineError {
  constructor(reason: string) {
    super(`Director decision failed: ${reason}`, 'DIRECTOR_DECISION_FAILED', true, { reason });
  }
}

/**
 * Utility type for partial updates
 */
export type PartialConversationState = Partial<ConversationState>;

/**
 * Event types for conversation lifecycle
 */
export type ConversationEvent = 
  | { type: 'conversation_started'; sessionId: string; config: ConversationConfig }
  | { type: 'message_added'; sessionId: string; message: MastermindMessage }
  | { type: 'response_generated'; sessionId: string; personaId: PersonaId; responseText: string }
  | { type: 'conversation_ended'; sessionId: string; reason: string }
  | { type: 'error_occurred'; sessionId: string; error: MastermindEngineError };

/**
 * Event handler interface
 */
export interface ConversationEventHandler {
  onEvent(event: ConversationEvent): Promise<void>;
}

/**
 * Configuration for the entire mastermind engine
 */
export interface MastermindEngineConfig {
  /** Default model for responses */
  defaultModelId: ModelId;
  
  /** Default model for director decisions */
  defaultDirectorModelId: ModelId;
  
  /** Session management configuration */
  sessionConfig: {
    /** Default session timeout in milliseconds */
    defaultTimeout: number;
    
    /** How often to clean up sessions (milliseconds) */
    cleanupInterval: number;
    
    /** Maximum number of active sessions */
    maxActiveSessions?: number;
  };
  
  /** Response generation configuration */
  responseConfig: PersonaResponseConfig;
  
  /** Memory integration settings */
  memoryConfig?: {
    /** Whether memory is enabled by default */
    enabledByDefault: boolean;
    
    /** Default memory search limit */
    defaultSearchLimit: number;
  };
  
  /** Event handling */
  eventHandlers?: ConversationEventHandler[];
  
  /** Feature flags */
  features?: {
    enableMemory?: boolean;
    enableStreaming?: boolean;
    enableDirectorInsights?: boolean;
    [key: string]: boolean | undefined;
  };
}

/**
 * Factory interface for creating engine components
 */
export interface MastermindEngineFactory {
  createSessionManager(): SessionManager;
  createMemoryManager(): MemoryManager;
  createConversationEngine(config: MastermindEngineConfig): ConversationEngine;
  createAdapter(type: 'web' | 'cli' | 'api'): ConversationAdapter;
}