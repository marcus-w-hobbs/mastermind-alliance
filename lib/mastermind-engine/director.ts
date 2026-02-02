/**
 * Conversation Director - The decision-making brain of the mastermind engine
 * 
 * This module extracts the sophisticated director logic from the original server actions
 * and encapsulates it in a reusable class that works independently of Next.js.
 * 
 * The ConversationDirector is responsible for:
 * - Analyzing conversation flow and participant dynamics
 * - Making strategic decisions about who should speak next
 * - Building sophisticated prompts for AI-driven decision making
 * - Implementing validation and fallback logic
 * - Tracking speaker patterns and conversation health
 */

import { generateText } from 'ai';
import { 
  DirectorDecision, 
  DirectorContext, 
  PersonaId, 
  PersonaDirectorProfile,
  ModelId,
  MastermindMessage,
  ConversationState
} from './types';
import { Persona } from '@/lib/personas/persona';
import { personasRegistry, getDefaultPersonaId } from '@/lib/personas/personas-registry';
import { directorProfiles } from '@/lib/personas/director-profiles';
import { getModelInstance } from '@/lib/models';

/**
 * Interface for persona context used in director decision making
 */
interface PersonaContext {
  id: PersonaId;
  name: string;
  description: string;
  profile: PersonaDirectorProfile;
}

/**
 * Configuration for the ConversationDirector
 */
export interface DirectorConfig {
  /** Model to use for director decisions */
  modelId: ModelId;
  
  /** Temperature for director decision making (default: 0.7) */
  temperature?: number;
  
  /** Number of recent messages to include in context (default: 6) */
  contextMessageCount?: number;
  
  /** Number of recent speakers to track (default: 3) */
  recentSpeakersCount?: number;
  
  /** Whether to enable detailed logging */
  enableLogging?: boolean;
}

/**
 * Speaker statistics for tracking conversation patterns
 */
interface SpeakerStats {
  totalCount: number;
  recentActivity: number;
  consecutiveCount: number;
}

/**
 * ConversationDirector handles the strategic decision-making for mastermind conversations.
 * 
 * This class encapsulates the sophisticated logic originally found in the server actions,
 * making it reusable across different environments (CLI, web, API).
 */
export class ConversationDirector {
  private config: DirectorConfig;
  private logger: (message: string, ...args: unknown[]) => void;

  constructor(config: DirectorConfig) {
    this.config = {
      temperature: 0.7,
      contextMessageCount: 6,
      recentSpeakersCount: 3,
      enableLogging: false,
      ...config
    };
    
    this.logger = this.config.enableLogging 
      ? (msg, ...args) => console.log(msg, ...args)
      : () => {};
  }

  /**
   * Main method for getting director decisions about who should speak next
   */
  async getDirectorDecision(context: DirectorContext): Promise<DirectorDecision> {
    console.log('[director] 🎬 ConversationDirector: Starting director analysis...');
    this.logger('🎬 ConversationDirector: Starting director analysis...');
    
    try {
      // Build persona contexts with profiles
      const personaContexts = this.buildPersonaContexts(context.availablePersonas);
      this.logger('🎭 Director: Available personas:', personaContexts.map(p => p.name).join(', '));

      // Build conversation summary from recent messages
      const conversationSummary = this.buildConversationSummary(context.recentMessages);
      this.logger('📜 Director: Analyzing recent messages count:', context.recentMessages.length);

      // Calculate speaker statistics
      const speakerStats = this.calculateSpeakerStats(
        context.conversationState.messages, 
        context.recentSpeakers
      );
      this.logger('📊 Director: Speaker stats calculated');
      this.logger('🚫 Director: Recently failed personas:', context.recentFailedPersonas);
      this.logger('🎤 Director: Last speaker:', context.lastSpeakerId);
      this.logger('🔄 Director: Recent speakers:', context.recentSpeakers);

      // Generate director prompt
      const directorPrompt = this.buildDirectorPrompt({
        personaContexts,
        conversationSummary,
        responseCount: context.responseCount,
        speakerStats,
        recentSpeakers: context.recentSpeakers,
        lastSpeakerId: context.lastSpeakerId,
        recentFailedPersonas: context.recentFailedPersonas
      });

      // Get AI decision
      const rawDecision = await this.generateDirectorDecision(directorPrompt);
      
      // Validate and potentially apply fallback logic
      const validatedDecision = await this.validateAndEnforceConstraints(
        rawDecision,
        personaContexts,
        context.recentFailedPersonas,
        context.lastSpeakerId,
        speakerStats
      );

      this.logger('✅ Director: Final decision:', {
        nextSpeaker: validatedDecision.choreography.nextSpeaker,
        shouldContinue: validatedDecision.shouldContinue
      });

      return validatedDecision;

    } catch (error) {
      this.logger('❌ Director decision error:', error);
      return this.createFallbackDecision(context);
    }
  }

