'use server';

import { ModelId, getModelInstance } from "@/lib/models";
import { PersonaFactory } from "@/lib/personas/persona-factory";
import { Persona } from "@/lib/personas/persona";
import { NextRequest } from 'next/server';
import { PersonaId, personasRegistry } from '@/lib/personas/personas-registry';
import { MastermindMessage, generateMastermindMessageId } from '@/types/mastermind-message';
import { addMemory, searchMemories } from "./mem0-actions";
import { featureFlags } from "@/lib/feature-flags";
import { Mem0Message } from '@/types/mem0-types';
import { getCurrentMemoryUserId } from '@/lib/auth-utils';
import { generatePersonaResponseWithRetry, getDirectorDecision, findPersonaById } from './mastermind-persona-actions';

//const directorDecisionModelName = 'claude-3-5-sonnet-20240620' as ModelId;
//const directorDecisionModelName = 'claude-3-5-haiku-20241022' as ModelId;
const directorDecisionModelName = 'gpt-4o-mini' as ModelId;

// Format persona names into a readable list, excluding a specific index
function formatPersonaNames(personas: Persona[], excludeIndex: number = -1): string {
  if (personas.length <= 1) 
    return "";
  
  const filteredPersonas = personas.filter((_, i) => i !== excludeIndex);
  if (filteredPersonas.length <= 1) 
    return "";
  
  const lastPersona = filteredPersonas[filteredPersonas.length - 1].name;
  const otherPersonas = filteredPersonas.slice(0, filteredPersonas.length - 1).map(p => p.name);
  
  return `${otherPersonas.join(", ")}, and ${lastPersona}`;
}

