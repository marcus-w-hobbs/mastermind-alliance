#!/usr/bin/env npx tsx
/**
 * Ablation Experiment Runner
 * 
 * Runs conversations programmatically (no UI) and outputs markdown results.
 * 
 * Features:
 * - Automatic skip logic: won't re-run if valid result exists (saves $$)
 * - Corrupt file detection: auto-deletes files with "[Error generating response]"
 * - Use --force to override skip logic and re-run everything
 * 
 * Usage:
 *   npx tsx experiments/ablation/runner.ts
 *   npx tsx experiments/ablation/runner.ts --phase director
 *   npx tsx experiments/ablation/runner.ts --phase persona --dry-run
 *   npx tsx experiments/ablation/runner.ts --variant nietzsche-no-tone
 *   npx tsx experiments/ablation/runner.ts --variant alan-watts-minimal --force
 * 
 * Flags:
 *   --phase <director|persona|cross>  Which experiment phase to run
 *   --variant <variant-id>            Run only this variant
 *   --dry-run                         Print plan without executing
 *   --force, -f                       Re-run even if valid results exist
 *   --verbose, -v                     Print detailed logs
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local (for CLI usage)
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
import { generateText } from 'ai';
import { getModelInstance } from '@/lib/models';
import { personasRegistry, PersonaId } from '@/lib/personas/personas-registry';
import {
  ExperimentConfig,
  AblationVariant,
  Message,
  ConversationTranscript,
  RunResult,
  RawMetrics,
  DirectorSection,
  PersonaSection,
  CLIOptions,
} from './types';
import {
  getExperimentByPhase,
  EXPERIMENT_MODEL,
  TEST_PROMPTS,
  TARGET_PERSONAS,
  ALL_DIRECTOR_SECTIONS,
  ALL_PERSONA_SECTIONS,
} from './config';
import { buildDirectorPrompt } from './prompts/director-sections';
import { buildPersonaPrompt, buildFullPersonaPrompt, hasAblationSections } from './prompts/persona-sections';

// ============================================================================
// Utility Functions
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function timestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}-${hour}${min}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a valid result already exists for this (variant, prompt, runNum) combination.
 * A valid result is one that:
 * 1. Contains the test prompt (matches this specific run)
 * 2. Does NOT contain "[Error generating response]" (not corrupt)
 * 
 * @returns true if should skip (valid result exists), false if should run
 */
