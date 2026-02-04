#!/usr/bin/env npx tsx
/**
 * Cross-Model Ablation Runner
 * 
 * Tests the same Nietzsche prompts across different model capability tiers.
 * 
 * Usage:
 *   npx tsx experiments/ablation/cross-model-runner.ts
 *   npx tsx experiments/ablation/cross-model-runner.ts --model haiku
 *   npx tsx experiments/ablation/cross-model-runner.ts --model sonnet-old --dry-run
 *   npx tsx experiments/ablation/cross-model-runner.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateText } from 'ai';
import { getModelInstance, ModelId } from '@/lib/models';
import { personasRegistry, PersonaId } from '@/lib/personas/personas-registry';
import { buildPersonaPrompt, buildFullPersonaPrompt } from './prompts/persona-sections';
import { buildDirectorPrompt } from './prompts/director-sections';
import { MODEL_TIERS, ModelTier, CROSS_MODEL_PERSONA, estimateCrossModelCost } from './cross-model-config';
import { TEST_PROMPTS, ALL_DIRECTOR_SECTIONS, ALL_PERSONA_SECTIONS } from './config';
import { Message, DirectorSection, PersonaSection, RawMetrics } from './types';

// ============================================================================
// Configuration
// ============================================================================

const TURNS_PER_CONVERSATION = 4;
const RUNS_PER_VARIANT = 5;
const RESULTS_DIR = path.join(__dirname, 'results', 'cross-model');

// ============================================================================
// Utilities
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function timestamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Director Logic (simplified - uses default Opus)
// ============================================================================

interface DirectorContext {
  personas: PersonaId[];
  responseCount: number;
  speakerCounts: Record<string, number>;
  recentSpeakers: PersonaId[];
  lastSpeaker?: PersonaId;
}

async function getDirectorDecision(
  context: DirectorContext,
  conversationSummary: string,
): Promise<{ nextSpeaker: PersonaId; rationale: string }> {
  // Always use Opus for director to isolate model variance to persona responses
  const model = getModelInstance('claude-opus-4-1-20250805');
  
  // Build director context in the format expected by buildDirectorPrompt
  const directorContext = {
    personas: context.personas,
    responseCount: context.responseCount,
    speakerCounts: context.speakerCounts,
    recentSpeakers: context.recentSpeakers,
    lastSpeaker: context.lastSpeaker,
    recentFailedPersonas: [] as PersonaId[],
  };
  
  const prompt = buildDirectorPrompt(ALL_DIRECTOR_SECTIONS, directorContext, conversationSummary);

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        nextSpeaker: parsed.selectedPersona || context.personas[0],
        rationale: parsed.rationale || 'Director decision',
      };
    }
  } catch (error) {
    console.warn('[cross-model] Director error, using fallback');
  }

  // Fallback: rotate personas
  const candidates = context.personas.filter(p => p !== context.lastSpeaker);
  return {
    nextSpeaker: candidates[Math.floor(Math.random() * candidates.length)] || context.personas[0],
    rationale: 'Fallback selection',
  };
}

// ============================================================================
// Persona Response (model-variable)
// ============================================================================

async function getPersonaResponse(
  personaId: PersonaId,
  modelId: ModelId,
  enabledSections: PersonaSection[] | null,
  conversationHistory: Message[],
  verbose: boolean = false
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const personaName = personasRegistry[personaId]?.name || personaId;
  
  // Build system prompt
  let systemPrompt: string;
  if (enabledSections === null) {
    systemPrompt = buildFullPersonaPrompt(personaId) || `You are ${personaName}. Respond in character.`;
  } else if (enabledSections.length === 0) {
    systemPrompt = `You are ${personaName}. Respond in character.`;
  } else {
    systemPrompt = buildPersonaPrompt(personaId, enabledSections) || `You are ${personaName}. Respond in character.`;
  }

  systemPrompt += `

CRITICAL: You are ${personaName} in a roundtable discussion.
Output ONLY your single response - no other personas.
Do NOT prefix with your name. Start speaking directly.`;

  // Build conversation context
  const conversationContext = conversationHistory.map(msg => {
    if (msg.role === 'user') return `USER: ${msg.content}`;
    const name = personasRegistry[msg.personaId as PersonaId]?.name || msg.personaId || 'ASSISTANT';
    return `${name.toUpperCase()}: ${msg.content}`;
  }).join('\n\n---\n\n');

  const messages = [{
    role: 'user' as const,
    content: `Conversation so far:\n\n${conversationContext}\n\n---\n\nNow respond as ${personaName}.`
  }];

  // Use the specified model
  const model = getModelInstance(modelId);

  try {
    const { text, usage } = await generateText({
      model,
      system: systemPrompt,
      messages,
      temperature: 0.8,
      maxOutputTokens: 1024,
    });

    // Clean up response
    let cleaned = text.trim();
    const namePatterns = [
      new RegExp(`^\\[?${personaName}\\]?:?\\s*`, 'i'),
      /^\[[\w\s]+\]:?\s*/,
    ];
    for (const pattern of namePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    return {
      text: cleaned,
      inputTokens: usage?.promptTokens || 0,
      outputTokens: usage?.completionTokens || 0,
    };
  } catch (error) {
    console.error(`[cross-model] ${modelId} response failed:`, error);
    return { text: `[Error: ${modelId} failed]`, inputTokens: 0, outputTokens: 0 };
  }
}

