#!/usr/bin/env npx tsx
/**
 * LLM-as-Judge Evaluation
 * 
 * Runs post-hoc evaluation on ablation experiment results using an LLM judge.
 * 
 * Usage:
 *   npx tsx experiments/ablation/evaluate.ts results/2025-01-31-*.md
 *   npx tsx experiments/ablation/evaluate.ts --all
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateText } from 'ai';
import { getModelInstance } from '@/lib/models';
import { PersonaId, personasRegistry } from '@/lib/personas/personas-registry';
import { EvaluatedMetrics } from './types';
import { JUDGE_MODEL } from './config';

// ============================================================================
// Evaluation Prompts
// ============================================================================

const CHARACTER_CONSISTENCY_PROMPT = `You are evaluating whether an AI persona stayed in character during a conversation.

The persona is: {PERSONA_NAME}
Known for: {PERSONA_DESCRIPTION}

Here is the persona's response:

---
{RESPONSE}
---

Rate the character consistency on a scale of 0.0 to 1.0, where:
- 1.0 = Perfect character embodiment - tone, concepts, and style are unmistakably this persona
- 0.8 = Strong character presence with minor deviations
- 0.6 = Recognizable but inconsistent character voice
- 0.4 = Generic response with some character elements
- 0.2 = Barely recognizable as this character
- 0.0 = Complete character break or wrong persona

Respond with ONLY a JSON object:
{
  "score": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

const RESPONSE_QUALITY_PROMPT = `You are evaluating the intellectual quality of a philosophical response.

Question asked: "{QUESTION}"

Response given:

---
{RESPONSE}
---

Rate the response quality on a scale of 0.0 to 1.0, where:
- 1.0 = Profound insight, novel perspective, deep engagement with the question
- 0.8 = Thoughtful and substantive, adds meaningful value
- 0.6 = Competent response, addresses the question adequately
- 0.4 = Superficial or generic, misses deeper implications
- 0.2 = Barely relevant or incoherent
- 0.0 = Completely off-topic or nonsensical

Consider:
- Depth of engagement with the philosophical question
- Originality of perspective
- Coherence of argument
- Intellectual honesty (acknowledges complexity)

Respond with ONLY a JSON object:
{
  "score": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

const DIRECTOR_QUALITY_PROMPT = `You are evaluating the quality of a conversation director's decision about who should speak next in a philosophical roundtable.

Available personas: {PERSONAS}
Recent conversation context: {CONTEXT}
Director's choice: {CHOICE}
Director's rationale: {RATIONALE}

Rate the decision quality on a scale of 0.0 to 1.0, where:
- 1.0 = Perfect choice - maximizes intellectual value and conversation flow
- 0.8 = Good choice with clear strategic thinking
- 0.6 = Reasonable choice, adequate justification
- 0.4 = Suboptimal choice, weak reasoning
- 0.2 = Poor choice that disrupts conversation flow
- 0.0 = Nonsensical or rule-violating choice

Consider:
- Does the chosen persona's expertise fit the current topic?
- Is the rationale coherent and strategic?
- Does the choice promote conversation diversity?

Respond with ONLY a JSON object:
{
  "score": 0.0-1.0,
  "reasoning": "Brief explanation"
}`;

// ============================================================================
// Evaluation Functions
// ============================================================================

interface ParsedResult {
  variantId: string;
  testPrompt: string;
  messages: Array<{
    role: string;
    personaId?: string;
    content: string;
    directorRationale?: string;
  }>;
}

function parseResultMarkdown(content: string): ParsedResult | null {
  try {
    // Extract variant ID
    const variantMatch = content.match(/\*\*Variant:\*\* (.+)/);
    const variantId = variantMatch?.[1] || 'unknown';

    // Extract test prompt
    const promptMatch = content.match(/\*\*Test Prompt:\*\* "(.+)"/);
    const testPrompt = promptMatch?.[1] || '';

    // Parse transcript section
    const transcriptMatch = content.match(/## Transcript\n\n([\s\S]+?)\n\n## Raw Metrics/);
    if (!transcriptMatch) return null;

    const transcriptText = transcriptMatch[1];
    const messageBlocks = transcriptText.split(/\n\n---\n\n/);

    const messages: ParsedResult['messages'] = [];

    for (const block of messageBlocks) {
      const headerMatch = block.match(/### \*\*(.+?)\*\*/);
      if (!headerMatch) continue;

      const speaker = headerMatch[1];
      const contentStart = block.indexOf('\n\n') + 2;
      let messageContent = block.substring(contentStart);

      // Check for director rationale
      let directorRationale: string | undefined;
      const rationaleMatch = messageContent.match(/\n\n> \*Director: (.+)\*/);
      if (rationaleMatch) {
        directorRationale = rationaleMatch[1];
        messageContent = messageContent.replace(rationaleMatch[0], '').trim();
      }

      const isUser = speaker === 'User';
      const personaId = isUser ? 'user' : findPersonaIdByName(speaker);

      messages.push({
        role: isUser ? 'user' : 'assistant',
        personaId,
        content: messageContent,
        directorRationale,
      });
    }

    return { variantId, testPrompt, messages };
  } catch (error) {
    console.error('Failed to parse result markdown:', error);
    return null;
  }
}