function shouldSkipRun(
  resultsDir: string,
  variantId: string,
  testPrompt: string,
  runNum: number
): { skip: boolean; reason?: string; existingFile?: string } {
  // Find all files matching this variant and run number
  const pattern = new RegExp(`.*-${variantId}-run${runNum}\\.md$`);
  
  try {
    const files = fs.readdirSync(resultsDir).filter(f => pattern.test(f));
    
    for (const file of files) {
      const filepath = path.join(resultsDir, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      
      // Check if this file is for the same prompt
      const promptSnippet = testPrompt.substring(0, 50);
      if (!content.includes(promptSnippet)) {
        continue; // Different prompt, keep looking
      }
      
      // Check if corrupt
      if (content.includes('[Error generating response]')) {
        // Found matching file but it's corrupt - should re-run
        // Optionally: auto-delete corrupt file here
        console.log(`   ⚠️  Found corrupt file for run ${runNum}, will re-run: ${file}`);
        try {
          fs.unlinkSync(filepath);
          console.log(`   🗑️  Deleted corrupt file: ${file}`);
        } catch (e) {
          console.log(`   ⚠️  Could not delete corrupt file: ${e}`);
        }
        continue;
      }
      
      // Found valid matching result
      return { 
        skip: true, 
        reason: 'Valid result already exists',
        existingFile: file 
      };
    }
    
    // No valid matching result found
    return { skip: false };
  } catch (error) {
    // Directory doesn't exist or other error - proceed with run
    return { skip: false };
  }
}

// ============================================================================
// Director Logic
// ============================================================================

interface DirectorContext {
  personas: PersonaId[];
  responseCount: number;
  speakerCounts: Record<string, number>;
  recentSpeakers: PersonaId[];
  lastSpeaker?: PersonaId;
  recentFailedPersonas: PersonaId[];
}

interface DirectorDecision {
  nextSpeaker: PersonaId;
  rationale: string;
  significance: string;
  opportunities: string[];
  shouldContinue: boolean;
}

async function getDirectorDecision(
  enabledSections: DirectorSection[],
  context: DirectorContext,
  conversationSummary: string,
  verbose: boolean = false
): Promise<DirectorDecision> {
  const prompt = buildDirectorPrompt(enabledSections, context, conversationSummary);
  
  if (verbose) {
    console.log('\n--- Director Prompt ---');
    console.log(prompt.substring(0, 500) + '...\n');
  }

  const model = getModelInstance(EXPERIMENT_MODEL);
  
  try {
    const { text } = await generateText({
      model,
      messages: [
        { role: 'system', content: 'You are a conversation director. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const parsed = JSON.parse(text);
    
    return {
      nextSpeaker: parsed.choreography?.nextSpeaker || context.personas[0],
      rationale: parsed.choreography?.rationale || 'Default selection',
      significance: parsed.analysis?.significance || '',
      opportunities: parsed.analysis?.opportunities || [],
      shouldContinue: parsed.shouldContinue ?? true,
    };
  } catch (error) {
    console.error('[runner] Director decision failed:', error);
    // Fallback: pick least-recently-speaking persona
    const fallback = context.personas.find(p => !context.recentSpeakers.includes(p)) 
      || context.personas[0];
    return {
      nextSpeaker: fallback,
      rationale: 'Fallback due to director error',
      significance: '',
      opportunities: [],
      shouldContinue: true,
    };
  }
}

// ============================================================================
// Persona Response Logic
// ============================================================================

async function getPersonaResponse(
  personaId: PersonaId,
  enabledSections: PersonaSection[] | null, // null = use full prompt
  conversationHistory: Message[],
  verbose: boolean = false
): Promise<string> {
  const personaName = personasRegistry[personaId]?.name || personaId;
  
  // Build the persona prompt with STRICT isolation instruction
  let systemPrompt: string;
  
  if (enabledSections === null) {
    // Use full prompt (non-ablated)
    systemPrompt = buildFullPersonaPrompt(personaId) || `You are ${personaName}. Respond in character.`;
  } else if (enabledSections.length === 0) {
    // Minimal prompt
    systemPrompt = `You are ${personaName}. Respond in character.`;
  } else {
    // Ablated prompt
    systemPrompt = buildPersonaPrompt(personaId, enabledSections) || `You are ${personaName}. Respond in character.`;
  }

  // Add strict isolation instruction to prevent multi-persona contamination
  systemPrompt += `

CRITICAL INSTRUCTIONS:
1. You are ${personaName} in a roundtable discussion
2. Output ONLY your single response - no other personas
3. Do NOT prefix with your name, brackets, or "I said"
4. Do NOT simulate or continue responses for others
5. Start speaking directly in your voice`;

  if (verbose) {
    console.log(`\n--- ${personaId} System Prompt ---`);
    console.log(systemPrompt.substring(0, 500) + '...\n');
  }

  // Build conversation as a SINGLE context block to avoid pattern continuation
  // The model sees the whole conversation as context, then responds once
  const conversationContext = conversationHistory.map(msg => {
    if (msg.role === 'user') {
      return `USER: ${msg.content}`;
    } else {
      const speakerName = personasRegistry[msg.personaId as PersonaId]?.name || msg.personaId;
      return `${speakerName.toUpperCase()}: ${msg.content}`;
    }
  }).join('\n\n---\n\n');

  // Pass as a single user message with context, NOT as alternating messages
  const messages = [{
    role: 'user' as const,
    content: `Here is the conversation so far:

${conversationContext}

---

Now respond as ${personaName}. Remember: output ONLY your response, no names or prefixes.`
  }];

  const model = getModelInstance(EXPERIMENT_MODEL);

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      messages,
      temperature: 0.8,
      maxTokens: 1024,
    });

    // Post-process: strip any accidental name prefixes the model might still add
    let cleaned = text.trim();
    
    // Remove common contamination patterns
    const namePatterns = [
      new RegExp(`^\\[?${personaName}\\]?:?\\s*`, 'i'),
      new RegExp(`^\\[?${personaId}\\]?:?\\s*`, 'i'),
      /^\[[\w\s]+\]:?\s*/,  // Any [Name]: prefix
      /^[\w\s]+:\s*(?=\S)/,  // Any "Name: " prefix (but not mid-sentence colons)
    ];
    
    for (const pattern of namePatterns) {
      cleaned = cleaned.replace(pattern, '');
    }
    
    // Detect if response contains OTHER persona names with colons (multi-persona contamination)
    const otherPersonaMarkers = Object.values(personasRegistry)
      .filter(p => p.name !== personaName)
      .map(p => new RegExp(`\\[?${p.name}\\]?:`, 'g'));
    
    for (const marker of otherPersonaMarkers) {
      if (marker.test(cleaned)) {
        console.warn(`[runner] ⚠️ Multi-persona contamination detected in ${personaName}'s response`);
        // Split at the first contamination and keep only the first part
        const parts = cleaned.split(marker);
        if (parts[0].trim().length > 50) {
          cleaned = parts[0].trim();
        }
        break;
      }
    }

    return cleaned;
  } catch (error) {
    console.error(`[runner] Persona ${personaId} response failed:`, error);
    return `[Error generating response for ${personaId}]`;
  }
}

// ============================================================================
// Conversation Runner
// ============================================================================

interface ConversationConfig {
  testPrompt: string;
  personas: PersonaId[];
  turnsPerConversation: number;
  directorSections: DirectorSection[];
  personaSections: Record<PersonaId, PersonaSection[] | null>; // null = full prompt
  verbose: boolean;
}

async function runConversation(config: ConversationConfig): Promise<ConversationTranscript> {
  const startTime = Date.now();
  const messages: Message[] = [];
  
  // Initialize context
  const context: DirectorContext = {
    personas: config.personas,
    responseCount: 0,
    speakerCounts: Object.fromEntries(config.personas.map(p => [p, 0])),
    recentSpeakers: [],
    recentFailedPersonas: [],
  };

  // Add initial user message
  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content: config.testPrompt,
    personaId: 'user',
    timestamp: Date.now(),
  };
  messages.push(userMessage);

  if (config.verbose) {
    console.log(`\n👤 User: ${config.testPrompt}\n`);
  }

  // Run conversation turns
  for (let turn = 0; turn < config.turnsPerConversation; turn++) {
    // Build conversation summary for director
    const conversationSummary = messages.map(m => {
      const speaker = m.personaId === 'user' ? 'User' : (personasRegistry[m.personaId as PersonaId]?.name || m.personaId);
      return `${speaker}: ${m.content}`;
    }).join('\n\n');

    // Get director decision
    const decision = await getDirectorDecision(
      config.directorSections,
      context,
      conversationSummary,
      config.verbose
    );

    if (!decision.shouldContinue && turn > 0) {
      if (config.verbose) {
        console.log('🎬 Director: Conversation should conclude.\n');
      }
      break;
    }

    const selectedPersona = decision.nextSpeaker;
    
    if (config.verbose) {
      console.log(`🎬 Director selects: ${personasRegistry[selectedPersona]?.name || selectedPersona}`);
      console.log(`   Rationale: ${decision.rationale}\n`);
    }

    // Get persona response
    const personaSections = config.personaSections[selectedPersona];
    const response = await getPersonaResponse(
      selectedPersona,
      personaSections,
      messages,
      config.verbose
    );

    // Add persona message
    const personaMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: response,
      personaId: selectedPersona,
      timestamp: Date.now(),
      directorDecision: {
        selectedPersona,
        rationale: decision.rationale,
        significance: decision.significance,
        opportunities: decision.opportunities,
      },
    };
    messages.push(personaMessage);

    // Update context
    context.responseCount++;
    context.speakerCounts[selectedPersona] = (context.speakerCounts[selectedPersona] || 0) + 1;
    context.recentSpeakers = [...context.recentSpeakers.slice(-2), selectedPersona];
    context.lastSpeaker = selectedPersona;

    if (config.verbose) {
      const name = personasRegistry[selectedPersona]?.name || selectedPersona;
      console.log(`💬 ${name}:\n${response.substring(0, 300)}${response.length > 300 ? '...' : ''}\n`);
    }

    // Small delay to avoid rate limiting
    await sleep(1000);
  }

  return {
    messages,
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// Metrics Calculation
// ============================================================================

function calculateRawMetrics(transcript: ConversationTranscript): RawMetrics {
  const assistantMessages = transcript.messages.filter(m => m.role === 'assistant');
  
  // Speaker counts
  const speakerCounts: Record<string, number> = {};
  for (const msg of assistantMessages) {
    const id = msg.personaId || 'unknown';
    speakerCounts[id] = (speakerCounts[id] || 0) + 1;
  }

  // Consecutive speaker violations
  let consecutiveViolations = 0;
  for (let i = 1; i < assistantMessages.length; i++) {
    if (assistantMessages[i].personaId === assistantMessages[i - 1].personaId) {
      consecutiveViolations++;
    }
  }

  // Average response length
  const totalLength = assistantMessages.reduce((sum, m) => sum + m.content.length, 0);
  const avgLength = assistantMessages.length > 0 ? totalLength / assistantMessages.length : 0;

  return {
    uniqueSpeakers: Object.keys(speakerCounts).length,
    speakerCounts,
    consecutiveSpeakerViolations: consecutiveViolations,
    totalResponses: assistantMessages.length,
    avgResponseLength: Math.round(avgLength),
  };
}

// ============================================================================
// Result Output
// ============================================================================

function formatTranscript(transcript: ConversationTranscript): string {
  return transcript.messages.map(msg => {
    const speaker = msg.personaId === 'user' 
      ? '**User**' 
      : `**${personasRegistry[msg.personaId as PersonaId]?.name || msg.personaId}**`;
    
    let text = `### ${speaker}\n\n${msg.content}`;
    
    if (msg.directorDecision) {
      text += `\n\n> *Director: ${msg.directorDecision.rationale}*`;
    }
    
    return text;
  }).join('\n\n---\n\n');
}

function generateResultMarkdown(result: RunResult, variant: AblationVariant): string {
  const metadata = personasRegistry[result.transcript.messages[1]?.personaId as PersonaId];
  
  return `# Ablation Run: ${variant.name}

**Run ID:** ${result.runId}
**Timestamp:** ${result.timestamp.toISOString()}
**Variant:** ${variant.id}
**Description:** ${variant.description}

## Configuration

- **Test Prompt:** "${result.testPrompt}"
- **Run Number:** ${result.runNumber} of 5
- **Model:** ${EXPERIMENT_MODEL}
- **Target:** ${variant.target}
- **Enabled Sections:** ${(variant.enabledSections as string[]).join(', ') || 'MINIMAL'}

## Transcript

${formatTranscript(result.transcript)}

## Raw Metrics

| Metric | Value |
|--------|-------|
| Unique Speakers | ${result.rawMetrics.uniqueSpeakers} |
| Total Responses | ${result.rawMetrics.totalResponses} |
| Consecutive Speaker Violations | ${result.rawMetrics.consecutiveSpeakerViolations} |
| Avg Response Length | ${result.rawMetrics.avgResponseLength} chars |
| Duration | ${(result.transcript.durationMs / 1000).toFixed(1)}s |

### Speaker Distribution

${Object.entries(result.rawMetrics.speakerCounts).map(([id, count]) => {
  const name = personasRegistry[id as PersonaId]?.name || id;
  return `- ${name}: ${count} responses`;
}).join('\n')}

## Notes

*[Space for manual observations after review]*

---

*Generated by ablation experiment runner*
`;
}

// ============================================================================
// Main Runner
// ============================================================================

async function runExperiment(config: ExperimentConfig, options: CLIOptions): Promise<void> {
  const resultsDir = path.join(__dirname, 'results');
  
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  console.log(`\n🧪 Starting Experiment: ${config.name}`);
  console.log(`   Phase: ${config.phase}`);
  console.log(`   Model: ${config.modelId}`);
  console.log(`   Variants: ${config.variants.length}`);
  console.log(`   Test Prompts: ${config.testPrompts.length}`);
  console.log(`   Runs per Variant: ${config.runsPerVariant}`);
  console.log(`   Total Runs: ${config.variants.length * config.testPrompts.length * config.runsPerVariant}\n`);

  if (options.dryRun) {
    console.log('🏃 DRY RUN - No actual API calls will be made.\n');
    return;
  }

  const allResults: RunResult[] = [];

  for (const variant of config.variants) {
    // Skip if variant filter is set and doesn't match
    if (options.variantFilter && options.variantFilter.length > 0 && !options.variantFilter.some(f => variant.id.includes(f))) {
      continue;
    }

    console.log(`\n📋 Variant: ${variant.name}`);
    console.log(`   ${variant.description}`);

    for (const testPrompt of config.testPrompts) {
      for (let runNum = 1; runNum <= config.runsPerVariant; runNum++) {
        console.log(`\n   Run ${runNum}/${config.runsPerVariant}: "${testPrompt.substring(0, 50)}..."`);

        // Skip check: see if valid result already exists
        if (!options.force) {
          const skipCheck = shouldSkipRun(resultsDir, variant.id, testPrompt, runNum);
          if (skipCheck.skip) {
            console.log(`   ⏭️  SKIPPED: ${skipCheck.reason} (${skipCheck.existingFile})`);
            continue;
          }
        }

        // Determine director and persona sections based on phase and variant
        let directorSections: DirectorSection[];
        let personaSections: Record<PersonaId, PersonaSection[] | null>;

        if (config.phase === 'director') {
          // Director ablation: modify director, keep personas full
          directorSections = variant.enabledSections as DirectorSection[];
          personaSections = Object.fromEntries(
            config.personas.map((p): [PersonaId, PersonaSection[] | null] => [p, null]) // null = full prompt
          ) as Record<PersonaId, PersonaSection[] | null>;
        } else if (config.phase === 'persona') {
          // Persona ablation: keep director full, modify specific persona
          directorSections = ALL_DIRECTOR_SECTIONS;
          personaSections = {} as Record<PersonaId, PersonaSection[] | null>;

          for (const p of config.personas) {
            if (p === variant.target) {
              personaSections[p] = variant.enabledSections as PersonaSection[];
            } else {
              personaSections[p] = null; // full prompt for non-target personas
            }
          }
        } else {
          // Cross ablation: handled specially
          directorSections = variant.enabledSections as DirectorSection[];
          // For cross experiments, apply minimal to all personas if variant indicates
          if (variant.id.includes('minimal-personas')) {
            personaSections = Object.fromEntries(
              config.personas.map((p): [PersonaId, PersonaSection[] | null] => [p, []])
            ) as Record<PersonaId, PersonaSection[] | null>;
          } else {
            personaSections = Object.fromEntries(
              config.personas.map((p): [PersonaId, PersonaSection[] | null] => [p, null])
            ) as Record<PersonaId, PersonaSection[] | null>;
          }
        }

        const transcript = await runConversation({
          testPrompt,
          personas: config.personas,
          turnsPerConversation: config.turnsPerConversation,
          directorSections,
          personaSections,
          verbose: options.verbose || false,
        });

        const rawMetrics = calculateRawMetrics(transcript);

        const result: RunResult = {
          runId: generateId(),
          variantId: variant.id,
          testPrompt,
          runNumber: runNum,
          transcript,
          rawMetrics,
          timestamp: new Date(),
        };

        allResults.push(result);

        // Write individual result
        const filename = `${timestamp()}-${variant.id}-run${runNum}.md`;
        const filepath = path.join(resultsDir, filename);
        const markdown = generateResultMarkdown(result, variant);
        fs.writeFileSync(filepath, markdown);
        
        console.log(`   ✅ Saved: ${filename}`);

        // Delay between runs
        await sleep(2000);
      }
    }
  }

  // Write summary
  const summaryFilename = `${timestamp()}-${config.id}-summary.md`;
  const summaryPath = path.join(resultsDir, summaryFilename);
  const summary = generateExperimentSummary(config, allResults);
  fs.writeFileSync(summaryPath, summary);
  
  console.log(`\n📊 Experiment complete!`);
  console.log(`   Total runs: ${allResults.length}`);
  console.log(`   Summary: ${summaryFilename}`);
}

function generateExperimentSummary(config: ExperimentConfig, results: RunResult[]): string {
  // Group results by variant
  const byVariant = new Map<string, RunResult[]>();
  for (const result of results) {
    const existing = byVariant.get(result.variantId) || [];
    existing.push(result);
    byVariant.set(result.variantId, existing);
  }

  let summaryTable = '| Variant | Runs | Avg Responses | Consecutive Violations | Avg Length |\n';
  summaryTable += '|---------|------|---------------|------------------------|------------|\n';

  for (const [variantId, variantResults] of byVariant) {
    const avgResponses = variantResults.reduce((sum, r) => sum + r.rawMetrics.totalResponses, 0) / variantResults.length;
    const avgViolations = variantResults.reduce((sum, r) => sum + r.rawMetrics.consecutiveSpeakerViolations, 0) / variantResults.length;
    const avgLength = variantResults.reduce((sum, r) => sum + r.rawMetrics.avgResponseLength, 0) / variantResults.length;
    
    summaryTable += `| ${variantId} | ${variantResults.length} | ${avgResponses.toFixed(1)} | ${avgViolations.toFixed(2)} | ${Math.round(avgLength)} |\n`;
  }

  return `# Experiment Summary: ${config.name}

**Experiment ID:** ${config.id}
**Phase:** ${config.phase}
**Model:** ${config.modelId}
**Timestamp:** ${new Date().toISOString()}

## Configuration

- **Personas:** ${config.personas.join(', ')}
- **Test Prompts:** ${config.testPrompts.length}
- **Turns per Conversation:** ${config.turnsPerConversation}
- **Runs per Variant:** ${config.runsPerVariant}
- **Total Runs:** ${results.length}

## Test Prompts

${config.testPrompts.map((p, i) => `${i + 1}. "${p}"`).join('\n')}

## Results Summary

${summaryTable}

## Key Observations

*[To be filled in after review]*

## Next Steps

*[To be filled in after analysis]*

---

*Generated by ablation experiment runner*
`;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options: CLIOptions = {
    phase: undefined,
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    variantFilter: [],
    force: args.includes('--force') || args.includes('-f'),
  };

  // Parse --phase
  const phaseIdx = args.indexOf('--phase');
  if (phaseIdx !== -1 && args[phaseIdx + 1]) {
    options.phase = args[phaseIdx + 1] as 'director' | 'persona' | 'cross';
  }

  // Parse --variant
  const variantIdx = args.indexOf('--variant');
  if (variantIdx !== -1 && args[variantIdx + 1]) {
    options.variantFilter = [args[variantIdx + 1]];
  }

  // Default to director phase if not specified
  const phase = options.phase || 'director';
  const config = getExperimentByPhase(phase);

  await runExperiment(config, options);
}

main().catch(console.error);
