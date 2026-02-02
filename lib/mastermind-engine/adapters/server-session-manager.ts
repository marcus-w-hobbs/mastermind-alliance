/**
 * Server Session Manager for Next.js Integration
 * 
 * This implements the SessionManager interface for use with Next.js server actions.
 * It maintains in-memory session storage with automatic cleanup.
 */

import { SessionManager, ConversationState, ConversationConfig } from "../types";
import { PersonaId } from "../../../lib/personas/personas-registry";
import { ModelId } from "../../../lib/models";
import { MastermindMessage } from "../../../types/mastermind-message";

export interface ServerSessionData {
  sessionId: string;
  messages: MastermindMessage[];
  modelName: ModelId;
  selectedPersonas: PersonaId[];
  timestamp: number;
  userMemoryId?: string;
  consecutiveFailures: number;
  config: ConversationConfig;
  responseCount: number;
  lastActivity: number;
  recentFailedPersonas: PersonaId[];
  lastSuccessfulSpeakerId?: PersonaId;
  isActive: boolean;
  metadata?: {
    startTime: number;
    totalTokensUsed?: number;
    averageResponseTime?: number;
    [key: string]: unknown;
  };
}

/**
 * Server Session Manager Implementation
 */
export class ServerSessionManager implements SessionManager {
  private sessions = new Map<string, ServerSessionData>();
  private readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `mastermind_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Create new session
   */
  async createSession(config: ConversationConfig): Promise<ConversationState> {
    const sessionId = this.generateSessionId();
    
    const now = Date.now();
    const sessionData: ServerSessionData = {
      sessionId,
      messages: [],
      modelName: config.modelId,
      selectedPersonas: config.selectedPersonas,
      timestamp: now,
      consecutiveFailures: 0,
      config,
      responseCount: 0,
      lastActivity: now,
      recentFailedPersonas: [],
      isActive: true,
      metadata: {
        startTime: now
      }
    };

    this.sessions.set(sessionId, sessionData);

    return {
      sessionId,
      messages: [],
      config,
      responseCount: 0,
      lastActivity: now,
      recentFailedPersonas: [],
      consecutiveFailures: 0,
      isActive: true,
      metadata: {
        startTime: now
      }
    };
  }

  /**
   * Get existing session
   */
  async getSession(sessionId: string): Promise<ConversationState | null> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      return null;
    }

    // Update timestamp on access
    sessionData.timestamp = Date.now();
    sessionData.lastActivity = Date.now();

    return {
      sessionId: sessionData.sessionId,
      messages: sessionData.messages,
      config: sessionData.config,
      responseCount: sessionData.responseCount,
      lastActivity: sessionData.lastActivity,
      recentFailedPersonas: sessionData.recentFailedPersonas,
      lastSuccessfulSpeakerId: sessionData.lastSuccessfulSpeakerId,
      consecutiveFailures: sessionData.consecutiveFailures,
      isActive: sessionData.isActive,
      metadata: sessionData.metadata
    };
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updates: Partial<ConversationState>): Promise<ConversationState> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update session data
    if (updates.messages !== undefined) {
      sessionData.messages = updates.messages;
    }
    if (updates.responseCount !== undefined) {
      sessionData.responseCount = updates.responseCount;
    }
    if (updates.recentFailedPersonas !== undefined) {
      sessionData.recentFailedPersonas = updates.recentFailedPersonas;
    }
    if (updates.lastSuccessfulSpeakerId !== undefined) {
      sessionData.lastSuccessfulSpeakerId = updates.lastSuccessfulSpeakerId;
    }
    if (updates.consecutiveFailures !== undefined) {
      sessionData.consecutiveFailures = updates.consecutiveFailures;
    }
    if (updates.isActive !== undefined) {
      sessionData.isActive = updates.isActive;
    }
    if (updates.metadata !== undefined) {
      sessionData.metadata = { ...sessionData.metadata, ...updates.metadata };
    }

    sessionData.timestamp = Date.now();
    sessionData.lastActivity = Date.now();

    // Return the updated session
    return {
      sessionId: sessionData.sessionId,
      messages: sessionData.messages,
      config: sessionData.config,
      responseCount: sessionData.responseCount,
      lastActivity: sessionData.lastActivity,
      recentFailedPersonas: sessionData.recentFailedPersonas,
      lastSuccessfulSpeakerId: sessionData.lastSuccessfulSpeakerId,
      consecutiveFailures: sessionData.consecutiveFailures,
      isActive: sessionData.isActive,
      metadata: sessionData.metadata
    };
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  /**
   * Add message to session
   */
  async addMessage(sessionId: string, message: MastermindMessage): Promise<void> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    sessionData.messages.push(message);
    sessionData.timestamp = Date.now();
  }

  /**
   * Get session messages
   */
  async getMessages(sessionId: string): Promise<MastermindMessage[]> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return [...sessionData.messages];
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<ConversationState[]> {
    const activeSessions: ConversationState[] = [];
    
    for (const sessionData of this.sessions.values()) {
      if (sessionData.isActive) {
        activeSessions.push({
          sessionId: sessionData.sessionId,
          messages: sessionData.messages,
          config: sessionData.config,
          responseCount: sessionData.responseCount,
          lastActivity: sessionData.lastActivity,
          recentFailedPersonas: sessionData.recentFailedPersonas,
          lastSuccessfulSpeakerId: sessionData.lastSuccessfulSpeakerId,
          consecutiveFailures: sessionData.consecutiveFailures,
          isActive: sessionData.isActive,
          metadata: sessionData.metadata
        });
      }
    }
    
    return activeSessions;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    for (const [sessionId, sessionData] of this.sessions.entries()) {
      if (now - sessionData.timestamp > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }
    
    return expiredSessions.length;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
  }> {
    const sessions = Array.from(this.sessions.values());
    const totalMessages = sessions.reduce((sum, session) => sum + session.messages.length, 0);

    return {
      totalSessions: sessions.length,
      totalMessages,
      averageMessagesPerSession: sessions.length > 0 ? totalMessages / sessions.length : 0
    };
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.sessions.clear();
  }

  /**
   * Force cleanup (for testing/debugging)
   */
  forceCleanup(): void {
    this.cleanupExpiredSessions();
  }

  /**
   * Get raw session data (for debugging)
   */
  getSessionData(sessionId: string): ServerSessionData | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Set session data directly (for testing)
   */
  setSessionData(sessionId: string, data: ServerSessionData): void {
    this.sessions.set(sessionId, data);
  }
}

/**
 * Singleton instance for server use
 */
let serverSessionManagerInstance: ServerSessionManager | null = null;

export function getServerSessionManager(): ServerSessionManager {
  if (!serverSessionManagerInstance) {
    serverSessionManagerInstance = new ServerSessionManager();
  }
  return serverSessionManagerInstance;
}

/**
 * Reset singleton (for testing)
 */
export function resetServerSessionManager(): void {
  if (serverSessionManagerInstance) {
    serverSessionManagerInstance.shutdown();
  }
  serverSessionManagerInstance = null;
}