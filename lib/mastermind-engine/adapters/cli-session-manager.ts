/**
 * CLI Session Manager
 * 
 * A specialized session manager for CLI environments that provides enhanced
 * session management features suitable for command-line interfaces.
 * 
 * Features:
 * - File-based session persistence (optional)
 * - Enhanced debugging and logging
 * - Session history and recovery
 * - CLI-specific session metadata
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  SessionManager,
  ConversationConfig,
  ConversationState,
  SessionNotFoundError,
  MastermindEngineError
} from '../types';
import { generateMastermindMessageId } from '@/types/mastermind-message';

/**
 * Configuration for CLI Session Manager
 */
export interface CLISessionManagerConfig {
  /** Enable persistent storage to disk */
  enablePersistence: boolean;
  
  /** Directory to store session files */
  sessionDirectory: string;
  
  /** Session timeout in milliseconds */
  timeoutMs: number;
  
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
  
  /** Maximum number of sessions to keep in memory */
  maxInMemorySessions: number;
  
  /** Enable verbose logging */
  verbose: boolean;
  
  /** Automatically save sessions after updates */
  autoSave: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CLISessionManagerConfig = {
  enablePersistence: false,
  sessionDirectory: path.join(os.tmpdir(), 'mastermind-cli-sessions'),
  timeoutMs: 3600000, // 1 hour
  cleanupIntervalMs: 300000, // 5 minutes
  maxInMemorySessions: 10,
  verbose: false,
  autoSave: true
};

/**
 * Enhanced session state with CLI-specific metadata
 */
interface CLISessionState extends ConversationState {
  metadata: ConversationState['metadata'] & {
    /** CLI-specific metadata */
    cli?: {
      /** Process ID that created the session */
      pid: number;
      
      /** Terminal environment info */
      terminal?: {
        columns: number;
        rows: number;
        colorDepth: number;
      };
      
      /** Command-line arguments */
      argv?: string[];
      
      /** Working directory when session was created */
      cwd: string;
      
      /** User info */
      user?: {
        username: string;
        homedir: string;
      };
      
      /** Session creation timestamp */
      createdAt: number;
      
      /** Last access timestamp */
      lastAccessedAt: number;
      
      /** Number of interactions */
      interactionCount: number;
    };
  };
}

/**
 * CLI Session Manager Implementation
 */
export class CLISessionManager implements SessionManager {
  private sessions = new Map<string, CLISessionState>();
  private config: CLISessionManagerConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<CLISessionManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  /**
   * Initialize the session manager
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create session directory if persistence is enabled
      if (this.config.enablePersistence) {
        await this.ensureSessionDirectory();
        await this.loadPersistedSessions();
      }

      // Start cleanup timer
      this.startCleanupTimer();
      
      this.isInitialized = true;
      this.log('CLI Session Manager initialized', {
        persistence: this.config.enablePersistence,
        sessionDir: this.config.sessionDirectory,
        maxSessions: this.config.maxInMemorySessions
      });
      
    } catch (error) {
      throw new MastermindEngineError(
        'Failed to initialize CLI session manager',
        'INIT_FAILED',
        false,
        { error }
      );
    }
  }

  /**
   * Create a new session
   */
  async createSession(config: ConversationConfig): Promise<ConversationState> {
    await this.initialize();
    
    const sessionId = config.sessionConfig?.sessionId || generateMastermindMessageId();
    
    // Gather CLI environment info
    const cliMetadata = {
      pid: process.pid,
      terminal: process.stdout.isTTY ? {
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        colorDepth: process.stdout.getColorDepth?.() || 8
      } : undefined,
      argv: process.argv,
      cwd: process.cwd(),
      user: {
        username: os.userInfo().username,
        homedir: os.homedir()
      },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      interactionCount: 0
    };

    const session: CLISessionState = {
      sessionId,
      messages: [],
      config,
      responseCount: 0,
      lastActivity: Date.now(),
      recentFailedPersonas: [],
      consecutiveFailures: 0,
      isActive: true,
      metadata: {
        startTime: Date.now(),
        cli: cliMetadata
      }
    };

    // Store session
    this.sessions.set(sessionId, session);
    
    // Persist if enabled
    if (this.config.enablePersistence && this.config.autoSave) {
      await this.persistSession(session);
    }
    
    // Enforce memory limits
    await this.enforceMemoryLimits();
    
    this.log('Created new session', { sessionId, personaCount: config.selectedPersonas.length });
    
    return session;
  }

