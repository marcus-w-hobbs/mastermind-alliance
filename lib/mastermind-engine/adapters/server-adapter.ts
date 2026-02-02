/**
 * Server Adapter for Next.js Integration
 * 
 * This adapter integrates the mastermind engine with Next.js server actions and SSE endpoints.
 * It maintains all existing API contracts while using the extracted engine for core logic.
 */

import { NextRequest } from "next/server";
import { MastermindConversationEngine } from "../conversation-engine";
import { PersonaId } from "../../../lib/personas/personas-registry";
import { ModelId } from "../../../lib/models";
import { MastermindMessage } from "../../../types/mastermind-message";
import { ConversationState, ConversationStreamChunk, ConversationStreamHandler } from "../types";
import { generateMastermindMessageId } from "../../../types/mastermind-message";
import { ServerSessionManager as ServerSessionManagerImpl } from "./server-session-manager";
import { ServerMemoryManager } from "./server-memory-manager";

// Server-specific types
export interface ServerUserMessage {
  content: string;
}

export interface ServerSessionResponse {
  sessionId: string;
  timestamp: number;
}

export interface SSEEventData {
  type: 'start' | 'chunk' | 'end' | 'complete' | 'error';
  data: unknown;
}


/**
 * Main Server Adapter for Mastermind Engine
 */
export class MastermindServerAdapter {
  private engine: MastermindConversationEngine;
  private sessionManager: ServerSessionManagerImpl;

  constructor(directorModelName: ModelId, memoryManager?: ServerMemoryManager) {
    this.sessionManager = new ServerSessionManagerImpl();
    this.engine = new MastermindConversationEngine(
      { directorModelId: directorModelName },
      this.sessionManager,
      memoryManager
    );
  }