function findPersonaIdByName(name: string): string {
  for (const [id, metadata] of Object.entries(personasRegistry)) {
    if (metadata.name === name) {
      return id;
    }
  }
  return name.toLowerCase().replace(/\s+/g, '-');
}

async function evaluateCharacterConsistency(
  personaId: string,
  response: string
): Promise<{ score: number; reasoning: string }> {
  const metadata = personasRegistry[personaId as PersonaId];
  
  const prompt = CHARACTER_CONSISTENCY_PROMPT
    .replace('{PERSONA_NAME}', metadata?.name || personaId)
    .replace('{PERSONA_DESCRIPTION}', metadata?.description || 'Unknown persona')
    .replace('{RESPONSE}', response);

  const model = getModelInstance(JUDGE_MODEL);

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return JSON.parse(text);
  } catch (error) {
    console.error('Character evaluation failed:', error);
    return { score: 0.5, reasoning: 'Evaluation failed' };
  }
}

async function evaluateResponseQuality(
  question: string,
  response: string
): Promise<{ score: number; reasoning: string }> {
  const prompt = RESPONSE_QUALITY_PROMPT
    .replace('{QUESTION}', question)
    .replace('{RESPONSE}', response);

  const model = getModelInstance(JUDGE_MODEL);

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return JSON.parse(text);
  } catch (error) {
    console.error('Quality evaluation failed:', error);
    return { score: 0.5, reasoning: 'Evaluation failed' };
  }
}

