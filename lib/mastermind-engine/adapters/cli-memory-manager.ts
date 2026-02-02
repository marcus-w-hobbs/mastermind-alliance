/**
 * CLI Memory Manager
 * 
 * A specialized memory manager for CLI environments that provides simple
 * file-based memory storage and retrieval, suitable for development and
 * testing purposes.
 * 
 * Features:
 * - Local file-based memory storage
 * - Simple text-based search
 * - Session-scoped memory contexts
 * - CLI-friendly debugging output
 * - No external dependencies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { MemoryManager, MastermindEngineError } from '../types';

/**
 * Configuration for CLI Memory Manager
 */
export interface CLIMemoryManagerConfig {
  /** Directory to store memory files */
  memoryDirectory: string;
  
  /** Enable verbose logging */
  verbose: boolean;
  
  /** Maximum number of memories to store per user */
  maxMemoriesPerUser: number;
  
  /** Maximum memory entry length */
  maxMemoryLength: number;
  
  /** Enable automatic cleanup of old memories */
  enableAutoCleanup: boolean;
  
  /** Age threshold for cleanup (milliseconds) */
  cleanupThresholdMs: number;
  
  /** Search similarity threshold (0-1) */
  searchThreshold: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: CLIMemoryManagerConfig = {
  memoryDirectory: path.join(os.tmpdir(), 'mastermind-cli-memory'),
  verbose: false,
  maxMemoriesPerUser: 1000,
  maxMemoryLength: 2000,
  enableAutoCleanup: true,
  cleanupThresholdMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  searchThreshold: 0.3
};

/**
 * Memory entry structure
 */
interface MemoryEntry {
  id: string;
  content: string;
  timestamp: number;
  userId: string;
  metadata?: {
    wordCount: number;
    keywords: string[];
    context?: string;
  };
}

/**
 * User memory collection
 */
interface UserMemoryCollection {
  userId: string;
  memories: MemoryEntry[];
  metadata: {
    createdAt: number;
    lastUpdated: number;
    totalEntries: number;
  };
}

/**
 * CLI Memory Manager Implementation
 */
export class CLIMemoryManager implements MemoryManager {
  private config: CLIMemoryManagerConfig;
  private userMemoryCache = new Map<string, UserMemoryCollection>();
  private isInitialized = false;

  constructor(config: Partial<CLIMemoryManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the memory manager
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create memory directory
      await fs.mkdir(this.config.memoryDirectory, { recursive: true });
      
      // Load existing memories
      await this.loadExistingMemories();
      
      // Setup cleanup if enabled
      if (this.config.enableAutoCleanup) {
        this.startPeriodicCleanup();
      }
      
      this.isInitialized = true;
      this.log('CLI Memory Manager initialized', {
        directory: this.config.memoryDirectory,
        autoCleanup: this.config.enableAutoCleanup
      });
      
    } catch (error) {
      throw new MastermindEngineError(
        'Failed to initialize CLI memory manager',
        'MEMORY_INIT_FAILED',
        false,
        { error }
      );
    }
  }

  /**
   * Add a message to memory
   */
  async addToMemory(userId: string, message: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // Validate input
      if (!message.trim() || message.length > this.config.maxMemoryLength) {
        this.log('Memory addition rejected', { 
          userId, 
          messageLength: message.length,
          reason: !message.trim() ? 'empty' : 'too_long'
        });
        return false;
      }

      // Get or create user memory collection
      let userMemory = this.userMemoryCache.get(userId);
      if (!userMemory) {
        userMemory = await this.loadUserMemory(userId);
        if (!userMemory) {
          userMemory = this.createUserMemoryCollection(userId);
        }
        this.userMemoryCache.set(userId, userMemory);
      }

      // Create memory entry
      const memoryEntry: MemoryEntry = {
        id: this.generateMemoryId(),
        content: message.trim(),
        timestamp: Date.now(),
        userId,
        metadata: {
          wordCount: message.trim().split(/\s+/).length,
          keywords: this.extractKeywords(message),
          context: 'cli_conversation'
        }
      };

      // Add to collection
      userMemory.memories.push(memoryEntry);
      userMemory.metadata.lastUpdated = Date.now();
      userMemory.metadata.totalEntries = userMemory.memories.length;

      // Enforce memory limits
      if (userMemory.memories.length > this.config.maxMemoriesPerUser) {
        userMemory.memories = userMemory.memories
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, this.config.maxMemoriesPerUser);
        userMemory.metadata.totalEntries = userMemory.memories.length;
      }

