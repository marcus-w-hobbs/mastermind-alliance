'use server';

// agentic tools
import { createAISDKTools } from '@agentic/ai-sdk'
import { WeatherClient } from '@agentic/weather'
import { calculator } from '@agentic/calculator'
import { RedditClient } from '@agentic/reddit'
// Note that DuckDuckGo is returning empty results
//import { DuckDuckGoClient } from '@agentic/duck-duck-go'
// Note that BraveSearch is not properly implementing AIFunctionsProvider interface
//import { BraveSearchClient } from '@agentic/brave-search'
// Note that the RocketReach tool does not work with Next.js for some reason

// for internet search let's use Tavily directly
import { tavilyTools } from '@/lib/tools/tavily'

import { streamText } from "ai";
import { experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp';
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

export async function sseToolsSSE(req: NextRequest): Promise<Response> {
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
      if (featureFlags.enableToolsMem0) {
        try {
          const userMemoryMessage: Mem0Message = {
            role: "user", 
            content: message.content
          };
          await addMemory(featureFlags.toolsMem0UserId, [userMemoryMessage]);
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

      // INTERVIEW
      // Add tool fallback instructions to ensure responses even when tools fail
      persona.addToSystemPrompt(`
        IMPORTANT TOOL USAGE GUIDELINES:
        - You have access to tools (calculator, web search, weather, reddit, nps [national park service]) that can enhance your responses
        - Use tools when they would provide valuable, current information to answer the user's question
        - However, if tools fail or return empty results, you MUST still provide a helpful response based on your knowledge
        - Never leave the user with an empty response - always provide value even if tools don't work
        - If a tool search returns no results, acknowledge this and provide what information you can from your training
        - Be transparent about tool limitations while still being helpful
              `);
        
      // Initialize persona with chat history
      for (const msg of messages) {
        if (msg.role === 'assistant') {
          persona.addAssistantMessage(msg.content);
        } else if (msg.role === 'user') {
          persona.addUserMessage(msg.content);
        }
      }

      // add relevant memories to the system prompt
      if (featureFlags.enableToolsMem0) {
        try {
          // Get the last user message
          const lastUserMessage = messages.filter(msg => msg.role === 'user').pop();
          if (!lastUserMessage) {
            // No user messages found, skip memory retrieval
            console.log("No user messages found, skipping memory retrieval");
          } else {
            const memoriesStr = await searchMemories(featureFlags.toolsMem0UserId, lastUserMessage.content);
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

      // tools
      const weather = new WeatherClient();
      //const duckDuckGo = new DuckDuckGoClient();
      const reddit = new RedditClient();
      const tavilyApiKey = process.env.TAVILY_API_KEY;
      if (!tavilyApiKey) {
        console.error('No TAVILY API key provided');
        return new Response('No TAVILY API key provided', { status: 400 })
      }
      const tavily = tavilyTools({ apiKey: tavilyApiKey }, { excludeTools: []});

      // INTERVIEW
      // Initialize MCP tools
      let mcpClient = null;
      let mcpTools = {};
      try {
        mcpClient = await createMCPClient({
          transport: {
            type: 'sse',
            url: 'https://mcp-with-next-js-livid.vercel.app/sse',
          }
        });
        mcpTools = await mcpClient.tools();
        console.log(`✓ MCP tools enabled (${Object.keys(mcpTools).length} tools)`);
      } catch (error) {
        console.log('✗ MCP tools disabled (initialization failed):', error instanceof Error ? error.message : String(error));
      }

      // Combine tools properly - both return objects, not arrays
      const agenticTools = createAISDKTools(weather, /*duckDuckGo,*/ reddit, calculator);
      const allTools = { ...agenticTools, ...tavily, ...mcpTools };

      // Stream the response
      (async () => {
        try {
          let responseText = '';

          const result = await streamText({
            model,
            //maxTokens: getMaxTokens(session.modelName),
            tools: allTools,
            toolChoice: 'auto',
            temperature: 0,
            messages: persona.messages,
            // maxSteps is not supported in current types; remove or handle via onStepFinish if needed
          });

          // Stream the text as it comes
          try {
            for await (const chunk of result.textStream) {
              responseText += chunk;
              
              // Send partial SSE
              await sendSSE({
                type: "chunk",
                chunk,
                done: false
              });
            }
          } catch (streamError: unknown) {
            console.error('Error in text stream:', streamError);
            
            // Send error message to user
            const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
            const errorText = `[ERROR] ${errorMessage}`;
            responseText += errorText;
            
            await sendSSE({
              type: "chunk",
              chunk: errorText,
              done: false
            });
          }

          console.log('Total response text:', responseText);

          // Add assistant message to session (including any error messages)
          if (responseText) {
            const assistantMessage: MastermindMessage = {
              id: generateMastermindMessageId(),
              role: "assistant",
              content: responseText,
              personaId,
              timestamp: Date.now()
            };
            session.messages.push(assistantMessage);
          }

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
          
          // Clean up MCP client after streaming is complete
          if (mcpClient) {
            try {
              await mcpClient.close();
              console.log('MCP client closed successfully');
            } catch (error) {
              console.error('Error closing MCP client:', error);
            }
          }
        }
      })();

      // Return the SSE response
      const response = new Response(transformStream.readable, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        }
      });

      return response;
    }

    return new Response("Invalid request method", { status: 405 });
  } catch (error: unknown) {
    return new Response(`SSE Tools error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
} 