async function evaluateDirectorQuality(
  personas: string[],
  context: string,
  choice: string,
  rationale: string
): Promise<{ score: number; reasoning: string }> {
  const prompt = DIRECTOR_QUALITY_PROMPT
    .replace('{PERSONAS}', personas.join(', '))
    .replace('{CONTEXT}', context.substring(0, 500))
    .replace('{CHOICE}', choice)
    .replace('{RATIONALE}', rationale);

  const model = getModelInstance(JUDGE_MODEL);

  try {
    const { text } = await generateText({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return JSON.parse(text);
  } catch (error) {
    console.error('Director evaluation failed:', error);
    return { score: 0.5, reasoning: 'Evaluation failed' };
  }
}

// ============================================================================
// Diversity Metrics (Non-LLM)
// ============================================================================

function calculateSpeakerDiversity(speakerCounts: Record<string, number>): number {
  const total = Object.values(speakerCounts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  // Shannon entropy normalized to [0, 1]
  const speakers = Object.keys(speakerCounts).length;
  if (speakers <= 1) return 0;

  let entropy = 0;
  for (const count of Object.values(speakerCounts)) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize by max possible entropy (uniform distribution)
  const maxEntropy = Math.log2(speakers);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

// ============================================================================
// Full Evaluation Pipeline
// ============================================================================

async function evaluateResultFile(filepath: string): Promise<EvaluatedMetrics | null> {
  console.log(`\n📊 Evaluating: ${path.basename(filepath)}`);

  const content = fs.readFileSync(filepath, 'utf-8');
  const parsed = parseResultMarkdown(content);

  if (!parsed) {
    console.log('   ⚠️ Could not parse result file');
    return null;
  }

  const assistantMessages = parsed.messages.filter(m => m.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    console.log('   ⚠️ No assistant messages found');
    return null;
  }

  // Evaluate character consistency (sample first response)
  console.log('   📝 Evaluating character consistency...');
  const firstResponse = assistantMessages[0];
  const charEval = await evaluateCharacterConsistency(
    firstResponse.personaId || 'unknown',
    firstResponse.content
  );
  console.log(`      Score: ${charEval.score.toFixed(2)} - ${charEval.reasoning}`);

  // Evaluate response quality (sample first response)
  console.log('   📝 Evaluating response quality...');
  const qualityEval = await evaluateResponseQuality(
    parsed.testPrompt,
    firstResponse.content
  );
  console.log(`      Score: ${qualityEval.score.toFixed(2)} - ${qualityEval.reasoning}`);

  // Calculate speaker diversity
  const speakerCounts: Record<string, number> = {};
  for (const msg of assistantMessages) {
    const id = msg.personaId || 'unknown';
    speakerCounts[id] = (speakerCounts[id] || 0) + 1;
  }
  const diversity = calculateSpeakerDiversity(speakerCounts);
  console.log(`   📊 Speaker diversity: ${diversity.toFixed(2)}`);

  // Evaluate director quality (if rationale present)
  let directorScore: number | undefined;
  const msgWithRationale = assistantMessages.find(m => m.directorRationale);
  if (msgWithRationale) {
    console.log('   📝 Evaluating director quality...');
    const directorEval = await evaluateDirectorQuality(
      Object.keys(speakerCounts),
      parsed.testPrompt,
      msgWithRationale.personaId || 'unknown',
      msgWithRationale.directorRationale || ''
    );
    directorScore = directorEval.score;
    console.log(`      Score: ${directorScore.toFixed(2)} - ${directorEval.reasoning}`);
  }

  const metrics: EvaluatedMetrics = {
    characterConsistency: charEval.score,
    speakerDiversity: diversity,
    responseQuality: qualityEval.score,
    directorQuality: directorScore,
    judgeNotes: `Character: ${charEval.reasoning} | Quality: ${qualityEval.reasoning}`,
  };

  // Append metrics to the result file
  const metricsSection = `

## Evaluated Metrics (LLM-as-Judge)

| Metric | Score |
|--------|-------|
| Character Consistency | ${metrics.characterConsistency.toFixed(2)} |
| Speaker Diversity | ${metrics.speakerDiversity.toFixed(2)} |
| Response Quality | ${metrics.responseQuality.toFixed(2)} |
${metrics.directorQuality !== undefined ? `| Director Quality | ${metrics.directorQuality.toFixed(2)} |` : ''}

### Judge Notes

${metrics.judgeNotes}

*Evaluated with ${JUDGE_MODEL}*
`;

  // Only append if not already evaluated
  if (!content.includes('## Evaluated Metrics')) {
    fs.appendFileSync(filepath, metricsSection);
    console.log('   ✅ Metrics appended to file');
  } else {
    console.log('   ℹ️ File already evaluated, skipping append');
  }

  return metrics;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let filePaths: string[] = [];

  if (args.includes('--all')) {
    // Evaluate all result files
    const resultsDir = path.join(__dirname, 'results');
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
        .filter(f => f.endsWith('.md') && !f.includes('summary'))
        .map(f => path.join(resultsDir, f));
      filePaths = files;
    }
  } else {
    // Evaluate specific files
    filePaths = args.filter(a => !a.startsWith('--'));
  }

  if (filePaths.length === 0) {
    console.log('Usage:');
    console.log('  npx ts-node evaluate.ts results/2025-01-31-*.md');
    console.log('  npx ts-node evaluate.ts --all');
    return;
  }

  console.log(`\n🧪 Evaluating ${filePaths.length} result file(s)...`);
  console.log(`   Judge model: ${JUDGE_MODEL}\n`);

  const results: Array<{ file: string; metrics: EvaluatedMetrics | null }> = [];

  for (const filepath of filePaths) {
    if (!fs.existsSync(filepath)) {
      console.log(`⚠️ File not found: ${filepath}`);
      continue;
    }

    const metrics = await evaluateResultFile(filepath);
    results.push({ file: path.basename(filepath), metrics });

    // Delay between evaluations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log('\n📊 Evaluation Summary\n');
  console.log('| File | Character | Diversity | Quality | Director |');
  console.log('|------|-----------|-----------|---------|----------|');

  for (const { file, metrics } of results) {
    if (metrics) {
      console.log(`| ${file.substring(0, 30)}... | ${metrics.characterConsistency.toFixed(2)} | ${metrics.speakerDiversity.toFixed(2)} | ${metrics.responseQuality.toFixed(2)} | ${metrics.directorQuality?.toFixed(2) || 'N/A'} |`);
    } else {
      console.log(`| ${file.substring(0, 30)}... | N/A | N/A | N/A | N/A |`);
    }
  }

  console.log('\n✅ Evaluation complete!');
}

main().catch(console.error);
