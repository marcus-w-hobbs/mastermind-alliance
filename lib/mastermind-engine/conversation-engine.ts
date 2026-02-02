/**
 * MastermindConversationEngine - Core orchestration engine for mastermind conversations
 * 
 * This class implements the central conversation engine that coordinates all the components
 * of the mastermind system. It orchestrates the director and persona manager, handles
 * conversation state, manages sessions, and provides both streaming and non-streaming
 * response generation.
 * 
 * Extracted and refined from: app/actions/mastermind-actions.ts
 * Key improvements:
 * - Environment-agnostic design (works in CLI, web, API contexts)
 * - Clean separation of concerns with injected dependencies
 * - Comprehensive error handling and recovery mechanisms
 * - Support for both streaming and batch response modes
 * - Extensive logging and monitoring capabilities
 * - Pluggable memory and session management
 */

import { 
  ConversationEngine,
  ConversationConfig,
  ConversationState,
  ConversationResponse,
  ConversationStreamHandler,
  SessionManager,
  MemoryManager,
  PersonaResponseConfig,
  MastermindEngineError,
  SessionNotFoundError,
  PersonaNotFoundError,
  DirectorDecisionError,
  PersonaId,
  ModelId,
  MastermindMessage,
  DirectorDecision
} from './types';

import { generateMastermindMessageId } from '@/types/mastermind-message';
import { ConversationDirector, createDirectorContext } from './director';
import { PersonaManager } from './persona-manager';
import { Persona } from '@/lib/personas/persona';
import { PersonaFactory } from '@/lib/personas/persona-factory';
import { getModelInstance } from '@/lib/models';

/**
 * Configuration for the MastermindConversationEngine
 */
export interface MastermindEngineConfig {
  /** Model to use for response generation */
  defaultModelId: ModelId;
  
  /** Model to use for director decisions */
  directorModelId: ModelId;
  
  /** Default maximum responses per conversation */
  maxResponses: number;
  
  /** Configuration for persona response generation */
  personaConfig: PersonaResponseConfig;
  
  /** Session management configuration */
  sessionConfig: {
    timeoutMs: number;
    cleanupIntervalMs: number;
  };
  
  /** Chunk size for streaming responses */
  streamingChunkSize: number;
  
  /** Delay between chunks in milliseconds */
  streamingDelayMs: number;
  
  /** Delay between responses in milliseconds */
  responseDelayMs: number;
  
  /** Enable detailed logging */
  enableLogging: boolean;
  
  /** Enable memory integration */
  enableMemory: boolean;
}

/**
 * Default configuration for the engine
 */
const DEFAULT_CONFIG: MastermindEngineConfig = {
  defaultModelId: 'claude-sonnet-4-20250514',
  directorModelId: 'gpt-4o-mini',
  maxResponses: 10,
  personaConfig: {
    maxRetries: 3,
    minResponseLength: 10,
    temperature: 0.7,
    maxTokens: 500,
    useExponentialBackoff: true
  },
  sessionConfig: {
    timeoutMs: 3600000, // 1 hour
    cleanupIntervalMs: 3600000 // 1 hour
  },
  streamingChunkSize: 20,
  streamingDelayMs: 10,
  responseDelayMs: 500,
  enableLogging: false,
  enableMemory: false
};

/**
 * Main conversation engine implementing the ConversationEngine interface
 */
export class MastermindConversationEngine implements ConversationEngine {
  private config: MastermindEngineConfig;
  private director: ConversationDirector;
  private personaManager: PersonaManager;
  private sessionManager: SessionManager;
  private memoryManager?: MemoryManager;
  private logger: (message: string, ...args: unknown[]) => void;

  constructor(
    config: Partial<MastermindEngineConfig> = {},
    sessionManager?: SessionManager,
    memoryManager?: MemoryManager
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionManager = sessionManager || new InMemorySessionManager(this.config.sessionConfig);
    this.memoryManager = memoryManager;
    
    // Initialize director with engine config
    this.director = new ConversationDirector({
      modelId: this.config.directorModelId,
      enableLogging: this.config.enableLogging
    });
    
    // Initialize persona manager with engine config
    this.personaManager = new PersonaManager(
      this.config.personaConfig,
      { 
        enableVerboseLogging: this.config.enableLogging,
        includePerspectiveLabels: true
      }
    );
    
    this.logger = this.config.enableLogging 
      ? (msg, ...args) => console.log(msg, ...args)
      : () => {};
  }