      // Persist to disk
      await this.saveUserMemory(userMemory);
      
      this.log('Added memory', { 
        userId, 
        memoryId: memoryEntry.id,
        wordCount: memoryEntry.metadata?.wordCount 
      });
      
      return true;
      
    } catch (error) {
      this.log('Failed to add memory', { userId, error });
      return false;
    }
  }

  /**
   * Search memories for relevant context
   */
  async searchMemories(userId: string, query: string, limit: number = 5): Promise<string | null> {
    await this.initialize();
    
    try {
      // Get user memory collection
      let userMemory = this.userMemoryCache.get(userId);
      if (!userMemory) {
        userMemory = await this.loadUserMemory(userId);
        if (!userMemory) {
          this.log('No memories found for user', { userId });
          return null;
        }
        this.userMemoryCache.set(userId, userMemory);
      }

      if (userMemory.memories.length === 0) {
        return null;
      }

      // Search for relevant memories
      const relevantMemories = this.findRelevantMemories(userMemory.memories, query, limit);
      
      if (relevantMemories.length === 0) {
        this.log('No relevant memories found', { userId, query });
        return null;
      }

      // Format results
      const memoryContext = relevantMemories
        .map((memory, index) => `Memory ${index + 1}: ${memory.content}`)
        .join('\n\n');
      
      this.log('Retrieved memories', { 
        userId, 
        query,
        foundCount: relevantMemories.length,
        totalMemories: userMemory.memories.length
      });
      
      return memoryContext;
      
    } catch (error) {
      this.log('Failed to search memories', { userId, query, error });
      return null;
    }
  }

  /**
   * Get user memory ID (returns the user ID for CLI implementation)
   */
  async getUserMemoryId(): Promise<string | null> {
    // For CLI, we can use a default user ID or the system username
    const defaultUserId = `cli_user_${os.userInfo().username}`;
    return defaultUserId;
  }

  /**
   * Get memory statistics for a user
   */
  async getMemoryStats(userId: string): Promise<{
    totalMemories: number;
    oldestMemory: number | null;
    newestMemory: number | null;
    averageWordCount: number;
  } | null> {
    await this.initialize();
    
    const userMemory = this.userMemoryCache.get(userId) || await this.loadUserMemory(userId);
    if (!userMemory || userMemory.memories.length === 0) {
      return null;
    }

    const memories = userMemory.memories;
    const totalWords = memories.reduce((sum, memory) => 
      sum + (memory.metadata?.wordCount || 0), 0);

    return {
      totalMemories: memories.length,
      oldestMemory: Math.min(...memories.map(m => m.timestamp)),
      newestMemory: Math.max(...memories.map(m => m.timestamp)),
      averageWordCount: Math.round(totalWords / memories.length)
    };
  }

  /**
   * Clear all memories for a user
   */
  async clearUserMemories(userId: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // Remove from cache
      this.userMemoryCache.delete(userId);
      
      // Remove from disk
      const filePath = this.getUserMemoryFilePath(userId);
      await fs.unlink(filePath);
      
      this.log('Cleared user memories', { userId });
      return true;
      
    } catch (error) {
      this.log('Failed to clear user memories', { userId, error });
      return false;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.userMemoryCache.clear();
    this.isInitialized = false;
    this.log('CLI Memory Manager destroyed');
  }

  // === PRIVATE HELPER METHODS ===

  private async loadExistingMemories(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.memoryDirectory);
      const memoryFiles = files.filter(file => file.endsWith('.json'));
      
      let loaded = 0;
      for (const file of memoryFiles) {
        const userId = path.basename(file, '.json');
        const userMemory = await this.loadUserMemory(userId);
        
        if (userMemory) {
          this.userMemoryCache.set(userId, userMemory);
          loaded++;
        }
      }
      
      if (loaded > 0) {
        this.log('Loaded existing memories', { userCount: loaded });
      }
      
    } catch (error) {
      this.log('Failed to load existing memories', { error });
    }
  }

  private createUserMemoryCollection(userId: string): UserMemoryCollection {
    return {
      userId,
      memories: [],
      metadata: {
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        totalEntries: 0
      }
    };
  }

  private getUserMemoryFilePath(userId: string): string {
    // Sanitize userId for filename
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.config.memoryDirectory, `${safeUserId}.json`);
  }

  private async loadUserMemory(userId: string): Promise<UserMemoryCollection | undefined> {
    try {
      const filePath = this.getUserMemoryFilePath(userId);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as UserMemoryCollection;
    } catch {
      return undefined;
    }
  }

  private async saveUserMemory(userMemory: UserMemoryCollection): Promise<void> {
    const filePath = this.getUserMemoryFilePath(userMemory.userId);
    await fs.writeFile(filePath, JSON.stringify(userMemory, null, 2));
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    // Remove common stop words
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'what', 'when', 'where']);
    
    return [...new Set(words.filter(word => !stopWords.has(word)))].slice(0, 10);
  }

  private findRelevantMemories(memories: MemoryEntry[], query: string, limit: number): MemoryEntry[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    
    // Score memories based on keyword overlap and recency
    const scoredMemories = memories.map(memory => {
      const memoryWords = memory.content.toLowerCase().split(/\s+/);
      const keywords = memory.metadata?.keywords || [];
      
      // Calculate word overlap score
      let score = 0;
      queryWords.forEach(queryWord => {
        if (memoryWords.some(word => word.includes(queryWord))) {
          score += 2;
        }
        if (keywords.some(keyword => keyword.includes(queryWord))) {
          score += 3;
        }
      });
      
      // Add recency bonus
      const ageMs = Date.now() - memory.timestamp;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 1 - (ageDays / 30)); // Bonus for memories less than 30 days old
      
      score += recencyScore;
      
      return { memory, score };
    });
    
    // Filter and sort by score
    return scoredMemories
      .filter(({ score }) => score >= this.config.searchThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ memory }) => memory);
  }

  private startPeriodicCleanup(): void {
    // Run cleanup every hour
    setInterval(async () => {
      try {
        await this.cleanupOldMemories();
      } catch (error) {
        this.log('Error during periodic cleanup', { error });
      }
    }, 60 * 60 * 1000);
  }

  private async cleanupOldMemories(): Promise<void> {
    const now = Date.now();
    let totalCleaned = 0;
    
    for (const userMemory of this.userMemoryCache.values()) {
      const originalCount = userMemory.memories.length;
      
      // Remove old memories
      userMemory.memories = userMemory.memories.filter(
        memory => (now - memory.timestamp) < this.config.cleanupThresholdMs
      );
      
      const cleaned = originalCount - userMemory.memories.length;
      
      if (cleaned > 0) {
        userMemory.metadata.lastUpdated = now;
        userMemory.metadata.totalEntries = userMemory.memories.length;
        await this.saveUserMemory(userMemory);
        totalCleaned += cleaned;
      }
    }
    
    if (totalCleaned > 0) {
      this.log('Cleaned up old memories', { count: totalCleaned });
    }
  }

  private log(message: string, data?: unknown): void {
    if (this.config.verbose) {
      console.log(`[CLIMemoryManager] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

/**
 * Factory function for creating CLI memory managers
 */
export function createCLIMemoryManager(config?: Partial<CLIMemoryManagerConfig>): CLIMemoryManager {
  return new CLIMemoryManager(config);
}