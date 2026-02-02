/**
 * Director Prompt Sections
 * 
 * The director prompt is broken into labeled sections that can be
 * independently enabled/disabled for ablation testing.
 */

import { DirectorSection } from '../types';
import { PersonaId, personasRegistry } from '@/lib/personas/personas-registry';
import { directorProfiles } from '@/lib/personas/director-profiles';

// ============================================================================
// Section Builders
// ============================================================================

interface DirectorContext {
  personas: PersonaId[];
  responseCount: number;
  speakerCounts: Record<string, number>;
  recentSpeakers: PersonaId[];
  lastSpeaker?: PersonaId;
  recentFailedPersonas: PersonaId[];
}

/**
 * Build the PERSONAS_CONTEXT section
 */
function buildPersonasContext(personas: PersonaId[]): string {
  const personaDescriptions = personas.map(personaId => {
    const metadata = personasRegistry[personaId];
    const profile = directorProfiles[personaId];
    
    if (!metadata) {
      return `- ${personaId}: Unknown persona`;
    }
    
    const expertise = profile?.expertiseDomains?.join(', ') || 'General wisdom';
    const role = profile?.conversationalRole || 'Thoughtful contributor';
    const approach = profile?.intellectualApproach?.join(', ') || 'Thoughtful';
    
    return `- ${metadata.name} (${personaId}): ${metadata.description}
  Expertise: ${expertise}
  Role: ${role}
  Approach: ${approach}`;
  }).join('\n');

  return `AVAILABLE PERSONAS:
${personaDescriptions}`;
}

/**
 * Build the CONVERSATION_METRICS section
 */
function buildConversationMetrics(ctx: DirectorContext): string {
  const avgResponses = ctx.personas.length > 0 
    ? (ctx.responseCount / ctx.personas.length).toFixed(1) 
    : '0';

  return `CONVERSATION METRICS:
- Response count: ${ctx.responseCount}
- Total participants: ${ctx.personas.length}
- Average responses per persona: ${avgResponses}
- Speaker frequency: ${JSON.stringify(ctx.speakerCounts)}
- Recent speakers (last 3): ${ctx.recentSpeakers.join(', ') || 'None'}
- Last speaker: ${ctx.lastSpeaker || 'None'}
- Recently failed personas: ${ctx.recentFailedPersonas.length > 0 ? ctx.recentFailedPersonas.join(', ') : 'None'}`;
}

/**
 * Build the CONSTRAINTS section
 */
function buildConstraints(ctx: DirectorContext): string {
  return `IMPORTANT CONSTRAINTS:
1. NEVER select a persona from the recently failed list: ${ctx.recentFailedPersonas.join(', ') || 'None'}
2. AVOID selecting the same persona twice in a row unless there's only one persona available
3. PRIORITIZE personas who haven't spoken recently or have spoken less frequently
4. If only one persona is available, you may select them regardless of recent activity`;
}

/**
 * Build the ANALYSIS_CRITERIA section
 */
function buildAnalysisCriteria(): string {
  return `ANALYSIS CRITERIA:
1. Who hasn't spoken recently or at all?
2. What intellectual tension or opportunity exists?
3. Which persona's expertise best addresses the current moment?
4. What would create the most valuable next contribution?
5. Should the conversation continue or naturally conclude?`;
}

/**
 * Build the OUTPUT_FORMAT section
 */
function buildOutputFormat(): string {
  return `Please respond with a JSON object following this exact structure:
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

// ============================================================================
// Main Builder
// ============================================================================

const SECTION_BUILDERS: Record<DirectorSection, (ctx: DirectorContext) => string> = {
  PERSONAS_CONTEXT: (ctx) => buildPersonasContext(ctx.personas),
  CONVERSATION_METRICS: (ctx) => buildConversationMetrics(ctx),
  CONSTRAINTS: (ctx) => buildConstraints(ctx),
  ANALYSIS_CRITERIA: () => buildAnalysisCriteria(),
  OUTPUT_FORMAT: () => buildOutputFormat(),
};

const SYSTEM_PREAMBLE = `You are the Conversation Director for a mastermind roundtable discussion. Your role is to analyze the conversation and strategically choose who should speak next to maximize intellectual value.`;

/**
 * Build a director prompt with only the specified sections enabled.
 * 
 * @param enabledSections - Array of section keys to include
 * @param context - Conversation context for dynamic content
 * @param conversationSummary - Recent conversation transcript
 * @returns The assembled prompt string
 */
export function buildDirectorPrompt(
  enabledSections: DirectorSection[],
  context: DirectorContext,
  conversationSummary: string
): string {
  const parts: string[] = [SYSTEM_PREAMBLE];

  // Add enabled sections in order
  const sectionOrder: DirectorSection[] = [
    'PERSONAS_CONTEXT',
    'CONVERSATION_METRICS',
    'CONSTRAINTS',
    'ANALYSIS_CRITERIA',
    'OUTPUT_FORMAT',
  ];

  for (const section of sectionOrder) {
    if (enabledSections.includes(section)) {
      const builder = SECTION_BUILDERS[section];
      parts.push(builder(context));
    }
  }

  // Always include recent conversation (not ablatable - it's the input)
  if (conversationSummary) {
    parts.push(`RECENT CONVERSATION:\n${conversationSummary}`);
  }

  return parts.join('\n\n');
}

/**
 * Get the full director prompt (all sections enabled).
 * This is the baseline for comparison.
 */
export function buildFullDirectorPrompt(
  context: DirectorContext,
  conversationSummary: string
): string {
  return buildDirectorPrompt(
    ['PERSONAS_CONTEXT', 'CONVERSATION_METRICS', 'CONSTRAINTS', 'ANALYSIS_CRITERIA', 'OUTPUT_FORMAT'],
    context,
    conversationSummary
  );
}

/**
 * Get a minimal director prompt (only OUTPUT_FORMAT).
 * Tests how much the model can figure out on its own.
 */
export function buildMinimalDirectorPrompt(
  context: DirectorContext,
  conversationSummary: string
): string {
  // Even minimal needs to know what personas are available (just IDs)
  const minimalContext = `Available persona IDs: ${context.personas.join(', ')}`;
  
  return `${SYSTEM_PREAMBLE}

${minimalContext}

RECENT CONVERSATION:
${conversationSummary}

${buildOutputFormat()}`;
}