  /**
   * Start a new conversation with given configuration
   */
  async startConversation(
    config: ConversationConfig,
    initialMessage?: string
  ): Promise<ConversationState> {
    this.logger('🚀 Starting new mastermind conversation');
    
    try {
      // Create new session
      const conversationState = await this.sessionManager.createSession(config);
      this.logger('📦 Created new session:', conversationState.sessionId);
      
      // Add initial message if provided
      if (initialMessage) {
        const updatedState = await this.addUserMessage(conversationState.sessionId, initialMessage);
        this.logger('💬 Added initial message to conversation');
        return updatedState;
      }
      
      return conversationState;
      
    } catch (error) {
      this.logger('❌ Error starting conversation:', error);
      throw new MastermindEngineError(
        'Failed to start conversation',
        'CONVERSATION_START_FAILED',
        false,
        { config, initialMessage, error }
      );
    }
  }

  /**
   * Add a user message to an existing conversation
   */
  async addUserMessage(sessionId: string, message: string): Promise<ConversationState> {
    this.logger('💬 Adding user message to session:', sessionId);
    
    try {
      const conversationState = await this.sessionManager.getSession(sessionId);
      if (!conversationState) {
        throw new SessionNotFoundError(sessionId);
      }

      // Create user message
      const userMessage: MastermindMessage = {
        id: generateMastermindMessageId(),
        role: "user",
        content: message,
        personaId: "user",
        timestamp: Date.now()
      };

      // Add to session
      conversationState.messages.push(userMessage);
      conversationState.lastActivity = Date.now();
      
      // Update session
      const updatedState = await this.sessionManager.updateSession(sessionId, conversationState);
      
      // Add to memory if enabled
      if (this.config.enableMemory && this.memoryManager && conversationState.config.userMemoryId) {
        try {
          await this.memoryManager.addToMemory(conversationState.config.userMemoryId, message);
          this.logger('🧠 Added message to memory');
        } catch (error) {
          this.logger('⚠️ Failed to add message to memory:', error);
        }
      }
      
      this.logger('✅ User message added successfully');
      return updatedState;
      
    } catch (error) {
      if (error instanceof MastermindEngineError) {
        throw error;
      }
      this.logger('❌ Error adding user message:', error);
      throw new MastermindEngineError(
        'Failed to add user message',
        'ADD_MESSAGE_FAILED',
        true,
        { sessionId, message, error }
      );
    }
  }