  /**
   * Get an existing session
   */
  async getSession(sessionId: string): Promise<ConversationState | null> {
    await this.initialize();
    
    let session = this.sessions.get(sessionId);
    
    // Try to load from disk if not in memory
    if (!session && this.config.enablePersistence) {
      session = await this.loadSessionFromDisk(sessionId);
      if (session) {
        this.sessions.set(sessionId, session);
      }
    }
    
    if (session) {
      // Update access metadata
      session.lastActivity = Date.now();
      if (session.metadata?.cli) {
        session.metadata.cli.lastAccessedAt = Date.now();
      }
      
      this.log('Retrieved session', { sessionId });
    }
    
    return session || null;
  }

  /**
   * Update session state
   */
  async updateSession(sessionId: string, state: Partial<ConversationState>): Promise<ConversationState> {
    await this.initialize();
    
    const existing = this.sessions.get(sessionId);
    if (!existing) {
      throw new SessionNotFoundError(sessionId);
    }

    // Update CLI metadata
    const updatedState = { ...existing, ...state } as CLISessionState;
    
    if (updatedState.metadata?.cli) {
      updatedState.metadata.cli.lastAccessedAt = Date.now();
      updatedState.metadata.cli.interactionCount++;
    }

    this.sessions.set(sessionId, updatedState);
    
    // Auto-save if enabled
    if (this.config.enablePersistence && this.config.autoSave) {
      await this.persistSession(updatedState);
    }
    
    this.log('Updated session', { sessionId, messageCount: updatedState.messages.length });
    
    return updatedState;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.initialize();
    
    this.sessions.delete(sessionId);
    
    // Remove from disk if persistence is enabled
    if (this.config.enablePersistence) {
      await this.deleteSessionFromDisk(sessionId);
    }
    
    this.log('Deleted session', { sessionId });
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    await this.initialize();
    
    const now = Date.now();
    let cleaned = 0;

    // Clean memory sessions
    const expiredSessions: string[] = [];
    this.sessions.forEach((session, sessionId) => {
      if (now - session.lastActivity > this.config.timeoutMs) {
        expiredSessions.push(sessionId);
      }
    });

    for (const sessionId of expiredSessions) {
      await this.deleteSession(sessionId);
      cleaned++;
    }

    // Clean disk sessions if persistence is enabled
    if (this.config.enablePersistence) {
      const diskCleaned = await this.cleanupDiskSessions();
      cleaned += diskCleaned;
    }

    if (cleaned > 0) {
      this.log('Cleaned up expired sessions', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<ConversationState[]> {
    await this.initialize();
    
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.isActive);
    
    // Load active sessions from disk if persistence is enabled
    if (this.config.enablePersistence) {
      const diskSessions = await this.loadAllActiveSessionsFromDisk();
      
      // Merge with memory sessions (avoid duplicates)
      for (const diskSession of diskSessions) {
        if (!this.sessions.has(diskSession.sessionId)) {
          activeSessions.push(diskSession);
        }
      }
    }
    
    return activeSessions;
  }

  /**
   * Get CLI-specific session metadata
   */
  async getSessionMetadata(sessionId: string): Promise<CLISessionState['metadata']['cli'] | null> {
    const session = await this.getSession(sessionId) as CLISessionState;
    return session?.metadata?.cli || null;
  }

  /**
   * Export session data for debugging
   */
  async exportSessionData(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    
    return JSON.stringify(session, null, 2);
  }

  /**
   * Destroy the session manager and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.sessions.clear();
    this.isInitialized = false;
    
    this.log('CLI Session Manager destroyed');
  }

  // === PRIVATE HELPER METHODS ===

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        this.log('Error during cleanup', { error });
      }
    }, this.config.cleanupIntervalMs);
  }

  private async enforceMemoryLimits(): Promise<void> {
    if (this.sessions.size <= this.config.maxInMemorySessions) {
      return;
    }

    // Remove oldest sessions from memory (but keep on disk if persistence is enabled)
    const sessions = Array.from(this.sessions.entries());
    sessions.sort(([, a], [, b]) => a.lastActivity - b.lastActivity);
    
    const toRemove = sessions.slice(0, sessions.length - this.config.maxInMemorySessions);
    
    for (const [sessionId, session] of toRemove) {
      if (this.config.enablePersistence) {
        await this.persistSession(session);
      }
      this.sessions.delete(sessionId);
    }
    
    if (toRemove.length > 0) {
      this.log('Enforced memory limits', { removed: toRemove.length });
    }
  }

  private async ensureSessionDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.sessionDirectory, { recursive: true });
    } catch (error) {
      throw new MastermindEngineError(
        'Failed to create session directory',
        'DIRECTORY_CREATION_FAILED',
        false,
        { directory: this.config.sessionDirectory, error }
      );
    }
  }

  private getSessionFilePath(sessionId: string): string {
    return path.join(this.config.sessionDirectory, `${sessionId}.json`);
  }

  private async persistSession(session: CLISessionState): Promise<void> {
    try {
      const filePath = this.getSessionFilePath(session.sessionId);
      await fs.writeFile(filePath, JSON.stringify(session, null, 2));
    } catch (error) {
      this.log('Failed to persist session', { sessionId: session.sessionId, error });
    }
  }

  private async loadSessionFromDisk(sessionId: string): Promise<CLISessionState | undefined> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as CLISessionState;
    } catch {
      return undefined;
    }
  }

  private async deleteSessionFromDisk(sessionId: string): Promise<void> {
    try {
      const filePath = this.getSessionFilePath(sessionId);
      await fs.unlink(filePath);
    } catch {
      // Ignore errors (file might not exist)
    }
  }

  private async loadPersistedSessions(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.sessionDirectory);
      const sessionFiles = files.filter(file => file.endsWith('.json'));
      
      let loaded = 0;
      for (const file of sessionFiles) {
        const sessionId = path.basename(file, '.json');
        const session = await this.loadSessionFromDisk(sessionId);
        
        if (session && session.isActive) {
          this.sessions.set(sessionId, session);
          loaded++;
          
          // Respect memory limits
          if (this.sessions.size >= this.config.maxInMemorySessions) {
            break;
          }
        }
      }
      
      if (loaded > 0) {
        this.log('Loaded persisted sessions', { count: loaded });
      }
      
    } catch (error) {
      this.log('Failed to load persisted sessions', { error });
    }
  }

  private async cleanupDiskSessions(): Promise<number> {
    try {
      const files = await fs.readdir(this.config.sessionDirectory);
      const sessionFiles = files.filter(file => file.endsWith('.json'));
      
      let cleaned = 0;
      const now = Date.now();
      
      for (const file of sessionFiles) {
        const sessionId = path.basename(file, '.json');
        const session = await this.loadSessionFromDisk(sessionId);
        
        if (session && (now - session.lastActivity > this.config.timeoutMs)) {
          await this.deleteSessionFromDisk(sessionId);
          cleaned++;
        }
      }
      
      return cleaned;
      
    } catch (error) {
      this.log('Failed to cleanup disk sessions', { error });
      return 0;
    }
  }

  private async loadAllActiveSessionsFromDisk(): Promise<CLISessionState[]> {
    const sessions: CLISessionState[] = [];
    
    try {
      const files = await fs.readdir(this.config.sessionDirectory);
      const sessionFiles = files.filter(file => file.endsWith('.json'));
      
      for (const file of sessionFiles) {
        const sessionId = path.basename(file, '.json');
        const session = await this.loadSessionFromDisk(sessionId);
        
        if (session && session.isActive) {
          sessions.push(session);
        }
      }
      
    } catch (error) {
      this.log('Failed to load active sessions from disk', { error });
    }
    
    return sessions;
  }

  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[CLISessionManager] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

/**
 * Factory function for creating CLI session managers
 */
export function createCLISessionManager(config?: Partial<CLISessionManagerConfig>): CLISessionManager {
  return new CLISessionManager(config);
}