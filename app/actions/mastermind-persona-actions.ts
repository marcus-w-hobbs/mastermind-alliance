'use server';

import { streamText, generateText } from 'ai';
import { ModelId, getModelInstance } from "@/lib/models";
import { Persona } from "@/lib/personas/persona";
import { PersonaId, personasRegistry, getDefaultPersonaId } from '@/lib/personas/personas-registry';
import { MastermindMessage } from '@/types/mastermind-message';
import { directorProfiles } from '@/lib/personas/director-profiles';
import { DirectorDecision } from '@/types/persona-director-profile';

/**
 * Generates a persona response with retry logic and exponential backoff
 */
export async function generatePersonaResponseWithRetry(
  persona: Persona,
  model: ReturnType<typeof getModelInstance>,
  maxRetries: number = 3,
  minResponseLength: number = 10
): Promise<{ success: boolean; responseText: string; attempts: number }> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    attempts++;
    console.log(`🔄 Attempt ${attempts}/${maxRetries} for ${persona.name}`);
    
    try {
      let responseText = "";
      const { textStream } = streamText({
        model,
        messages: persona.messages,
        temperature: attempts === 1 ? 0.7 : 0.8 + (attempts * 0.05), // Increase temperature on retries
        maxOutputTokens: 500, // Allow for more thoughtful responses
      });
      
      // Collect the full response
      for await (const chunk of textStream) {
        responseText += chunk;
      }
      
      // Validate response more thoroughly
      const trimmedResponse = responseText.trim();
      const hasSubstantiveContent = trimmedResponse.length >= minResponseLength && 
                                    !trimmedResponse.match(/^[\.\,\!\?\s]*$/) && // Not just punctuation
                                    trimmedResponse.split(/\s+/).length >= 3; // At least 3 words
      
      if (hasSubstantiveContent) {
        console.log(`✅ Valid response received for ${persona.name} on attempt ${attempts} (${trimmedResponse.length} chars)`);
        return { success: true, responseText, attempts };
      } else {
        console.warn(`⚠️ Response inadequate for ${persona.name}: length=${trimmedResponse.length}, content="${trimmedResponse.substring(0, 50)}${trimmedResponse.length > 50 ? '...' : ''}"`);
      }
      
    } catch (error) {
      console.error(`❌ Error generating response for ${persona.name}:`, error);
    }
    
    // Exponential backoff before retry
    if (attempts < maxRetries) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
      console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
  
  // All retries failed
  console.error(`❌ All ${attempts} attempts failed for ${persona.name}`);
  return { success: false, responseText: "", attempts };
}

/**
 * The core Director function that analyzes conversation and decides who speaks next
 */
