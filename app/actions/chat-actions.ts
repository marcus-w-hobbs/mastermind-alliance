'use server';

import { streamText } from "ai";
import { ModelId, getModelInstance } from "@/lib/models";
import { PersonaId, personasRegistry } from "@/lib/personas/personas-registry";
import { NextRequest } from 'next/server';
import { MastermindMessage, generateMastermindMessageId } from "@/types/mastermind-message";
import { featureFlags } from "@/lib/feature-flags";
import { addMemory, searchMemories } from "./mem0-actions";
import { Mem0Message } from '@/types/mem0-types';

interface SessionData {
  messages: MastermindMessage[];
  modelName: ModelId;
  personaId: PersonaId;
  timestamp: number;
};
const sessions = new Map<string, SessionData>();

// Clean up old sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.timestamp > 3600000) { // 1 hour
      sessions.delete(id);
    }
  }
}, 3600000);

// Create a new session or get existing one
function getOrCreateSession(sessionId: string | null, modelName: ModelId, personaId: PersonaId): SessionData {
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.timestamp = Date.now(); // Update timestamp
    session.modelName = modelName; // Update model name
    session.personaId = personaId; // Update persona
    return session;
  }

  // Create new session
  const newSession: SessionData = {
    messages: [],
    modelName,
    personaId,
    timestamp: Date.now()
  };
  
  return newSession;
}

export async function sseChatSSE(req: NextRequest): Promise<Response> {
  try {
    // Handle POST request to add a message
    if (req.method === 'POST') {
      const { sessionId, message, modelName, personaId } = await req.json();

      if (!message?.content || !modelName) {
        return new Response("Missing message content or modelName", { status: 400 });
      }

      // Get or create session
      const session = getOrCreateSession(sessionId, modelName, personaId);
      
      // Add the new user message with timestamp
      const userMessage: MastermindMessage = {
        id: generateMastermindMessageId(),
        role: "user",
        content: message.content,
        personaId,
        timestamp: Date.now()
      };
      session.messages.push(userMessage);

      // add user message to memory
      if (featureFlags.enableChatMem0) {
        try {
          const userMemoryMessage: Mem0Message = {
            role: "user", 
            content: message.content
          };
          await addMemory(featureFlags.chatMem0UserId, [userMemoryMessage]);
        } catch (error) {
          console.error("Error adding to memory:", error);
        }
      }
      
      // Generate a new session ID if needed
      const newSessionId = sessionId || generateMastermindMessageId();
      sessions.set(newSessionId, session);

      return new Response(JSON.stringify({ 
        sessionId: newSessionId
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle GET request for SSE stream
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response("Missing sessionId", { status: 400 });
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return new Response("Invalid or expired session", { status: 404 });
      }
      
      const { messages, modelName, personaId } = session;

      // Get the persona instance
      const persona = personasRegistry[personaId].instance;

      // Reset the persona's messages to the original system prompt
      persona.resetMessages();

      // Initialize persona with chat history
      for (const msg of messages) {
        if (msg.role === 'assistant') {
          persona.addAssistantMessage(msg.content);
        } else if (msg.role === 'user') {
          persona.addUserMessage(msg.content);
        }
      }

      // add relevant memories to the system prompt
      if (featureFlags.enableChatMem0) {
        try {
          // Get the last user message
          const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
          if (!lastUserMessage) {
            // No user messages found, skip memory retrieval
            console.log("No user messages found, skipping memory retrieval");
          } else {
            const memoriesStr = await searchMemories(featureFlags.chatMem0UserId, lastUserMessage.content);
            if (memoriesStr) {
              persona.addToSystemPrompt(`Here are some relevant user memories: ${memoriesStr}\n. Use these memories to inform your response.`);
              console.log("memories retrieved:\n", memoriesStr);
            } else {
              console.log("No memories found");
            }
          }
        } catch (error) {
          console.error("Error accessing memory:", error);
        }
      }

      // Get the model instance with fallback to default
      const model = getModelInstance(modelName);

      // Set up SSE stream
      const encoder = new TextEncoder();
      const transformStream = new TransformStream();
      const writable = transformStream.writable;
      const writer = writable.getWriter();
      let writerClosed = false;

      // Helper to send SSE events
      async function sendSSE(dataObj: Record<string, unknown>, eventType: string = "message") {
        const payload = [
          `event: ${eventType}`,
          `data: ${JSON.stringify(dataObj)}`,
          '',
          ''
        ].join('\n');
        
        if (!writerClosed) {
          await writer.write(encoder.encode(payload));
        }
      }

      // Helper to safely close the writer
      async function safeCloseWriter() {
        if (!writerClosed) {
          writerClosed = true;
          try {
            await writer.close();
          } catch (err) {
            console.debug("Error closing writer:", err);
          }
        }
      }

      // Stream the response
      (async () => {
        try {
          const { textStream } = await streamText({
            model,
            messages: persona.messages,
            // for some reason adding these parameters causes the LLM to hang
            //maxTokens: getMaxTokens(modelName),
            //temperature: 0.7,
            onStepFinish: ({ request }) => {
              // Log the actual processed prompt payload sent to the LLM
              console.log('DEBUG - ACTUAL LLM PAYLOAD:', JSON.stringify(request, null, 2));
            }
          });

          let responseText = '';
          for await (const chunk of textStream) {
            responseText += chunk;
            
            // Send partial SSE
            await sendSSE({
              type: "chunk",
              chunk,
              done: false
            });
          }

          // Add assistant message to session
          const assistantMessage: MastermindMessage = {
            id: generateMastermindMessageId(),
            role: "assistant",
            content: responseText,
            personaId,
            timestamp: Date.now()
          };
          session.messages.push(assistantMessage);

          /*
          // add assistant response to memory
          // actually, I don't think we wanna do this
          if (featureFlags.enableChatMem0) {
            try {
              const assistantMem0Message: Mem0Message = {
                role: "assistant", 
                content: responseText
              };
              await addMemory(featureFlags.chatMem0UserId, [assistantMem0Message]);
            } catch (error) {
              console.error("Error adding to memory:", error);
            }
          }
          */

          // Indicate completion
          await sendSSE({
            type: "end",
            chunk: "",
            done: true
          });

          // All done
          await sendSSE({ type: "complete", completed: true }, "complete");

        } catch (error: unknown) {
          console.error("[SSE Debug] Stream error:", error);
          await sendSSE({ 
            type: "error",
            error: true, 
            message: error instanceof Error ? error.message : String(error) 
          }, "error");
        } finally {
          await safeCloseWriter();
        }
      })();

      // Return the SSE response
      return new Response(transformStream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        }
      });
    }

    return new Response("Invalid request method", { status: 405 });
  } catch (error: unknown) {
    return new Response(`SSE Chat error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
} 