  /**
   * Generate the next response in the conversation
   */
  async generateNextResponse(sessionId: string): Promise<ConversationResponse> {
    console.log('[conversation-engine] 🔮 Generating next response for session:', sessionId);
    this.logger('🔮 Generating next response for session:', sessionId);
    const startTime = Date.now();
    
    try {
      const conversationState = await this.sessionManager.getSession(sessionId);
      if (!conversationState) {
        throw new SessionNotFoundError(sessionId);
      }

      // Check if conversation should continue
      if (conversationState.responseCount >= (conversationState.config.maxResponses || this.config.maxResponses)) {
        return this.createEndResponse(sessionId, conversationState, 'Max responses reached');
      }

      // Get last user message
      const lastUserMessage = conversationState.messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (!lastUserMessage) {
        throw new MastermindEngineError(
          'No user message to respond to',
          'NO_USER_MESSAGE',
          false,
          { sessionId }
        );
      }

      // Initialize personas
      const personas = this.initializePersonas(conversationState);
      this.logger('🎭 Initialized personas:', personas.map(p => p.name).join(', '));

      // Get director decision
      console.log('[conversation-engine] 🎬 Getting director decision...');
      const directorDecision = await this.getDirectorDecision(conversationState, personas);
      console.log('[conversation-engine] ✅ Director decision received:', {
        nextSpeaker: directorDecision.choreography.nextSpeaker,
        shouldContinue: directorDecision.shouldContinue
      });
      this.logger('🎬 Director decision:', {
        nextSpeaker: directorDecision.choreography.nextSpeaker,
        shouldContinue: directorDecision.shouldContinue
      });

      // Check if director wants to end conversation
      if (!directorDecision.shouldContinue) {
        return this.createEndResponse(sessionId, conversationState, 'Director ended conversation');
      }

      // Find chosen persona
      const chosenPersona = await this.personaManager.findPersonaById(
        directorDecision.choreography.nextSpeaker,
        personas
      );
      
      if (!chosenPersona) {
        throw new PersonaNotFoundError(directorDecision.choreography.nextSpeaker);
      }

      // Generate response
      const responseResult = await this.generatePersonaResponse(
        chosenPersona,
        directorDecision,
        conversationState
      );

      if (!responseResult.success) {
        return this.handleFailedResponse(
          sessionId,
          conversationState,
          directorDecision.choreography.nextSpeaker,
          {
            attempts: responseResult.attempts,
            responseTime: responseResult.responseTime,
            error: responseResult.error || 'Unknown error'
          }
        );
      }

      // Update conversation state
      const updatedState = await this.updateConversationAfterResponse(
        conversationState,
        personas,
        directorDecision.choreography.nextSpeaker,
        responseResult.responseText
      );

      const responseTime = Date.now() - startTime;
      
      return {
        sessionId,
        success: true,
        speakingPersona: directorDecision.choreography.nextSpeaker,
        responseText: responseResult.responseText,
        directorDecision,
        shouldContinue: true,
        metadata: {
          attempts: responseResult.attempts,
          responseTime,
          wasFallback: false
        },
        conversationState: updatedState
      };

    } catch (error) {
      this.logger('❌ Error generating response:', error);
      
      if (error instanceof MastermindEngineError) {
        const conversationState = await this.sessionManager.getSession(sessionId);
        return {
          sessionId,
          success: false,
          shouldContinue: error.recoverable,
          metadata: {
            attempts: 0,
            responseTime: Date.now() - startTime,
            wasFallback: false,
            error: error.message,
            recoverable: error.recoverable
          },
          conversationState: conversationState!
        };
      }
      
      throw error;
    }
  }