export async function getDirectorDecision(
  messages: MastermindMessage[],
  availablePersonas: Persona[],
  responseCount: number,
  modelName: ModelId,
  recentFailedPersonas: PersonaId[] = [],
  lastSpeakerId?: PersonaId
): Promise<DirectorDecision> {
  console.log('🎬 getDirectorDecision: Starting director analysis...');
  
  // Build context about available personas
  const personaContext = availablePersonas.map(persona => {
    const personaId = Object.entries(personasRegistry)
      .find(([, meta]) => meta.instance === persona)?.[0] as PersonaId;
    
    const profile = directorProfiles[personaId];
    const metadata = personasRegistry[personaId];
    
    return {
      id: personaId,
      name: metadata.name,
      description: metadata.description,
      profile: profile || { expertiseDomains: [], conversationalRole: "general", intellectualApproach: [] }
    };
  }).filter(p => p.id !== 'user');

  console.log('🎭 Director: Available personas:', personaContext.map(p => p.name).join(', '));

  // Build conversation summary
  const recentMessages = messages.slice(-6); // Last 6 messages for context
  const conversationSummary = recentMessages.map(msg => 
    `${msg.role === 'user' ? 'User' : personasRegistry[msg.personaId as PersonaId]?.name || 'Assistant'}: ${msg.content}`
  ).join('\n\n');

  console.log('📜 Director: Analyzing recent messages count:', recentMessages.length);
  
  // Track speaker frequency and recent activity
  const speakerCounts = new Map<PersonaId, number>();
  const recentSpeakers = messages.slice(-3).map(msg => msg.personaId).filter(Boolean) as PersonaId[];
  
  messages.forEach(msg => {
    if (msg.personaId && msg.personaId !== 'user') {
      const count = speakerCounts.get(msg.personaId as PersonaId) || 0;
      speakerCounts.set(msg.personaId as PersonaId, count + 1);
    }
  });

  console.log('📊 Director: Speaker counts:', Object.fromEntries(speakerCounts));
  console.log('🚫 Director: Recently failed personas:', recentFailedPersonas);
  console.log('🎤 Director: Last speaker:', lastSpeakerId);
  console.log('🔄 Director: Recent speakers:', recentSpeakers);

  // INTERVIEW
  // Create director prompt
  const directorPrompt = `You are the Conversation Director for a mastermind roundtable discussion. Your role is to analyze the conversation and strategically choose who should speak next to maximize intellectual value.

AVAILABLE PERSONAS:
${personaContext.map(p => `- ${p.name} (${p.id}): ${p.description}
  Expertise: ${p.profile.expertiseDomains.join(', ') || 'General wisdom'}
  Role: ${p.profile.conversationalRole}
  Approach: ${p.profile.intellectualApproach.join(', ') || 'Thoughtful'}`).join('\n')}

RECENT CONVERSATION:
${conversationSummary}

CONVERSATION METRICS:
- Response count: ${responseCount}
- Total participants: ${personaContext.length}
- Average responses per persona: ${responseCount / personaContext.length}
- Speaker frequency: ${Object.fromEntries(speakerCounts)}
- Recent speakers (last 3): ${recentSpeakers.join(', ')}
- Last speaker: ${lastSpeakerId || 'None'}
- Recently failed personas: ${recentFailedPersonas.length > 0 ? recentFailedPersonas.join(', ') : 'None'}

IMPORTANT CONSTRAINTS:
1. NEVER select a persona from the recently failed list: ${recentFailedPersonas.join(', ') || 'None'}
2. AVOID selecting the same persona twice in a row unless there's only one persona available
3. PRIORITIZE personas who haven't spoken recently or have spoken less frequently
4. If only one persona is available, you may select them regardless of recent activity

ANALYSIS CRITERIA:
1. Who hasn't spoken recently or at all?
2. What intellectual tension or opportunity exists?
3. Which persona's expertise best addresses the current moment?
4. What would create the most valuable next contribution?
5. Should the conversation continue or naturally conclude?

Please respond with a JSON object following this exact structure:
{
  "analysis": {
    "significance": "Brief assessment of conversation's current intellectual value",
    "tensions": ["List", "of", "unresolved", "tensions"],
    "opportunities": ["List", "of", "intellectual", "opportunities"]
  },
  "choreography": {
    "nextSpeaker": "persona-id-to-speak-next",
    "rationale": "Why this persona should speak now",
    "direction": "Specific guidance for what this persona should focus on",
    "conversationalGoal": "What we're trying to achieve with this next response"
  },
  "metadata": {
    "reasoning": "Your detailed decision-making process",
    "alternativeApproaches": ["Other", "valid", "approaches", "considered"]
  },
  "shouldContinue": true/false
}

Make strategic, intuitive decisions based on conversation flow, intellectual opportunity, and the unique value each persona brings.`;

  try {
    console.log('🤖 Director: Getting model instance:', modelName);
    const model = getModelInstance(modelName);
    
    console.log('💭 Director: Generating decision...');
    const startTime = Date.now();
    const { text: responseText } = await generateText({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a conversation director. Respond only with valid JSON matching the requested structure.'
        },
        {
          role: 'user', 
          content: directorPrompt
        }
      ],
      temperature: 0.7,
    });
    const elapsedTime = Date.now() - startTime;

    console.log(`📝 Director: Received response in ${elapsedTime}ms, parsing JSON...`);

    // Parse the JSON response
    const decision: DirectorDecision = JSON.parse(responseText);
    
    console.log('✅ Director: Decision parsed successfully:', {
      nextSpeaker: decision.choreography.nextSpeaker,
      shouldContinue: decision.shouldContinue
    });
    
    // Validate the director's choice against constraints
    let selectedPersona = decision.choreography.nextSpeaker;
    let fallbackReason = "";
    
    // Check if chosen persona exists
    const chosenPersonaExists = personaContext.some(p => p.id === selectedPersona);
    if (!chosenPersonaExists) {
      console.warn(`⚠️ Director chose unavailable persona: ${selectedPersona}`);
      fallbackReason = "Invalid persona selection";
      selectedPersona = getDefaultPersonaId();
    }
    
    // Check if chosen persona is in failed list
    if (selectedPersona && recentFailedPersonas.includes(selectedPersona)) {
      console.warn(`⚠️ Director chose recently failed persona: ${selectedPersona}`);
      fallbackReason = "Recently failed persona";
      selectedPersona = getDefaultPersonaId();
    }
    
    // Check for consecutive same speaker (unless only one persona available)
    if (selectedPersona && lastSpeakerId === selectedPersona && personaContext.length > 1) {
      console.warn(`⚠️ Director chose same persona consecutively: ${selectedPersona}`);
      fallbackReason = "Consecutive same speaker";
      selectedPersona = getDefaultPersonaId();
    }
    
    // If we need a fallback, find the best alternative
    if (!selectedPersona || fallbackReason) {
      console.log('🔄 Finding fallback persona...');
      
      // Filter out failed personas and last speaker (if multiple available)
      const validPersonas = personaContext.filter(p => {
        if (recentFailedPersonas.includes(p.id)) return false;
        if (personaContext.length > 1 && p.id === lastSpeakerId) return false;
        return true;
      });
      
      if (validPersonas.length > 0) {
        // Choose persona who has spoken least or hasn't spoken recently
        const fallbackPersona = validPersonas.reduce((best, current) => {
          const currentCount = speakerCounts.get(current.id) || 0;
          const bestCount = speakerCounts.get(best.id) || 0;
          return currentCount < bestCount ? current : best;
        });
        
        selectedPersona = fallbackPersona.id;
        decision.choreography.rationale = `Fallback selection (${fallbackReason}): Chose ${fallbackPersona.name} who has spoken ${speakerCounts.get(fallbackPersona.id) || 0} times`;
        console.log(`✅ Fallback persona selected: ${fallbackPersona.name} (${fallbackPersona.id})`);
      } else {
        // Last resort: use any available persona (this handles the case where all have failed recently)
        selectedPersona = personaContext[0].id;
        decision.choreography.rationale = `Emergency fallback: All personas have issues, selecting ${personaContext[0].name}`;
        console.warn(`🚨 Emergency fallback to: ${personaContext[0].name}`);
      }
    }
    
    decision.choreography.nextSpeaker = selectedPersona;

    return decision;

  } catch (error) {
    console.error('❌ Director decision error:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Fallback decision
    return {
      analysis: {
        significance: "Continuing conversation with available personas",
        tensions: ["Director analysis failed"],
        opportunities: ["Maintain conversation flow"]
      },
      choreography: {
        nextSpeaker: personaContext[0]?.id || availablePersonas[0] && Object.entries(personasRegistry)
          .find(([, meta]) => meta.instance === availablePersonas[0])?.[0] as PersonaId || "helpful-assistant",
        rationale: "Fallback selection",
        direction: "Continue the conversation naturally",
        conversationalGoal: "Maintain engagement"
      },
      metadata: {
        reasoning: "Director system failed, using fallback logic",
        alternativeApproaches: ["Sequential fallback"]
      },
      shouldContinue: responseCount < availablePersonas.length * 2
    };
  }
}

/**
 * Find persona by ID from the available personas array
 */
export async function findPersonaById(personaId: PersonaId, personas: Persona[]): Promise<Persona | null> {
  for (const persona of personas) {
    const registryPersonaId = Object.entries(personasRegistry)
      .find(([, meta]) => meta.instance === persona)?.[0] as PersonaId;
    
    if (registryPersonaId === personaId) {
      return persona;
    }
  }
  return null;
}