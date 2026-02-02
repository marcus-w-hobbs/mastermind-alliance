/**
 * Server Memory Manager for Mem0 Integration
 * 
 * This implements the MemoryManager interface for use with Next.js server actions.
 * It integrates with the existing Mem0 memory system for contextual conversations.
 */

import { MemoryManager, PersonaId } from "../types";
import { MastermindMessage } from "../../../types/mastermind-message";

// Local memory interfaces
interface MemoryContext {
  userId: string;
  sessionId: string;
  timestamp: number;
  personas?: PersonaId[];
}

interface MemorySearchResult {
  id: string;
  memory: string;
  score: number;
  metadata?: {
    [key: string]: unknown;
  };
}

// Mem0 integration types (matching existing implementation)
interface Mem0Message {
  role: "user" | "assistant";
  content: string;
}

interface Mem0SearchResult {
  id: string;
  memory: string;
  score: number;
  metadata?: {
    [key: string]: unknown;
  };
}

/**
 * Server Memory Manager Implementation using Mem0
 */
export class ServerMemoryManager implements MemoryManager {
  private isEnabled: boolean;
  private apiKey?: string;
  private baseUrl: string;

  constructor(options: {
    apiKey?: string;
    baseUrl?: string;
    enabled?: boolean;
  } = {}) {
    this.apiKey = options.apiKey || process.env.MEM0_API_KEY;
    this.baseUrl = options.baseUrl || "https://api.mem0.ai/v1";
    this.isEnabled = options.enabled !== false && !!this.apiKey;

    if (!this.isEnabled) {
      console.log("[ServerMemoryManager] Memory disabled - no API key provided");
    }
  }

  /**
   * Check if memory is enabled
   */
  async isMemoryEnabled(): Promise<boolean> {
    return this.isEnabled;
  }