// ============================================================================
// Conversation Runner
// ============================================================================

interface ConversationResult {
  messages: Message[];
  durationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

async function runConversation(
  testPrompt: string,
  modelId: ModelId,
  enabledSections: PersonaSection[] | null,
  verbose: boolean = false
): Promise<ConversationResult> {
  const startTime = Date.now();
  const messages: Message[] = [];
  const personas: PersonaId[] = ['friedrich-nietzsche', 'alan-watts', 'marcus-aurelius'];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const context: DirectorContext = {
    personas,
    responseCount: 0,
    speakerCounts: Object.fromEntries(personas.map(p => [p, 0])),
    recentSpeakers: [],
  };

  // User message
  messages.push({
    id: generateId(),
    role: 'user',
    content: testPrompt,
    personaId: 'user',
    timestamp: Date.now(),
  });

  if (verbose) console.log(`\n👤 User: ${testPrompt}\n`);

  for (let turn = 0; turn < TURNS_PER_CONVERSATION; turn++) {
    const conversationSummary = messages.map(m => {
      const speaker = m.personaId === 'user' ? 'User' : (personasRegistry[m.personaId as PersonaId]?.name || m.personaId);
      return `${speaker}: ${m.content}`;
    }).join('\n\n');

    const decision = await getDirectorDecision(context, conversationSummary);
    const selectedPersona = decision.nextSpeaker;

    if (verbose) {
      console.log(`🎬 Director → ${personasRegistry[selectedPersona]?.name}`);
    }

    // Get response from the TEST model
    const response = await getPersonaResponse(
      selectedPersona,
      modelId,
      enabledSections,
      messages,
      verbose
    );

    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;

    messages.push({
      id: generateId(),
      role: 'assistant',
      content: response.text,
      personaId: selectedPersona,
      timestamp: Date.now(),
      directorDecision: {
        selectedPersona,
        rationale: decision.rationale,
        significance: '',
        opportunities: [],
      },
    });

    context.responseCount++;
    context.speakerCounts[selectedPersona]++;
    context.recentSpeakers = [...context.recentSpeakers.slice(-2), selectedPersona];
    context.lastSpeaker = selectedPersona;

    if (verbose) {
      console.log(`💬 ${personasRegistry[selectedPersona]?.name}:\n${response.text.substring(0, 200)}...\n`);
    }

    await sleep(1000);
  }

  return {
    messages,
    durationMs: Date.now() - startTime,
    totalInputTokens,
    totalOutputTokens,
  };
}

// ============================================================================
// Metrics
// ============================================================================

function calculateMetrics(messages: Message[]): RawMetrics {
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  const speakerCounts: Record<string, number> = {};
  
  for (const msg of assistantMessages) {
    const id = msg.personaId || 'unknown';
    speakerCounts[id] = (speakerCounts[id] || 0) + 1;
  }

  let consecutiveViolations = 0;
  for (let i = 1; i < assistantMessages.length; i++) {
    if (assistantMessages[i].personaId === assistantMessages[i - 1].personaId) {
      consecutiveViolations++;
    }
  }

  const totalLength = assistantMessages.reduce((sum, m) => sum + m.content.length, 0);

  return {
    uniqueSpeakers: Object.keys(speakerCounts).length,
    speakerCounts,
    consecutiveSpeakerViolations: consecutiveViolations,
    totalResponses: assistantMessages.length,
    avgResponseLength: Math.round(totalLength / (assistantMessages.length || 1)),
  };
}

// ============================================================================
// Result Output
// ============================================================================

function generateMarkdown(
  modelTier: ModelTier,
  variant: 'full' | 'minimal',
  testPrompt: string,
  runNum: number,
  result: ConversationResult,
  metrics: RawMetrics
): string {
  const transcript = result.messages.map(msg => {
    const speaker = msg.personaId === 'user'
      ? '**User**'
      : `**${personasRegistry[msg.personaId as PersonaId]?.name || msg.personaId}**`;
    let text = `### ${speaker}\n\n${msg.content}`;
    if (msg.directorDecision) {
      text += `\n\n> *Director: ${msg.directorDecision.rationale}*`;
    }
    return text;
  }).join('\n\n---\n\n');

  return `# Cross-Model Ablation: ${modelTier.name} (${variant})

**Run ID:** ${generateId()}
**Timestamp:** ${new Date().toISOString()}
**Model:** ${modelTier.id}
**Model Tier:** ${modelTier.tier}
**Variant:** ${variant}
**Target Persona:** friedrich-nietzsche

## Configuration

- **Test Prompt:** "${testPrompt}"
- **Run Number:** ${runNum} of ${RUNS_PER_VARIANT}
- **Enabled Sections:** ${variant === 'full' ? ALL_PERSONA_SECTIONS.join(', ') : 'None (minimal)'}

## Transcript

${transcript}

## Raw Metrics

| Metric | Value |
|--------|-------|
| Duration | ${(result.durationMs / 1000).toFixed(1)}s |
| Input Tokens | ${result.totalInputTokens} |
| Output Tokens | ${result.totalOutputTokens} |
| Unique Speakers | ${metrics.uniqueSpeakers} |
| Total Responses | ${metrics.totalResponses} |
| Avg Response Length | ${metrics.avgResponseLength} chars |
| Consecutive Violations | ${metrics.consecutiveSpeakerViolations} |

## Speaker Breakdown

${Object.entries(metrics.speakerCounts).map(([id, count]) => `- **${personasRegistry[id as PersonaId]?.name || id}**: ${count} responses`).join('\n')}

---

*Cross-model ablation experiment - testing capability vs prompting requirements*
`;
}

// ============================================================================
// Main Runner
// ============================================================================

async function runCrossModelExperiment(options: {
  modelFilter?: string;
  dryRun?: boolean;
  verbose?: boolean;
  force?: boolean;
}): Promise<void> {
  // Create results directory
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }

  // Filter models
  let modelsToRun = MODEL_TIERS;
  if (options.modelFilter) {
    modelsToRun = MODEL_TIERS.filter(m => 
      m.tier.includes(options.modelFilter!) || 
      m.name.toLowerCase().includes(options.modelFilter!.toLowerCase())
    );
  }

  // Skip Opus if we already have data (unless forced)
  if (!options.force) {
    modelsToRun = modelsToRun.filter(m => m.tier !== 'strong');
  }

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║           CROSS-MODEL ABLATION EXPERIMENT                        ║');
  console.log('║       Testing Nietzsche across model capability tiers           ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Models: ${modelsToRun.map(m => m.name).join(', ').padEnd(52)}║`);
  console.log(`║  Variants: full, minimal                                         ║`);
  console.log(`║  Prompts: ${TEST_PROMPTS.length}                                                         ║`);
  console.log(`║  Runs per variant: ${RUNS_PER_VARIANT}                                                   ║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  if (options.dryRun) {
    console.log('🏃 DRY RUN - No actual API calls will be made\n');
    const cost = estimateCrossModelCost();
    console.log(`Estimated cost: ~$${cost.totalEstimatedCost}`);
    return;
  }

  const variants: Array<'full' | 'minimal'> = ['full', 'minimal'];
  let totalRuns = 0;
  let totalCost = 0;

  for (const model of modelsToRun) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`MODEL: ${model.name} (${model.tier})`);
    console.log(`${'═'.repeat(60)}`);

    for (const variant of variants) {
      console.log(`\n  📋 Variant: ${variant.toUpperCase()}`);

      for (let promptIdx = 0; promptIdx < TEST_PROMPTS.length; promptIdx++) {
        const testPrompt = TEST_PROMPTS[promptIdx];
        console.log(`\n     Prompt ${promptIdx + 1}/${TEST_PROMPTS.length}: "${testPrompt.substring(0, 50)}..."`);

        for (let runNum = 1; runNum <= RUNS_PER_VARIANT; runNum++) {
          // Check if result exists
          const pattern = new RegExp(`.*-${model.tier}-${variant}-p${promptIdx + 1}-run${runNum}\\.md$`);
          const existingFiles = fs.readdirSync(RESULTS_DIR).filter(f => pattern.test(f));
          
          if (existingFiles.length > 0 && !options.force) {
            console.log(`       Run ${runNum}/${RUNS_PER_VARIANT}: ⏭️ Skipped (exists)`);
            continue;
          }

          console.log(`       Run ${runNum}/${RUNS_PER_VARIANT}: Running...`);

          const enabledSections = variant === 'full' ? ALL_PERSONA_SECTIONS : [];
          
          const result = await runConversation(
            testPrompt,
            model.id,
            enabledSections,
            options.verbose
          );

          const metrics = calculateMetrics(result.messages);
          
          const filename = `${timestamp()}-${model.tier}-${variant}-p${promptIdx + 1}-run${runNum}.md`;
          const filepath = path.join(RESULTS_DIR, filename);
          const markdown = generateMarkdown(model, variant, testPrompt, runNum, result, metrics);
          
          fs.writeFileSync(filepath, markdown);
          console.log(`       Run ${runNum}/${RUNS_PER_VARIANT}: ✅ Saved (${result.totalOutputTokens} tokens)`);

          totalRuns++;
          // Rough cost estimate
          const inputCost = (result.totalInputTokens / 1000) * model.estimatedCostPer1kTokens.input;
          const outputCost = (result.totalOutputTokens / 1000) * model.estimatedCostPer1kTokens.output;
          totalCost += inputCost + outputCost;

          await sleep(2000);
        }
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('EXPERIMENT COMPLETE');
  console.log(`${'═'.repeat(60)}`);
  console.log(`Total runs: ${totalRuns}`);
  console.log(`Estimated cost: ~$${totalCost.toFixed(2)}`);
  console.log(`Results: ${RESULTS_DIR}`);
}

// ============================================================================
// CLI
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options = {
    modelFilter: undefined as string | undefined,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force') || args.includes('-f'),
  };

  const modelIdx = args.indexOf('--model');
  if (modelIdx !== -1 && args[modelIdx + 1]) {
    options.modelFilter = args[modelIdx + 1];
  }

  if (args.includes('--all')) {
    options.force = true;
  }

  await runCrossModelExperiment(options);
}

main().catch(console.error);
