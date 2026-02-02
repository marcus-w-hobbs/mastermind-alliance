'use server';

/**
 * Refactored Mastermind Actions using the Extracted Engine
 * 
 * This file integrates the new mastermind engine with the existing Next.js server actions,
 * maintaining all existing API contracts while using the extracted core logic.
 */

import { NextRequest } from 'next/server';
import { ModelId } from "@/lib/models";
import { PersonaId } from '@/lib/personas/personas-registry';
import { 
  MastermindServerAdapter, 
  getServerSessionManager, 
  createServerMemoryManager 
} from '@/lib/mastermind-engine/server';

// Configuration
const DEFAULT_DIRECTOR_MODEL = 'gpt-4o-mini' as ModelId;

// Cache for server adapters by director model
const serverAdapters = new Map<ModelId, MastermindServerAdapter>();

function getServerAdapter(directorModelId: ModelId = DEFAULT_DIRECTOR_MODEL): MastermindServerAdapter {
  if (!serverAdapters.has(directorModelId)) {
    // Create memory manager if enabled
    const memoryManager = createServerMemoryManager({
      enabled: !!process.env.MEM0_API_KEY
    });

    const adapter = new MastermindServerAdapter(
      directorModelId,
      memoryManager
    );
    
    serverAdapters.set(directorModelId, adapter);
  }
  return serverAdapters.get(directorModelId)!;
}

/**
 * Handle SSE POST requests - process user messages and initialize sessions
 */
export async function mastermindSSEPOST(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const { message, modelName, selectedPersonas, directorModelName } = body;

    // Validation
    if (!message?.content || !modelName) {
      return new Response("Missing message content or modelName", { status: 400 });
    }

    if (!selectedPersonas || !Array.isArray(selectedPersonas) || selectedPersonas.length === 0) {
      return new Response("Missing or invalid selectedPersonas", { status: 400 });
    }

    // Use the server adapter with specified director model (or default)
    const directorModel = directorModelName as ModelId || DEFAULT_DIRECTOR_MODEL;
    const adapter = getServerAdapter(directorModel);
    const response = await adapter.handleSSEPost(body);

    return response;

  } catch (error: unknown) {
    console.error("[mastermind-actions] SSE POST error:", error);
    return new Response(
      `SSE Mastermind POST error: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 }
    );
  }
}

/**
 * Handle SSE GET requests - stream conversation responses
 */
export async function mastermindSSEGET(req: NextRequest): Promise<Response> {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const directorModelName = url.searchParams.get('directorModelName');

    if (!sessionId) {
      return new Response("Missing sessionId", { status: 400 });
    }

    // Use the server adapter with specified director model (or default)
    const directorModel = directorModelName as ModelId || DEFAULT_DIRECTOR_MODEL;
    const adapter = getServerAdapter(directorModel);
    const response = await adapter.handleSSEGet(req);

    return response;

  } catch (error: unknown) {
    console.error("[mastermind-actions] SSE GET error:", error);
    return new Response(
      `SSE Mastermind GET error: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 }
    );
  }
}

/**
 * Get session information (for debugging/monitoring)
 */
export async function getSessionInfo(sessionId: string): Promise<unknown> {
  try {
    const adapter = getServerAdapter();
    return adapter.getSessionInfo(sessionId);
  } catch (error) {
    console.error("[mastermind-actions] Failed to get session info:", error);
    return null;
  }
}

/**
 * Clean up a session
 */
export async function cleanupSession(sessionId: string): Promise<boolean> {
  try {
    const adapter = getServerAdapter();
    adapter.cleanupSession(sessionId);
    return true;
  } catch (error) {
    console.error("[mastermind-actions] Failed to cleanup session:", error);
    return false;
  }
}

/**
 * Get session statistics (for monitoring)
 */
export async function getSessionStats(): Promise<{
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
}> {
  try {
    const sessionManager = getServerSessionManager();
    return await sessionManager.getSessionStats();
  } catch (error) {
    console.error("[mastermind-actions] Failed to get session stats:", error);
    return {
      totalSessions: 0,
      totalMessages: 0,
      averageMessagesPerSession: 0
    };
  }
}

/**
 * Test memory connection (for health checks)
 */
export async function testMemoryConnection(): Promise<boolean> {
  try {
    const memoryManager = createServerMemoryManager();
    return await memoryManager.testConnection();
  } catch (error) {
    console.error("[mastermind-actions] Memory connection test failed:", error);
    return false;
  }
}

// Re-export types that the UI might need
export type { PersonaId, ModelId };