// Simple in-memory session store...this will eventually be removed in favor of a database
interface SessionData {
  messages: MastermindMessage[]; // messages displayed in the UI from the user's perspective
  modelName: ModelId;
  selectedPersonas: PersonaId[]; // each persona has a message history from it's perspective--not what's shown in the UI
  timestamp: number;
  userMemoryId?: string; // User-specific memory ID for Mem0
  consecutiveFailures?: number; // Track consecutive response generation failures
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

// Modify getOrCreateSession to handle ID generation and storage
function getOrCreateSession(sessionId: string | null, modelName: ModelId, selectedPersonas: PersonaId[]): { session: SessionData, sessionId: string } {
  // If valid sessionId provided and session exists, return it
  if (sessionId && sessions.has(sessionId)) {
    const session = sessions.get(sessionId)!;
    session.timestamp = Date.now(); // Update timestamp
    session.modelName = modelName; // Update model name
    session.selectedPersonas = selectedPersonas; // Update selected personas
    return { session, sessionId };
  }

  // Create new session with a new ID
  const newSessionId = sessionId || generateMastermindMessageId();
  const newSession: SessionData = {
    messages: [],
    modelName,
    selectedPersonas,
    timestamp: Date.now()
  };
  
  // Store the session
  sessions.set(newSessionId, newSession);
  
  return { session: newSession, sessionId: newSessionId };
}

// Helper function to get user-specific memory ID
async function getUserMemoryId(): Promise<string | null> {
  return getCurrentMemoryUserId();
}

/*
  POST endpoint: Used to send user messages to the server
  Takes input message, selected personas, and model preferences
  Creates or retrieves a session
  Stores the user message in session storage
  Returns a session ID for subsequent communication
  Used in page.tsx::handleSubmit() where it calls fetch('/api/mastermind-sse', { method: 'POST', ... })
*/
export async function mastermindSSEPOST(req: NextRequest) : Promise<Response> {
  try {

    const { sessionId, message, modelName, selectedPersonas } = await req.json();

    if (!message?.content || !modelName) {
      return new Response("Missing message content or modelName", { status: 400 });
    }

    if (!selectedPersonas || !Array.isArray(selectedPersonas) || selectedPersonas.length === 0) {
      return new Response("No personas selected", { status: 400 });
    }

    // Get or create session with proper ID handling
    const { session, sessionId: validSessionId } = getOrCreateSession(sessionId, modelName, selectedPersonas);
    
    // Store user memory ID in session for later use
    const userMemoryId = await getUserMemoryId();
    if (userMemoryId) {
      session.userMemoryId = userMemoryId;
    }
    
    // Add the new user message with timestamp
    const userMessage: MastermindMessage = {
      id: generateMastermindMessageId(),
      role: "user",
      content: message.content,
      personaId: "user",
      timestamp: Date.now()
    };
    session.messages.push(userMessage);

    return new Response(JSON.stringify({ 
      sessionId: validSessionId,
      timestamp: userMessage.timestamp 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: unknown) {
    return new Response(`SSE Mastermind POST error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}


/*
  GET endpoint: Used to establish Server-Sent Events (SSE) connection
  Takes a session ID as query parameter
  Sets up a persistent connection for streaming AI responses
  Processes the user message through multiple persona models
  Streams back chunks of AI-generated text as they're created
  Used after POST via new EventSource('/api/mastermind-sse?sessionId=${newSessionId}')
*/
export async function mastermindSSEGET(req: NextRequest) : Promise<Response> {
  console.log('🚀 mastermindSSEGET: Starting SSE GET request');
  
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    console.log('🔑 Session ID:', sessionId);
    
    if (!sessionId) {
      console.error('❌ No sessionId provided');
      return new Response("Missing sessionId", { status: 400 });
    }

    const session = sessions.get(sessionId);
    console.log('📦 Session found:', session ? '✅ Yes' : '❌ No');
    console.log('📊 Available sessions:', Array.from(sessions.keys()));
    
    if (!session) {
      console.error('❌ Invalid or expired session');
      return new Response("Invalid or expired session", { status: 404 });
    }

    console.log('💬 Session messages count:', session.messages.length);
    console.log('👥 Selected personas:', session.selectedPersonas);

    // Check if the last message was from the user
    const lastUserMessage = session.messages[session.messages.length - 1];
    console.log('🔍 Last message:', lastUserMessage ? `${lastUserMessage.role} - ${lastUserMessage.content.substring(0, 50)}...` : 'None');
    
    if (!lastUserMessage || lastUserMessage.role !== "user") {
        console.warn('⚠️  No user message to process, returning empty response');
        // if there's no user message, we just return an empty SSE
        return new Response("No new user message to process.", { status: 200 });
    }
    
    // Create the set of personas from the provided IDs
    console.log('🎭 Creating personas from IDs:', session.selectedPersonas);
    const personas = session.selectedPersonas.map(id => PersonaFactory.getPersonaById(id));
    console.log('✨ Created personas:', personas.map(p => p.name).join(', '));
    
    if (personas.length === 0) {
      console.error('❌ No valid personas found');
      return new Response("No valid personas found", { status: 400 });
    }

    // add user message to memory
    if (featureFlags.enableMastermindMem0) {
      console.log('🧠 Memory feature enabled, adding user message to memory');
      try {
        const userMemoryId = session.userMemoryId || await getUserMemoryId();
        console.log('🆔 User memory ID:', userMemoryId);
        
        if (userMemoryId) {
          const userMemoryMessage: Mem0Message = {
            role: "user", 
            content: lastUserMessage.content
          };
          console.log('💾 Adding memory:', userMemoryMessage.content.substring(0, 50) + '...');
          const result = await addMemory(userMemoryId, [userMemoryMessage], false); // false = use raw user ID
          
          if (!result.success) {
            console.error("❌ [Mem0] Failed to add memory:", result.error);
          } else {
            console.log('✅ [Mem0] Memory added successfully');
          }
        } else {
          console.error("❌ [Mem0] No user ID available for memory storage");
        }
      } catch (error) {
        console.error("❌ [Mem0] Error adding to memory:", error);
      }
    } else {
      console.log('🔒 Memory feature disabled');
    }
    
    // Initialize each persona with knowledge of the others, and memories
    console.log('🎬 Initializing personas with roundtable context');
    for (let i = 0; i < personas.length; i++) {
      const currentPersona = personas[i];
      console.log(`  👤 Initializing ${currentPersona.name}`);
      currentPersona.resetMessages(); // build the persona's message history from scratch
      const otherPersonas = formatPersonaNames(personas, i);
      if (otherPersonas) {
        const roundtableContext =
          `You are engaged in a roundtable discussion with the user, ${otherPersonas}.
            Build upon the conversation adding value from your unique perspective.
            If you respond to a member of the roundtable address them by name.
            Do not break character.`;
        currentPersona.addToSystemPrompt(roundtableContext);
        console.log(`    ✅ Added roundtable context with: ${otherPersonas}`);
      } else {
        console.log("    ⚠️  No other personas found, skipping roundtable context");
      }
      currentPersona.addToSystemPrompt(`Keep your response thoughtful but reasonably concise - aim for 1 short paragraph.\n`);
      console.log('    📏 Added response guidance');
      /*
      const provactive =
        `Identify the single most dangerous assumption we're making in this systematic-yet-creative approach. 
          Then, for that assumption, explain how it could lead us down the wrong path—technically, ethically, or from a market standpoint. 
          Propose one radical method to test or break that assumption before we waste more time going in the wrong direction.  Do not break character.`;
      currentPersona.addToSystemPrompt(provactive);
      */
    }

    // add relevant memories to the system prompt
    if (featureFlags.enableMastermindMem0) {
      console.log('🧠 Retrieving memories for context');
      try {
        // Get the last user message
        const lastUserMessage = session.messages.filter(msg => msg.role === 'user').pop();
        if (!lastUserMessage) {
          // No user messages found, skip memory retrieval
          console.log("⚠️  [Mem0] No user messages found, skipping memory retrieval");
        } else {
          const userMemoryId = session.userMemoryId || await getUserMemoryId();
          if (userMemoryId) {
            console.log('🔍 Searching memories for:', lastUserMessage.content.substring(0, 50) + '...');
            const startTime = performance.now();
            const memoriesStr = await searchMemories(userMemoryId, lastUserMessage.content, 10, false); // false = use raw user ID
            const endTime = performance.now();
            if (memoriesStr) {
              for (const persona of personas) {
                persona.addToSystemPrompt(`Here are some relevant user memories: ${memoriesStr}\n. Use these memories to inform your response.`);
              }
              console.log(`✅ [Mem0] memories retrieved in ${(endTime - startTime).toFixed(2)}ms:\n`, memoriesStr);
            } else {
              console.log("📭 [Mem0] No memories found for user");
            }
          } else {
            console.error("❌ [Mem0] No user ID available for memory retrieval");
          }
        }
      } catch (error) {
        console.error("❌ [Mem0] Error accessing memory:", error);
      }
    }

    // Rebuild message history from the perspective of each persona
    console.log('🏗️  Rebuilding message history for each persona');
    console.log(`  📜 Processing ${session.messages.length} messages`);
    
    const startTime = performance.now();
    let messageCount = 0;
    
    for (const msg of session.messages) {
      messageCount++;
      const messageStartTime = performance.now();
      console.log(`  📨 Processing message ${messageCount}/${session.messages.length}: ${msg.role} from ${msg.personaId || 'user'}`);
      
      if (msg.role === "assistant" && msg.personaId) {
        for (const persona of personas) {
          // Get the persona ID from the registry
          const personaId = Object.entries(personasRegistry)
            .find(([, meta]) => meta.instance === persona)?.[0] as PersonaId;
          // if this persona is the one that spoke it, add it as an assistant message
          if (personaId === msg.personaId) {
            persona.addAssistantMessage(msg.content);
            console.log(`    ➡️  ${persona.name} sees own message as assistant`);
          } else {
            // otherwise, this persona sees it as a user message and we prefix it with the name of the persona that spoke it
            const speakingPersona = personasRegistry[msg.personaId as PersonaId];
            persona.addUserMessage(`${speakingPersona.name}: ${msg.content}`);
            console.log(`    ➡️  ${persona.name} sees ${speakingPersona.name}'s message as user`);
          }
        }
      } else if (msg.role === "user") {
        // user messages go to all personas as user messages
        for (const persona of personas) {
          persona.addUserMessage(msg.content);
        }
        console.log(`    ➡️  All personas received user message`);
      }
      
      const messageEndTime = performance.now();
      console.log(`    ⏱️  Message processed in ${(messageEndTime - messageStartTime).toFixed(2)}ms`);
    }
    
    const endTime = performance.now();
    console.log(`✅ Message history rebuilt in ${(endTime - startTime).toFixed(2)}ms (${messageCount} messages)`);

    // Prep the SSE stream
    console.log('🌊 Preparing SSE stream');
    const encoder = new TextEncoder();
    const transformStream = new TransformStream();
    const writable = transformStream.writable;
    const writer = writable.getWriter();

    // Helper to send SSE events easily
    async function sendSSE(dataObj: Record<string, unknown>, eventType: string = "message") {
      if (eventType !== 'message' || dataObj.type !== 'chunk') {
        console.log(`  📤 Sending SSE event: ${eventType}`, dataObj.type || 'data');
      }
      
      // Add chunk-level debugging for potential content issues
      if (dataObj.type === 'chunk' && dataObj.chunk) {
        const chunkStr = String(dataObj.chunk);
        if (chunkStr.length === 0) {
          console.warn(`⚠️ Empty chunk detected for persona ${dataObj.personaId}`);
        }
      }
      
      // SSE format requires each field to be on its own line with "data: " prefix
      // The message must be terminated with two newlines
      const payload = [
        `event: ${eventType}`,
        `data: ${JSON.stringify(dataObj)}`,
        '',
        ''
      ].join('\n');
      
      await writer.write(encoder.encode(payload));
    }

    // Get the model instance with fallback to default
    console.log('🤖 Getting model instance:', session.modelName);
    const model = getModelInstance(session.modelName);

   // For each persona in sequence, stream partial chunks
(async () => {
  console.log('🎯 Starting async streaming loop');
  
  try {
    let responseCount = 0;
    const maxResponses = personas.length * 2; // Safety limit
    let conversationEndReason = "Max responses reached"; // Default reason
    const recentFailedPersonas: PersonaId[] = []; // Track personas that failed recently
    let lastSuccessfulSpeakerId: PersonaId | undefined = undefined; // Track last successful speaker
    
    console.log(`📊 Max responses allowed: ${maxResponses}`);

    // DIRECTOR-ORCHESTRATED CONVERSATION LOOP
    while (responseCount < maxResponses) {
      console.log(`\n🔄 === ROUND ${responseCount + 1} ===`);
      
      // Get director's decision on who should speak next
      console.log('🎬 Asking director for next speaker...');
      console.log(`📊 Failed personas: ${recentFailedPersonas.join(', ') || 'None'}`);
      console.log(`🎤 Last successful speaker: ${lastSuccessfulSpeakerId || 'None'}`);
      
      const decision = await getDirectorDecision(
        session.messages, 
        personas, 
        responseCount, 
        directorDecisionModelName,
        recentFailedPersonas,
        lastSuccessfulSpeakerId
      );
      console.log('🎯 Director decision:', {
        nextSpeaker: decision.choreography.nextSpeaker,
        shouldContinue: decision.shouldContinue,
        rationale: decision.choreography.rationale
      });
      
      // Check if conversation should continue
      if (!decision.shouldContinue) {
        console.log('🛑 Director decided to end conversation:', decision.metadata.reasoning);
        conversationEndReason = "Director ended conversation";
        break;
      }

      // Find the chosen persona
      const chosenPersona = await findPersonaById(decision.choreography.nextSpeaker, personas);
      console.log('🔍 Finding persona:', decision.choreography.nextSpeaker, '→', chosenPersona?.name || 'NOT FOUND');
      
      if (!chosenPersona) {
        console.error(`❌ Could not find persona: ${decision.choreography.nextSpeaker}`);
        break;
      }

      const personaId = decision.choreography.nextSpeaker;

      // Inject director's guidance into persona's system prompt
      console.log(`💉 Injecting director guidance into ${chosenPersona.name}'s prompt`);
      const directorGuidance = `
--- DIRECTOR'S ANALYSIS ---
Current Significance: ${decision.analysis.significance}
Your Mission: ${decision.choreography.direction}
Conversational Goal: ${decision.choreography.conversationalGoal}
Rationale for your selection: ${decision.choreography.rationale}

Please respond thoughtfully to fulfill this mission while staying true to your character.
--- END DIRECTOR'S GUIDANCE ---
`;

      // Temporarily add director guidance
      chosenPersona.addToSystemPrompt(directorGuidance);
      
      // Send initial message for this persona
      console.log(`📢 Sending start event for ${chosenPersona.name}`);
      await sendSSE({ 
        type: "start",
        personaId,
        chunk: "", 
        done: false,
        directorInsight: {
          rationale: decision.choreography.rationale,
          goal: decision.choreography.conversationalGoal,
          reasoning: decision.metadata.reasoning,
          significance: decision.analysis.significance,
          opportunities: decision.analysis.opportunities,
          direction: decision.choreography.direction
        }
      });

      console.log(`🔮 Starting text stream for ${chosenPersona.name}`);

      // Generate response with retry logic
      const { success, responseText, attempts } = await generatePersonaResponseWithRetry(
        chosenPersona, 
        model
      );
      
      if (!success) {
        console.error(`❌ Failed to generate response for ${chosenPersona.name} after ${attempts} attempts`);
        
        // Track this persona as recently failed
        if (!recentFailedPersonas.includes(personaId)) {
          recentFailedPersonas.push(personaId);
          console.log(`🚫 Added ${chosenPersona.name} to failed personas list: ${recentFailedPersonas.join(', ')}`);
        }
        
        // Keep only last 3 failed personas to allow recovery
        if (recentFailedPersonas.length > 3) {
          const removed = recentFailedPersonas.shift();
          console.log(`🔄 Removed ${removed} from failed personas list (max reached)`);
        }
        
        // Send error notification to client
        await sendSSE({
          type: "error",
          personaId,
          error: true,
          message: `Failed to generate response after ${attempts} attempts`,
          recoverable: true
        });
        
        // Check if we should continue or abort
        const consecutiveFailures = session.consecutiveFailures || 0;
        session.consecutiveFailures = consecutiveFailures + 1;
        
        if (session.consecutiveFailures >= 2) {
          console.error('🛑 Too many consecutive failures, ending conversation');
          await sendSSE({ 
            type: "complete", 
            completed: true,
            totalResponses: responseCount,
            reason: "Too many consecutive failures",
            error: true
          }, "complete");
          break;
        }
        
        // Skip to next persona
        console.log('⏭️ Skipping to next persona...');
        continue;
      } else {
        // Reset consecutive failures on success
        session.consecutiveFailures = 0;
        
        // Track successful speaker
        lastSuccessfulSpeakerId = personaId;
        console.log(`✅ Successful response from ${chosenPersona.name}, tracking as last speaker`);
        
        // Remove this persona from failed list if they were on it (redemption)
        const failedIndex = recentFailedPersonas.indexOf(personaId);
        if (failedIndex !== -1) {
          recentFailedPersonas.splice(failedIndex, 1);
          console.log(`🎉 ${chosenPersona.name} redeemed! Removed from failed personas list`);
        }
      }
      
      // Stream the response to client in chunks
      console.log(`📤 Streaming response for ${chosenPersona.name} (${responseText.length} chars)`);
      let chunkCount = 0;
      let totalCharsSent = 0;
      const chunkSize = 20; // Send chunks of 20 characters at a time
      
      for (let i = 0; i < responseText.length; i += chunkSize) {
        const chunk = responseText.slice(i, Math.min(i + chunkSize, responseText.length));
        chunkCount++;
        totalCharsSent += chunk.length;
        
        // Debug logging for potentially problematic chunks
        if (chunk.length === 0) {
          console.warn(`⚠️ Zero-length chunk detected at position ${i} for ${chosenPersona.name}`);
        }
        if (i + chunkSize >= responseText.length) {
          console.log(`📝 Final chunk ${chunkCount} for ${chosenPersona.name}: "${chunk}" (${chunk.length} chars)`);
        }
        
        await sendSSE({
          type: "chunk",
          personaId,
          chunk,
          done: false
        });
        
        // Small delay for better streaming UX
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Verify all content was sent
      if (totalCharsSent !== responseText.length) {
        console.error(`❌ Content length mismatch! Expected: ${responseText.length}, Sent: ${totalCharsSent}`);
        console.error(`Missing content: "${responseText.slice(totalCharsSent)}"`);
        
        // Send any missing content as a final chunk
        if (totalCharsSent < responseText.length) {
          const missingContent = responseText.slice(totalCharsSent);
          await sendSSE({
            type: "chunk",
            personaId,
            chunk: missingContent,
            done: false
          });
          totalCharsSent += missingContent.length;
          console.log(`🔧 Sent missing content: "${missingContent}"`);
        }
      }
      
      console.log(`✅ ${chosenPersona.name} streaming complete! Chunks: ${chunkCount}, Length sent: ${totalCharsSent}/${responseText.length}`);
      console.log(`📄 ${chosenPersona.name} FULL RESPONSE:\n"${responseText}"\n`);

      // Clean up director guidance from system prompt (important!)
      console.log(`🧹 Cleaning up director guidance from ${chosenPersona.name}'s prompt`);
      const systemMessage = chosenPersona.messages[0];
      if (systemMessage && typeof systemMessage.content === 'string') {
        const cleanedPrompt = systemMessage.content.replace(/--- DIRECTOR'S ANALYSIS ---[\s\S]*?--- END DIRECTOR'S GUIDANCE ---\n?/g, '');
        systemMessage.content = cleanedPrompt;
        console.log('  ✅ Guidance cleaned');
      }

      // The persona's streaming is finished
      const assistantMessage: MastermindMessage = {
        id: generateMastermindMessageId(),
        role: "assistant",
        content: responseText,
        personaId,
        timestamp: Date.now()
      };

      // Update session message history
      session.messages.push(assistantMessage);
      console.log(`💾 Added ${chosenPersona.name}'s response to session history`);

      // Update all persona message histories
      const startTime = performance.now();
      console.log('📝 Updating all persona message histories...');
      for (let j = 0; j < personas.length; j++) {
        const p = personas[j];
        const pId = Object.entries(personasRegistry)
          .find(([, meta]) => meta.instance === p)?.[0] as PersonaId;
        
        if (pId === personaId) {
          // This persona sees their own message as assistant
          p.addAssistantMessage(responseText);
          console.log(`  ➡️  ${p.name} sees own message as assistant`);
        } else {
          // Other personas see it as a user message with speaker name
          const speakingPersona = personasRegistry[personaId as PersonaId];
          p.addUserMessage(`${speakingPersona.name}: ${responseText}`);
          console.log(`  ➡️  ${p.name} sees ${speakingPersona.name}'s message as user`);
        }
      }
      const endTime = performance.now();
      console.log(`🎉 ${chosenPersona.name} completed response in ${(endTime - startTime).toFixed(2)}ms. Director reasoning:`, decision.metadata.reasoning);

      // Indicate to client that this persona is done
      console.log(`📤 Sending end event for ${chosenPersona.name}`);
      await sendSSE({
        type: "end",
        personaId,
        chunk: "", // Keep empty as client expects content in "chunk" events
        done: true,
        timestamp: assistantMessage.timestamp,
        finalContent: responseText, // Include full content as safety backup
        contentLength: responseText.length // Include length for validation
      });

      responseCount++;
      console.log(`📈 Response count: ${responseCount}/${maxResponses}`);

      // Optional: Add a small delay between responses for better UX
      console.log('⏳ Adding 500ms delay before next response...');
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // All conversation complete
    console.log('\n🏁 === CONVERSATION COMPLETE ===');
    console.log(`  📊 Total responses: ${responseCount}`);
    console.log(`  📝 End reason: ${conversationEndReason}`);
    
    await sendSSE({ 
      type: "complete", 
      completed: true,
      totalResponses: responseCount,
      reason: conversationEndReason
    }, "complete");

  } catch (error: unknown) {
    console.error("❌ [SSE Debug] Stream error:", error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    await sendSSE({ 
      type: "error",
      error: true, 
      message: error instanceof Error ? error.message : String(error) 
    }, "error");
  } finally {
    console.log('🔒 Closing writer stream');
    writer.close();
  }
})();

    // Return the SSE response
    console.log('🚀 Returning SSE response stream');
    return new Response(transformStream.readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error: unknown) {
    console.error('❌ SSE Mastermind GET error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(`SSE Mastermind GET error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
}