  /**
   * Handle SSE POST requests - process user messages
   */
  async handleSSEPost(body: {
    sessionId?: string;
    message?: { content: string };
    modelName?: ModelId;
    selectedPersonas?: PersonaId[];
    userMemoryId?: string;
  }): Promise<Response> {
    try {
      const { sessionId, message, modelName, selectedPersonas, userMemoryId } = body;

      // Validation
      if (!message?.content || !modelName) {
        return new Response("Missing message content or modelName", { status: 400 });
      }

      if (!selectedPersonas || !Array.isArray(selectedPersonas) || selectedPersonas.length === 0) {
        return new Response("Missing or invalid selectedPersonas", { status: 400 });
      }

      // Create or get session
      let actualSessionId: string;
      if (!sessionId || !(await this.sessionManager.sessionExists(sessionId))) {
        const sessionState = await this.sessionManager.createSession({
          modelId: modelName,
          selectedPersonas,
          userMemoryId,
          enableMemory: !!userMemoryId
        });
        actualSessionId = sessionState.sessionId;
      } else {
        actualSessionId = sessionId;
      }

      // Add user message to session
      const userMessage: MastermindMessage = {
        id: generateMastermindMessageId(),
        role: "user",
        content: message.content.trim(),
        personaId: "user" as PersonaId,
        timestamp: Date.now(),
        isStreaming: false
      };

      await this.sessionManager.addMessage(actualSessionId, userMessage);

      // Return session info
      const response: ServerSessionResponse = {
        sessionId: actualSessionId,
        timestamp: Date.now()
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      console.error("[server-adapter] SSE POST error:", error);
      return new Response(
        `SSE Mastermind POST error: ${error instanceof Error ? error.message : String(error)}`,
        { status: 500 }
      );
    }
  }

  /**
   * Handle SSE GET requests - stream persona responses
   */
  async handleSSEGet(req: NextRequest): Promise<Response> {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('sessionId');

      if (!sessionId) {
        return new Response("Missing sessionId", { status: 400 });
      }

      const session = await this.sessionManager.getSession(sessionId);
      if (!session) {
        return new Response("Session not found", { status: 404 });
      }

      // Create streaming response
      const stream = this.createSSEStream(sessionId);

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });

    } catch (error: unknown) {
      console.error("[server-adapter] SSE GET error:", error);
      return new Response(
        `SSE Mastermind GET error: ${error instanceof Error ? error.message : String(error)}`,
        { status: 500 }
      );
    }
  }

  /**
   * Create SSE stream for conversation responses
   */
  private createSSEStream(sessionId: string): ReadableStream {
    const encoder = new TextEncoder();
    const engine = this.engine;
    
    // Track controller state to prevent sending events after close
    let isControllerClosed = false;
    let hasReceivedComplete = false;
    let shouldStopStreaming = false;

    return new ReadableStream({
      async start(controller) {
        // Wrapped sendSSEEvent that checks controller state
        const safeSendSSEEvent = (type: string, data: unknown): void => {
          if (isControllerClosed || shouldStopStreaming) {
            console.log("[server-adapter] ⚠️ Skipping SSE event (controller closed or streaming stopped):", type);
            return;
          }
          
          try {
            const jsonData = JSON.stringify(data);
            const event = `event: ${type}\ndata: ${jsonData}\n\n`;
            console.log("[server-adapter] 🌊 SSE Event:", type, "data size:", jsonData.length);
            
            // Ensure we can encode without errors
            const encoded = encoder.encode(event);
            controller.enqueue(encoded);
            
            // If this is a complete event with a failure reason, stop streaming
            if (type === 'complete') {
              const completeData = data as { reason?: string };
              if (completeData.reason && completeData.reason.includes('failure')) {
                console.log("[server-adapter] 🛑 Stopping stream due to failures");
                shouldStopStreaming = true;
              }
            }
          } catch (error) {
            console.error("[server-adapter] ❌ Error sending SSE event:", error, type, data);
            // Don't throw, just log the error
          }
        };

        try {
          console.log("[server-adapter] 🚀 Starting SSE stream for session:", sessionId);
          
          // Create a streaming handler for the conversation engine
          const streamHandler: ConversationStreamHandler = {
            async onChunk(chunk: ConversationStreamChunk): Promise<void> {
              // Skip if controller is already closed or streaming should stop
              if (isControllerClosed || shouldStopStreaming) {
                console.log("[server-adapter] ⚠️ Skipping chunk (controller closed or stopped):", chunk.type);
                return;
              }

              console.log("[server-adapter] 📦 Stream chunk received:", chunk.type, "personaId:", chunk.personaId);
              
              switch (chunk.type) {
                case 'start':
                  // Send director insight and persona start event
                  console.log("[server-adapter] 🎬 Sending start event for persona:", chunk.personaId);
                  safeSendSSEEvent('start', {
                    personaId: chunk.personaId,
                    personaName: chunk.personaId,
                    directorInsight: chunk.directorInsight || {
                      significance: 'Evaluating significance...',
                      opportunities: [],
                      rationale: 'No reasoning available',
                      goal: 'Continue conversation',
                      direction: 'Respond thoughtfully',
                      reasoning: 'Director analysis complete'
                    }
                  });
                  break;
                  
                case 'chunk':
                  console.log("[server-adapter] 💬 Sending chunk for persona:", chunk.personaId, "content length:", chunk.chunk?.length);
                  safeSendSSEEvent('chunk', {
                    personaId: chunk.personaId,
                    content: chunk.chunk || ''
                  });
                  break;
                  
                case 'end':
                  console.log("[server-adapter] ✅ Persona finished:", chunk.personaId);
                  safeSendSSEEvent('end', {
                    personaId: chunk.personaId,
                    response: {
                      content: chunk.metadata?.finalContent || '',
                      attempts: 1,
                      responseTime: 0,
                      wasFallback: false
                    }
                  });
                  break;
                  
                case 'complete':
                  // Only send the first complete event
                  if (!hasReceivedComplete) {
                    hasReceivedComplete = true;
                    console.log("[server-adapter] 🏁 Conversation complete");
                    safeSendSSEEvent('complete', {
                      totalResponses: chunk.completion?.totalResponses || 0,
                      sessionId: sessionId,
                      completed: chunk.completion?.completed || true,
                      reason: chunk.completion?.reason || 'Conversation ended'
                    });
                  } else {
                    console.log("[server-adapter] ⚠️ Skipping duplicate complete event");
                  }
                  break;
                  
                case 'error':
                  console.error("[server-adapter] ❌ Stream error:", chunk.error);
                  safeSendSSEEvent('error', {
                    error: chunk.error?.message || 'Unknown error'
                  });
                  break;
              }
            },
            
            async onComplete(finalState: ConversationState): Promise<void> {
              console.log("[server-adapter] ✅ Stream completed, final state:", {
                messages: finalState.messages.length,
                responseCount: finalState.responseCount
              });
            },
            
            async onError(error: Error): Promise<void> {
              if (!isControllerClosed) {
                console.error("[server-adapter] ❌ Stream handler error:", error);
                safeSendSSEEvent('error', {
                  error: error.message
                });
              }
            }
          };

          // Use the streaming response method
          console.log("[server-adapter] 🌊 Starting streaming response generation");
          await engine.generateStreamingResponse(sessionId, streamHandler);
          
          console.log("[server-adapter] ✅ Streaming completed successfully");

        } catch (error) {
          console.error("[server-adapter] Stream error:", error);
          if (!isControllerClosed) {
            try {
              const jsonData = JSON.stringify({
                error: error instanceof Error ? error.message : String(error)
              });
              const event = `event: error\ndata: ${jsonData}\n\n`;
              controller.enqueue(encoder.encode(event));
            } catch (sseError) {
              console.error("[server-adapter] Failed to send stream error event:", sseError);
            }
          }
        } finally {
          console.log("[server-adapter] 🔚 Closing SSE stream");
          isControllerClosed = true; // Mark as closed before attempting to close
          try {
            controller.close();
          } catch (closeError) {
            // This is expected if already closed
            console.log("[server-adapter] Controller already closed:", closeError);
          }
        }
      }
    });
  }


  /**
   * Get session info (for debugging/monitoring)
   */
  async getSessionInfo(sessionId: string): Promise<ConversationState | null> {
    return await this.sessionManager.getSession(sessionId);
  }

  /**
   * Clean up session
   */
  async cleanupSession(sessionId: string): Promise<void> {
    await this.sessionManager.deleteSession(sessionId);
  }
}