  /**
   * Add messages to memory
   */
  async addMemory(context: MemoryContext, messages: MastermindMessage[]): Promise<void> {
    if (!this.isEnabled || !this.apiKey) {
      return;
    }

    try {
      // Convert mastermind messages to Mem0 format
      const mem0Messages: Mem0Message[] = messages
        .filter(msg => msg.role === "user" || msg.role === "assistant")
        .map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content
        }));

      if (mem0Messages.length === 0) {
        return;
      }

      // Add to Mem0
      const response = await fetch(`${this.baseUrl}/memories/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          messages: mem0Messages,
          user_id: context.userId,
          metadata: {
            sessionId: context.sessionId,
            personas: context.personas,
            timestamp: Date.now()
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mem0 API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log("[ServerMemoryManager] Added memory:", result);

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to add memory:", error);
      // Don't throw - memory failures shouldn't break conversations
    }
  }

  /**
   * Search memory for relevant context
   */
  async searchMemory(context: MemoryContext, query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!this.isEnabled || !this.apiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/search/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          query,
          user_id: context.userId,
          limit,
          metadata: {
            personas: context.personas
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mem0 search error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      const memories: Mem0SearchResult[] = result.memories || [];

      // Convert to our format
      return memories.map(memory => ({
        id: memory.id,
        memory: memory.memory,
        score: memory.score,
        metadata: memory.metadata || {}
      }));

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to search memory:", error);
      return [];
    }
  }

  /**
   * Get user's memory summary
   */
  async getMemorySummary(userId: string): Promise<string | null> {
    if (!this.isEnabled || !this.apiKey) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/?user_id=${userId}&limit=10`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return null;
      }

      const result = await response.json();
      const memories: Mem0SearchResult[] = result.memories || [];

      if (memories.length === 0) {
        return null;
      }

      // Create summary from recent memories
      const recentMemories = memories
        .slice(0, 5)
        .map(m => m.memory)
        .join(". ");

      return `Recent conversation context: ${recentMemories}`;

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to get memory summary:", error);
      return null;
    }
  }

  /**
   * Delete memory (for user privacy)
   */
  async deleteMemory(userId: string, memoryId?: string): Promise<boolean> {
    if (!this.isEnabled || !this.apiKey) {
      return false;
    }

    try {
      let url = `${this.baseUrl}/memories/`;
      if (memoryId) {
        url += `${memoryId}/`;
      } else {
        url += `?user_id=${userId}`;
      }

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });

      return response.ok;

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to delete memory:", error);
      return false;
    }
  }

  /**
   * Get memory analytics
   */
  async getMemoryAnalytics(userId: string): Promise<{
    totalMemories: number;
    memoryTypes: { [key: string]: number };
    recentActivity: { date: string; count: number }[];
  }> {
    if (!this.isEnabled || !this.apiKey) {
      return {
        totalMemories: 0,
        memoryTypes: {},
        recentActivity: []
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/?user_id=${userId}&limit=100`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        return {
          totalMemories: 0,
          memoryTypes: {},
          recentActivity: []
        };
      }

      const result = await response.json();
      const memories: Mem0SearchResult[] = result.memories || [];

      // Analyze memory types from metadata
      const memoryTypes: { [key: string]: number } = {};
      const activityByDate: { [key: string]: number } = {};

      for (const memory of memories) {
        // Count by persona if available
        if (memory.metadata?.personas) {
          const personas = memory.metadata.personas as string[];
          for (const persona of personas) {
            memoryTypes[persona] = (memoryTypes[persona] || 0) + 1;
          }
        }

        // Count by date
        if (memory.metadata?.timestamp && typeof memory.metadata.timestamp === 'number') {
          const date = new Date(memory.metadata.timestamp).toISOString().split('T')[0];
          activityByDate[date] = (activityByDate[date] || 0) + 1;
        }
      }

      // Convert activity to array format
      const recentActivity = Object.entries(activityByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7); // Last 7 days

      return {
        totalMemories: memories.length,
        memoryTypes,
        recentActivity
      };

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to get memory analytics:", error);
      return {
        totalMemories: 0,
        memoryTypes: {},
        recentActivity: []
      };
    }
  }

  /**
   * Test memory connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.apiKey) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/memories/?limit=1`, {
        headers: {
          "Authorization": `Bearer ${this.apiKey}`
        }
      });

      return response.ok;

    } catch (error) {
      console.error("[ServerMemoryManager] Connection test failed:", error);
      return false;
    }
  }

  // ===== MemoryManager Interface Implementation =====

  /**
   * Add a message to memory (MemoryManager interface)
   */
  async addToMemory(userId: string, message: string): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const context: MemoryContext = {
        userId,
        sessionId: `session_${Date.now()}`,
        timestamp: Date.now()
      };

      const mockMessage: MastermindMessage = {
        id: `msg_${Date.now()}`,
        role: "user",
        content: message,
        personaId: "user" as PersonaId,
        timestamp: Date.now(),
        isStreaming: false
      };

      await this.addMemory(context, [mockMessage]);
      return true;

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to add to memory:", error);
      return false;
    }
  }

  /**
   * Search memories for relevant context (MemoryManager interface)
   */
  async searchMemories(userId: string, query: string, limit: number = 5): Promise<string | null> {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const context: MemoryContext = {
        userId,
        sessionId: `search_${Date.now()}`,
        timestamp: Date.now()
      };

      const results = await this.searchMemory(context, query, limit);
      
      if (results.length === 0) {
        return null;
      }

      // Format results as a string
      const formattedMemories = results
        .map((result, index) => `Memory ${index + 1}: ${result.memory}`)
        .join('\n\n');

      return formattedMemories;

    } catch (error) {
      console.error("[ServerMemoryManager] Failed to search memories:", error);
      return null;
    }
  }

  /**
   * Get user memory ID (MemoryManager interface)
   */
  async getUserMemoryId(): Promise<string | null> {
    // For server implementation, we can generate a user ID based on session or user context
    // This would typically come from authentication context in a real application
    return `server_user_${Date.now()}`;
  }
}

/**
 * Factory function for creating server memory manager
 */
export function createServerMemoryManager(options?: {
  apiKey?: string;
  baseUrl?: string;
  enabled?: boolean;
}): ServerMemoryManager {
  return new ServerMemoryManager(options);
}

/**
 * Get memory manager configured for production
 */
export function getProductionMemoryManager(): ServerMemoryManager {
  return createServerMemoryManager({
    enabled: !!process.env.MEM0_API_KEY
  });
}