  /**
   * Generate a streaming response (main orchestration method)
   */
  async generateStreamingResponse(
    sessionId: string,
    handler: ConversationStreamHandler
  ): Promise<void> {
    this.logger('🌊 Starting streaming response generation for session:', sessionId);
    
    try {
      const conversationState = await this.sessionManager.getSession(sessionId);
      if (!conversationState) {
        throw new SessionNotFoundError(sessionId);
      }

      // Orchestrate the full conversation loop
      await this.runConversationLoop(conversationState, handler);
      
    } catch (error) {
      this.logger('❌ Streaming error:', error);
      await handler.onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Main conversation orchestration loop (extracted from original implementation)
   */
  private async runConversationLoop(
    conversationState: ConversationState,
    handler: ConversationStreamHandler
  ): Promise<void> {
    this.logger('🎯 Starting async streaming loop');
    
    let responseCount = conversationState.responseCount;
    const maxResponses = conversationState.config.maxResponses || this.config.maxResponses;
    let conversationEndReason = "Max responses reached";
    const recentFailedPersonas: PersonaId[] = [...conversationState.recentFailedPersonas];
    let lastSuccessfulSpeakerId: PersonaId | undefined = conversationState.lastSuccessfulSpeakerId;
    let hasCompletionBeenSent = false; // Track if we've already sent a completion event
    
    this.logger(`📊 Max responses allowed: ${maxResponses}`);
    
    // Initialize personas
    const personas = this.initializePersonas(conversationState);
    
    while (responseCount < maxResponses) {
      this.logger(`\n🔄 === ROUND ${responseCount + 1} ===`);
      
      try {
        // Get director's decision
        const directorDecision = await this.getDirectorDecision(conversationState, personas);
        this.logger('🎯 Director decision:', {
          nextSpeaker: directorDecision.choreography.nextSpeaker,
          shouldContinue: directorDecision.shouldContinue,
          rationale: directorDecision.choreography.rationale
        });
        
        // Check if conversation should continue
        if (!directorDecision.shouldContinue) {
          this.logger('🛑 Director decided to end conversation:', directorDecision.metadata.reasoning);
          conversationEndReason = "Director ended conversation";
          break;
        }

        // Find chosen persona
        const chosenPersona = await this.personaManager.findPersonaById(
          directorDecision.choreography.nextSpeaker,
          personas
        );
        
        if (!chosenPersona) {
          this.logger(`❌ Could not find persona: ${directorDecision.choreography.nextSpeaker}`);
          conversationEndReason = "Persona not found";
          break;
        }

        const personaId = directorDecision.choreography.nextSpeaker;

        // Send start event
        await handler.onChunk({
          type: "start",
          sessionId: conversationState.sessionId,
          personaId,
          timestamp: Date.now(),
          directorInsight: {
            rationale: directorDecision.choreography.rationale,
            goal: directorDecision.choreography.conversationalGoal,
            reasoning: directorDecision.metadata.reasoning,
            significance: directorDecision.analysis.significance,
            opportunities: directorDecision.analysis.opportunities,
            direction: directorDecision.choreography.direction
          }
        });

        // Generate response with streaming
        const responseResult = await this.generateAndStreamPersonaResponse(
          chosenPersona,
          directorDecision,
          conversationState,
          handler
        );
        
        if (!responseResult.success) {
          this.logger(`❌ Failed to generate response for ${chosenPersona.name} after ${responseResult.attempts} attempts`);
          
          // Track failed persona
          if (!recentFailedPersonas.includes(personaId)) {
            recentFailedPersonas.push(personaId);
          }
          if (recentFailedPersonas.length > 3) {
            recentFailedPersonas.shift();
          }
          
          // Send error event
          await handler.onChunk({
            type: "error",
            sessionId: conversationState.sessionId,
            personaId,
            timestamp: Date.now(),
            error: {
              message: `Failed to generate response after ${responseResult.attempts} attempts`,
              recoverable: true,
              personaId
            }
          });
          
          // Check for too many consecutive failures
          conversationState.consecutiveFailures = (conversationState.consecutiveFailures || 0) + 1;
          
          if (conversationState.consecutiveFailures >= 3) {
            this.logger('🛑 All personas failed to generate responses, ending conversation');
            conversationEndReason = "Failed to generate response after 3 attempts";
            hasCompletionBeenSent = true; // Mark that we're sending completion
            await handler.onChunk({
              type: "complete",
              sessionId: conversationState.sessionId,
              timestamp: Date.now(),
              completion: {
                totalResponses: responseCount,
                reason: conversationEndReason,
                completed: true
              }
            });
            break;
          }
          
          continue; // Skip to next persona
        } else {
          // Reset consecutive failures on success
          conversationState.consecutiveFailures = 0;
          lastSuccessfulSpeakerId = personaId;
          
          // Remove from failed list if they were on it
          const failedIndex = recentFailedPersonas.indexOf(personaId);
          if (failedIndex !== -1) {
            recentFailedPersonas.splice(failedIndex, 1);
          }
        }

        // Update conversation state
        await this.updateConversationAfterResponse(
          conversationState,
          personas,
          personaId,
          responseResult.responseText
        );

        // Send end event
        await handler.onChunk({
          type: "end",
          sessionId: conversationState.sessionId,
          personaId,
          done: true,
          timestamp: Date.now(),
          metadata: {
            finalContent: responseResult.responseText,
            contentLength: responseResult.responseText.length
          }
        });

        responseCount++;
        this.logger(`📈 Response count: ${responseCount}/${maxResponses}`);

        // Add delay between responses
        await new Promise(resolve => setTimeout(resolve, this.config.responseDelayMs));
        
      } catch (error) {
        this.logger('❌ Error in conversation loop:', error);
        conversationEndReason = error instanceof Error ? error.message : "Unknown error";
        hasCompletionBeenSent = true; // Mark that we're sending completion
        await handler.onChunk({
          type: "error",
          sessionId: conversationState.sessionId,
          timestamp: Date.now(),
          error: {
            message: error instanceof Error ? error.message : String(error),
            recoverable: false
          }
        });
        // Send completion event for fatal errors
        await handler.onChunk({
          type: "complete",
          sessionId: conversationState.sessionId,
          timestamp: Date.now(),
          completion: {
            totalResponses: responseCount,
            reason: conversationEndReason,
            completed: false
          }
        });
        break;
      }
    }

    // Only send completion event if we haven't already sent one
    if (!hasCompletionBeenSent) {
      this.logger('\n🏁 === CONVERSATION COMPLETE ===');
      await handler.onChunk({
        type: "complete",
        sessionId: conversationState.sessionId,
        timestamp: Date.now(),
        completion: {
          totalResponses: responseCount,
          reason: conversationEndReason,
          completed: true
        }
      });
    }

    // Final state update
    conversationState.responseCount = responseCount;
    conversationState.isActive = false;
    conversationState.recentFailedPersonas = recentFailedPersonas;
    conversationState.lastSuccessfulSpeakerId = lastSuccessfulSpeakerId;
    
    await this.sessionManager.updateSession(conversationState.sessionId, conversationState);
    await handler.onComplete(conversationState);
  }

  /**
   * Get conversation state
   */
  async getConversationState(sessionId: string): Promise<ConversationState | null> {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * End a conversation
   */
  async endConversation(sessionId: string, reason?: string): Promise<void> {
    this.logger('🏁 Ending conversation:', sessionId, reason);
    
    const conversationState = await this.sessionManager.getSession(sessionId);
    if (conversationState) {
      conversationState.isActive = false;
      conversationState.lastActivity = Date.now();
      await this.sessionManager.updateSession(sessionId, conversationState);
    }
  }

  /**
   * Clean up old/inactive conversations
   */
  async cleanup(): Promise<void> {
    this.logger('🧹 Running conversation cleanup');
    await this.sessionManager.cleanupExpiredSessions();
  }

  // === PRIVATE HELPER METHODS ===

  private initializePersonas(conversationState: ConversationState): Persona[] {
    this.logger('🎭 Initializing personas from config');
    
    // Create personas from selected IDs
    const personas = conversationState.config.selectedPersonas.map(id => 
      PersonaFactory.getPersonaById(id)
    );
    
    // Initialize roundtable context
    this.personaManager.initializeRoundtableContext(personas);
    
    // Add memory context if enabled
    if (this.config.enableMemory && this.memoryManager && conversationState.config.userMemoryId) {
      const lastUserMessage = conversationState.messages
        .filter(msg => msg.role === 'user')
        .pop();
      
      if (lastUserMessage) {
        this.personaManager.addMemoryContext(
          personas,
          lastUserMessage.content,
          async (query: string) => {
            if (this.memoryManager && conversationState.config.userMemoryId) {
              return this.memoryManager.searchMemories(conversationState.config.userMemoryId, query);
            }
            return null;
          }
        );
      }
    }
    
    // Rebuild message history from each persona's perspective
    this.personaManager.rebuildMessageHistoryPerspectives(personas, conversationState.messages);
    
    return personas;
  }

  private async getDirectorDecision(
    conversationState: ConversationState,
    personas: Persona[]
  ): Promise<DirectorDecision> {
    const recentMessages = conversationState.messages.slice(-6); // Last 6 messages

    const directorContext = createDirectorContext(
      conversationState,
      personas,
      recentMessages,
      conversationState.responseCount,
      conversationState.recentFailedPersonas,
      conversationState.lastSuccessfulSpeakerId
    );

    try {
      return await this.director.getDirectorDecision(directorContext);
    } catch (error) {
      this.logger('❌ Director decision failed:', error);
      throw new DirectorDecisionError(error instanceof Error ? error.message : String(error));
    }
  }

  private async generatePersonaResponse(
    persona: Persona,
    decision: DirectorDecision,
    conversationState: ConversationState
  ) {
    // Inject director guidance
    this.personaManager.injectDirectorGuidance(persona, decision);
    
    try {
      // Generate response
      const modelId = conversationState.config.modelId || this.config.defaultModelId;
      console.log(`[conversation-engine] 🤖 Getting model instance for ${persona.name}:`, {
        requestedModelId: modelId,
        configModelId: conversationState.config.modelId,
        defaultModelId: this.config.defaultModelId
      });
      
      const model = getModelInstance(modelId);
      console.log(`[conversation-engine] ✅ Model instance retrieved:`, {
        modelId: modelId,
        personaName: persona.name
      });
      
      const result = await this.personaManager.generatePersonaResponseWithRetry(persona, model, {}, modelId);
      
      return result;
    } finally {
      // Always clean up director guidance
      this.personaManager.cleanupDirectorGuidance(persona);
    }
  }

  private async generateAndStreamPersonaResponse(
    persona: Persona,
    decision: DirectorDecision,
    conversationState: ConversationState,
    handler: ConversationStreamHandler
  ) {
    const responseResult = await this.generatePersonaResponse(persona, decision, conversationState);
    
    if (responseResult.success) {
      // Stream the response in chunks
      const responseText = responseResult.responseText;
      const chunkSize = this.config.streamingChunkSize;
      
      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.slice(i, Math.min(i + chunkSize, responseText.length));
        
        await handler.onChunk({
          type: "chunk",
          sessionId: conversationState.sessionId,
          personaId: decision.choreography.nextSpeaker,
          chunk,
          timestamp: Date.now()
        });
        
        // Small delay for better streaming UX
        await new Promise(resolve => setTimeout(resolve, this.config.streamingDelayMs));
      }
    }
    
    return responseResult;
  }

  private async updateConversationAfterResponse(
    conversationState: ConversationState,
    personas: Persona[],
    speakingPersonaId: PersonaId,
    responseText: string
  ): Promise<ConversationState> {
    // Create assistant message
    const assistantMessage: MastermindMessage = {
      id: generateMastermindMessageId(),
      role: "assistant",
      content: responseText,
      personaId: speakingPersonaId,
      timestamp: Date.now()
    };

    // Update session message history
    conversationState.messages.push(assistantMessage);
    conversationState.responseCount++;
    conversationState.lastActivity = Date.now();

    // Update all persona message histories
    this.personaManager.updateAllPersonaHistories(personas, responseText, speakingPersonaId);

    // Save updated state
    return await this.sessionManager.updateSession(conversationState.sessionId, conversationState);
  }

  private async handleFailedResponse(
    sessionId: string,
    conversationState: ConversationState,
    personaId: PersonaId,
    responseResult: { attempts: number; responseTime: number; error: string }
  ): Promise<ConversationResponse> {
    return {
      sessionId,
      success: false,
      shouldContinue: true,
      metadata: {
        attempts: responseResult.attempts,
        responseTime: responseResult.responseTime,
        wasFallback: false,
        error: responseResult.error,
        recoverable: true
      },
      conversationState
    };
  }

  private createEndResponse(
    sessionId: string,
    conversationState: ConversationState,
    reason: string
  ): ConversationResponse {
    return {
      sessionId,
      success: false,
      shouldContinue: false,
      metadata: {
        attempts: 0,
        responseTime: 0,
        wasFallback: false,
        endReason: reason
      },
      conversationState
    };
  }
}

/**
 * Simple in-memory session manager implementation
 */
class InMemorySessionManager implements SessionManager {
  private sessions = new Map<string, ConversationState>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: { timeoutMs: number; cleanupIntervalMs: number }) {
    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, config.cleanupIntervalMs);
  }