  /**
   * Build persona contexts with their profiles and metadata
   */
  private buildPersonaContexts(availablePersonas: Persona[]): PersonaContext[] {
    return availablePersonas.map(persona => {
      const personaId = Object.entries(personasRegistry)
        .find(([, meta]) => meta.instance === persona)?.[0] as PersonaId;
      
      const profile = directorProfiles[personaId];
      const metadata = personasRegistry[personaId];
      
      return {
        id: personaId,
        name: metadata.name,
        description: metadata.description,
        profile: profile || { 
          expertiseDomains: [], 
          conversationalRole: "general", 
          intellectualApproach: [],
          optimalTiming: [],
          complementaryPersonas: [],
          conflictingPersonas: [],
          conversationalTriggers: []
        }
      };
    }).filter(p => p.id !== 'user');
  }

  /**
   * Build a concise conversation summary from recent messages
   */
  private buildConversationSummary(recentMessages: MastermindMessage[]): string {
    return recentMessages.map(msg => {
      const speakerName = msg.role === 'user' 
        ? 'User' 
        : (personasRegistry[msg.personaId as PersonaId]?.name || 'Assistant');
      return `${speakerName}: ${msg.content}`;
    }).join('\n\n');
  }

  /**
   * Calculate comprehensive speaker statistics
   */
  private calculateSpeakerStats(
    allMessages: MastermindMessage[], 
    recentSpeakers: PersonaId[]
  ): Map<PersonaId, SpeakerStats> {
    const stats = new Map<PersonaId, SpeakerStats>();
    
    // Count total occurrences
    allMessages.forEach(msg => {
      if (msg.personaId && msg.personaId !== 'user') {
        const personaId = msg.personaId as PersonaId;
        const current = stats.get(personaId) || { totalCount: 0, recentActivity: 0, consecutiveCount: 0 };
        current.totalCount++;
        stats.set(personaId, current);
      }
    });

    // Calculate recent activity
    recentSpeakers.forEach(personaId => {
      const current = stats.get(personaId) || { totalCount: 0, recentActivity: 0, consecutiveCount: 0 };
      current.recentActivity++;
      stats.set(personaId, current);
    });

    // Calculate consecutive speaking patterns (from end of conversation)
    let consecutivePersona: PersonaId | null = null;
    let consecutiveCount = 0;
    
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.personaId && msg.personaId !== 'user') {
        const personaId = msg.personaId as PersonaId;
        if (consecutivePersona === null) {
          consecutivePersona = personaId;
          consecutiveCount = 1;
        } else if (consecutivePersona === personaId) {
          consecutiveCount++;
        } else {
          break;
        }
      }
    }

    // Update consecutive count for the last speaker
    if (consecutivePersona) {
      const current = stats.get(consecutivePersona) || { totalCount: 0, recentActivity: 0, consecutiveCount: 0 };
      current.consecutiveCount = consecutiveCount;
      stats.set(consecutivePersona, current);
    }

    return stats;
  }

  /**
   * Build the sophisticated director prompt
   */
  private buildDirectorPrompt(params: {
    personaContexts: PersonaContext[];
    conversationSummary: string;
    responseCount: number;
    speakerStats: Map<PersonaId, SpeakerStats>;
    recentSpeakers: PersonaId[];
    lastSpeakerId?: PersonaId;
    recentFailedPersonas: PersonaId[];
  }): string {
    const { 
      personaContexts, 
      conversationSummary, 
      responseCount, 
      speakerStats,
      recentSpeakers,
      lastSpeakerId,
      recentFailedPersonas
    } = params;

    // Convert speaker stats to simple object for prompt
    const speakerCounts = Object.fromEntries(
      Array.from(speakerStats.entries()).map(([id, stats]) => [id, stats.totalCount])
    );

    return `You are the Conversation Director for a mastermind roundtable discussion. Your role is to analyze the conversation and strategically choose who should speak next to maximize intellectual value.

AVAILABLE PERSONAS:
${personaContexts.map(p => `- ${p.name} (${p.id}): ${p.description}
  Expertise: ${p.profile.expertiseDomains.join(', ') || 'General wisdom'}
  Role: ${p.profile.conversationalRole}
  Approach: ${p.profile.intellectualApproach.join(', ') || 'Thoughtful'}`).join('\n')}

RECENT CONVERSATION:
${conversationSummary}

CONVERSATION METRICS:
- Response count: ${responseCount}
- Total participants: ${personaContexts.length}
- Average responses per persona: ${responseCount / personaContexts.length}
- Speaker frequency: ${JSON.stringify(speakerCounts)}
- Recent speakers (last ${this.config.recentSpeakersCount}): ${recentSpeakers.join(', ')}
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
  }

  /**
   * Generate director decision using AI
   */
  private async generateDirectorDecision(prompt: string): Promise<DirectorDecision> {
    console.log('[director] 🤖 Director: Getting model instance:', this.config.modelId);
    this.logger('🤖 Director: Getting model instance:', this.config.modelId);
    const model = getModelInstance(this.config.modelId);
    
    console.log('[director] 💭 Director: Generating decision with model:', {
      modelId: this.config.modelId,
      temperature: this.config.temperature
    });
    this.logger('💭 Director: Generating decision...');
    const startTime = Date.now();
    
    try {
      const { text: responseText } = await generateText({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are a conversation director. Respond only with valid JSON matching the requested structure.'
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: this.config.temperature,
      });
      
      const elapsedTime = Date.now() - startTime;
      this.logger(`📝 Director: Received response in ${elapsedTime}ms, parsing JSON...`);
      console.log('[director] 📝 Director response preview:', responseText.substring(0, 200) + '...');

      // Parse and return the JSON response
      const decision: DirectorDecision = JSON.parse(responseText);
      
      this.logger('✅ Director: Decision parsed successfully:', {
        nextSpeaker: decision.choreography.nextSpeaker,
        shouldContinue: decision.shouldContinue
      });
      
      return decision;
    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      console.error('[director] ❌ Director AI call failed:', {
        error: error instanceof Error ? error.message : String(error),
        errorType: error?.constructor?.name,
        model: this.config.modelId,
        elapsedTime,
        temperature: this.config.temperature
      });
      
      // Additional error details for AI SDK errors
      if (error && typeof error === 'object' && 'cause' in error) {
        console.error('[director] ❌ Error cause:', error.cause);
      }
      if (error && typeof error === 'object' && 'response' in error) {
        console.error('[director] ❌ Error response:', error.response);
      }
      
      throw error;
    }
  }

  /**
   * Validate director decision and apply fallback logic if needed
   */
  private async validateAndEnforceConstraints(
    decision: DirectorDecision,
    personaContexts: PersonaContext[],
    recentFailedPersonas: PersonaId[],
    lastSpeakerId: PersonaId | undefined,
    speakerStats: Map<PersonaId, SpeakerStats>
  ): Promise<DirectorDecision> {
    let selectedPersona = decision.choreography.nextSpeaker;
    let fallbackReason = "";
    
    // Check if chosen persona exists
    const chosenPersonaExists = personaContexts.some(p => p.id === selectedPersona);
    if (!chosenPersonaExists) {
      this.logger(`⚠️ Director chose unavailable persona: ${selectedPersona}`);
      fallbackReason = "Invalid persona selection";
      selectedPersona = getDefaultPersonaId();
    }
    
    // Check if chosen persona is in failed list
    if (selectedPersona && recentFailedPersonas.includes(selectedPersona)) {
      this.logger(`⚠️ Director chose recently failed persona: ${selectedPersona}`);
      fallbackReason = "Recently failed persona";
      selectedPersona = getDefaultPersonaId();
    }
    
    // Check for consecutive same speaker (unless only one persona available)
    if (selectedPersona && lastSpeakerId === selectedPersona && personaContexts.length > 1) {
      this.logger(`⚠️ Director chose same persona consecutively: ${selectedPersona}`);
      fallbackReason = "Consecutive same speaker";
      selectedPersona = getDefaultPersonaId();
    }
    
    // If we need a fallback, find the best alternative
    if (!selectedPersona || fallbackReason) {
      this.logger('🔄 Finding fallback persona...');
      
      // Filter out failed personas and last speaker (if multiple available)
      const validPersonas = personaContexts.filter(p => {
        if (recentFailedPersonas.includes(p.id)) return false;
        if (personaContexts.length > 1 && p.id === lastSpeakerId) return false;
        return true;
      });
      
      if (validPersonas.length > 0) {
        // Choose persona who has spoken least or hasn't spoken recently
        const fallbackPersona = validPersonas.reduce((best, current) => {
          const currentStats = speakerStats.get(current.id) || { totalCount: 0, recentActivity: 0, consecutiveCount: 0 };
          const bestStats = speakerStats.get(best.id) || { totalCount: 0, recentActivity: 0, consecutiveCount: 0 };
          
          // Prioritize by: 1) recent activity (lower is better), 2) total count (lower is better)
          if (currentStats.recentActivity !== bestStats.recentActivity) {
            return currentStats.recentActivity < bestStats.recentActivity ? current : best;
          }
          return currentStats.totalCount < bestStats.totalCount ? current : best;
        });
        
        selectedPersona = fallbackPersona.id;
        decision.choreography.rationale = `Fallback selection (${fallbackReason}): Chose ${fallbackPersona.name} who has spoken ${speakerStats.get(fallbackPersona.id)?.totalCount || 0} times`;
        this.logger(`✅ Fallback persona selected: ${fallbackPersona.name} (${fallbackPersona.id})`);
      } else {
        // Last resort: use any available persona (this handles the case where all have failed recently)
        selectedPersona = personaContexts[0].id;
        decision.choreography.rationale = `Emergency fallback: All personas have issues, selecting ${personaContexts[0].name}`;
        this.logger(`🚨 Emergency fallback to: ${personaContexts[0].name}`);
      }
    }
    
    // Update decision with final persona selection
    decision.choreography.nextSpeaker = selectedPersona;
    return decision;
  }

  /**
   * Create a fallback decision when the director system fails completely
   */
  private createFallbackDecision(context: DirectorContext): DirectorDecision {
    this.logger('🚨 Creating emergency fallback decision');
    
    // Try to select the first available persona or use default
    const fallbackPersonaId = context.availablePersonas.length > 0 
      ? (Object.entries(personasRegistry).find(([, meta]) => 
          meta.instance === context.availablePersonas[0]
        )?.[0] as PersonaId || "helpful-assistant")
      : "helpful-assistant";

    return {
      analysis: {
        significance: "Continuing conversation with available personas",
        tensions: ["Director analysis failed"],
        opportunities: ["Maintain conversation flow"]
      },
      choreography: {
        nextSpeaker: fallbackPersonaId,
        rationale: "Fallback selection due to director system failure",
        direction: "Continue the conversation naturally",
        conversationalGoal: "Maintain engagement"
      },
      metadata: {
        reasoning: "Director system failed, using fallback logic",
        alternativeApproaches: ["Sequential fallback"]
      },
      shouldContinue: context.responseCount < context.availablePersonas.length * 2
    };
  }

  /**
   * Update director configuration
   */
  updateConfig(newConfig: Partial<DirectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update logger if logging setting changed
    if (newConfig.enableLogging !== undefined) {
      this.logger = this.config.enableLogging 
        ? (msg, ...args) => console.log(msg, ...args)
        : () => {};
    }
  }

  /**
   * Get current director configuration
   */
  getConfig(): DirectorConfig {
    return { ...this.config };
  }

  /**
   * Analyze conversation health and provide insights
   */
  analyzeConversationHealth(context: DirectorContext): {
    health: 'healthy' | 'stagnant' | 'unbalanced' | 'failing';
    insights: string[];
    recommendations: string[];
  } {
    const { conversationState, availablePersonas, recentFailedPersonas } = context;
    const speakerStats = this.calculateSpeakerStats(conversationState.messages, context.recentSpeakers);
    
    const insights: string[] = [];
    const recommendations: string[] = [];
    let health: 'healthy' | 'stagnant' | 'unbalanced' | 'failing' = 'healthy';

    // Analyze failure rate
    const failureRate = recentFailedPersonas.length / availablePersonas.length;
    if (failureRate > 0.5) {
      health = 'failing';
      insights.push(`High failure rate: ${Math.round(failureRate * 100)}% of personas recently failed`);
      recommendations.push('Consider adjusting persona selection criteria or model parameters');
    }

    // Analyze speaker balance
    const speakerCounts = Array.from(speakerStats.values()).map(s => s.totalCount);
    const avgSpeakers = speakerCounts.reduce((a, b) => a + b, 0) / speakerCounts.length;
    const variance = speakerCounts.reduce((acc, count) => acc + Math.pow(count - avgSpeakers, 2), 0) / speakerCounts.length;
    
    if (variance > avgSpeakers) {
      if (health === 'healthy') health = 'unbalanced';
      insights.push('Conversation is dominated by certain personas');
      recommendations.push('Encourage participation from less active personas');
    }

    // Analyze conversation momentum
    const recentMessageCount = context.recentMessages.length;
    if (recentMessageCount < 3 && conversationState.responseCount > 5) {
      if (health === 'healthy') health = 'stagnant';
      insights.push('Conversation appears to be winding down');
      recommendations.push('Consider introducing new topics or perspectives');
    }

    return { health, insights, recommendations };
  }
}

/**
 * Factory function for creating ConversationDirector instances
 */
export function createConversationDirector(config: DirectorConfig): ConversationDirector {
  return new ConversationDirector(config);
}

/**
 * Utility function to create a basic director context from available data
 */
export function createDirectorContext(
  conversationState: ConversationState,
  availablePersonas: Persona[],
  recentMessages: MastermindMessage[],
  responseCount: number,
  recentFailedPersonas: PersonaId[] = [],
  lastSpeakerId?: PersonaId
): DirectorContext {
  // Calculate speaker stats
  const speakerStats = new Map<PersonaId, number>();
  const recentSpeakers: PersonaId[] = [];
  
  conversationState.messages.forEach((msg: MastermindMessage) => {
    if (msg.personaId && msg.personaId !== 'user') {
      const count = speakerStats.get(msg.personaId as PersonaId) || 0;
      speakerStats.set(msg.personaId as PersonaId, count + 1);
    }
  });

  // Get recent speakers (last 3)
  const recentMsgs = conversationState.messages.slice(-3);
  recentMsgs.forEach((msg: MastermindMessage) => {
    if (msg.personaId && msg.personaId !== 'user') {
      recentSpeakers.push(msg.personaId as PersonaId);
    }
  });

  return {
    conversationState,
    availablePersonas,
    recentMessages,
    responseCount,
    recentFailedPersonas,
    lastSpeakerId,
    speakerStats,
    recentSpeakers
  };
}