  async createSession(config: ConversationConfig): Promise<ConversationState> {
    const sessionId = config.sessionConfig?.sessionId || generateMastermindMessageId();
    
    const conversationState: ConversationState = {
      sessionId,
      messages: [],
      config,
      responseCount: 0,
      lastActivity: Date.now(),
      recentFailedPersonas: [],
      consecutiveFailures: 0,
      isActive: true,
      metadata: {
        startTime: Date.now()
      }
    };

    this.sessions.set(sessionId, conversationState);
    return conversationState;
  }

  async getSession(sessionId: string): Promise<ConversationState | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
    return session || null;
  }

  async updateSession(sessionId: string, state: Partial<ConversationState>): Promise<ConversationState> {
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new SessionNotFoundError(sessionId);
    }

    const updated = { ...existing, ...state };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const timeout = 3600000; // 1 hour
    let cleaned = 0;

    this.sessions.forEach((session, id) => {
      if (now - session.lastActivity > timeout) {
        this.sessions.delete(id);
        cleaned++;
      }
    });

    return cleaned;
  }

  async getActiveSessions(): Promise<ConversationState[]> {
    return Array.from(this.sessions.values()).filter(s => s.isActive);
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Factory function for creating MastermindConversationEngine instances
 */
export function createMastermindEngine(
  config?: Partial<MastermindEngineConfig>,
  sessionManager?: SessionManager,
  memoryManager?: MemoryManager
): MastermindConversationEngine {
  return new MastermindConversationEngine(config, sessionManager, memoryManager);
}

/**
 * Default engine instance for quick use
 */
export const defaultMastermindEngine = createMastermindEngine();