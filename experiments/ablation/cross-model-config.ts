/**
 * Cross-Model Ablation Experiment
 * 
 * Tests the "famousness hypothesis" across model capability tiers:
 * Do weaker models need more prompting to access the same persona priors?
 * 
 * Design:
 * - Single persona (Nietzsche) for controlled comparison
 * - 4 models across capability spectrum
 * - 2 prompt variants (full vs minimal) to maximize contrast
 * - Same test prompts as persona ablation study
 * 
 * Hypothesis:
 * - If priors are in training data, they should be accessible at all capability levels
 * - But weaker models may need more explicit prompting to reliably access them
 * - This tests the boundary of "prompt as capability amplifier"
 */

import { ModelId } from '@/lib/models';
import { PersonaId } from '@/lib/personas/personas-registry';
import { AblationVariant, PersonaSection } from './types';
import { ALL_PERSONA_SECTIONS, TEST_PROMPTS } from './config';

// ============================================================================
// Model Capability Tiers
// ============================================================================

export interface ModelTier {
  id: ModelId;
  name: string;
  tier: 'weak' | 'mid' | 'mid' | 'strong';
  releaseDate: string;
  description: string;
  estimatedCostPer1kTokens: { input: number; output: number };
}

export const MODEL_TIERS: ModelTier[] = [
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Haiku 3.5',
    tier: 'weak',
    releaseDate: '2024-10-22',
    description: 'Smallest, fastest, cheapest — tests minimum viable capability',
    estimatedCostPer1kTokens: { input: 0.00025, output: 0.00125 },
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Sonnet 4.5',
    tier: 'mid',
    releaseDate: '2025-09-29',
    description: 'Latest Sonnet — current mid-tier capability',
    estimatedCostPer1kTokens: { input: 0.003, output: 0.015 },
  },
  {
    id: 'claude-opus-4-1-20250805',
    name: 'Opus 4.1',
    tier: 'strong',
    releaseDate: '2025-08-05',
    description: 'Flagship model — maximum capability (existing data)',
    estimatedCostPer1kTokens: { input: 0.015, output: 0.075 },
  },
];

// ============================================================================
// Cross-Model Variants
// ============================================================================

export const CROSS_MODEL_PERSONA: PersonaId = 'friedrich-nietzsche';

/**
 * Generate variants for cross-model study
 * Each model gets full and minimal variants
 */
export function createCrossModelVariants(): AblationVariant[] {
  const variants: AblationVariant[] = [];
  
  for (const model of MODEL_TIERS) {
    // Full variant - all persona sections enabled
    variants.push({
      id: `nietzsche-${model.tier}-full`,
      name: `Nietzsche on ${model.name} (Full)`,
      description: `Full persona prompt on ${model.name}`,
      enabledSections: ALL_PERSONA_SECTIONS,
      target: CROSS_MODEL_PERSONA,
      modelOverride: model.id,
    });
    
    // Minimal variant - no persona sections
    variants.push({
      id: `nietzsche-${model.tier}-minimal`,
      name: `Nietzsche on ${model.name} (Minimal)`,
      description: `Minimal prompt (name only) on ${model.name}`,
      enabledSections: [],
      target: CROSS_MODEL_PERSONA,
      modelOverride: model.id,
    });
  }
  
  return variants;
}

export const CROSS_MODEL_VARIANTS = createCrossModelVariants();

// ============================================================================
// Experiment Configuration
// ============================================================================

export const CROSS_MODEL_EXPERIMENT = {
  id: 'cross-model-ablation-v1',
  name: 'Cross-Model Capability Ablation',
  phase: 'cross-model',
  description: `
    Tests whether weaker models need more prompting to access persona priors.
    
    Key questions:
    1. Does Haiku produce recognizable Nietzsche with minimal prompting?
    2. Is there a capability threshold where prompting becomes necessary?
    3. Does the "minimal works fine" finding generalize across model sizes?
  `,
  personas: [CROSS_MODEL_PERSONA],
  testPrompts: TEST_PROMPTS,
  turnsPerConversation: 4,
  runsPerVariant: 5,
  variants: CROSS_MODEL_VARIANTS,
  
  // Analysis dimensions
  analysisQuestions: [
    'Character consistency: Does the model maintain Nietzsche voice?',
    'Conceptual depth: Does it reference actual Nietzsche philosophy?',
    'Prompt sensitivity: How much does full vs minimal affect output?',
    'Capability threshold: Where does minimal prompting break down?',
  ],
};

// ============================================================================
// Cost Estimation
// ============================================================================

export function estimateCrossModelCost(): {
  totalRuns: number;
  byModel: Record<string, { runs: number; estimatedCost: number }>;
  totalEstimatedCost: number;
} {
  const avgTokensPerRun = {
    input: 2000,  // ~2k tokens of prompt + context
    output: 1500, // ~1.5k tokens of response per conversation
  };
  
  const result: Record<string, { runs: number; estimatedCost: number }> = {};
  let totalCost = 0;
  
  // Skip Opus since we already have that data
  const modelsToRun = MODEL_TIERS.filter(m => m.tier !== 'strong');
  
  for (const model of modelsToRun) {
    const runsPerModel = 2 * TEST_PROMPTS.length * 5; // 2 variants × 3 prompts × 5 runs = 30
    const inputCost = (avgTokensPerRun.input / 1000) * model.estimatedCostPer1kTokens.input * runsPerModel * 4; // 4 turns
    const outputCost = (avgTokensPerRun.output / 1000) * model.estimatedCostPer1kTokens.output * runsPerModel * 4;
    const modelCost = inputCost + outputCost;
    
    result[model.name] = {
      runs: runsPerModel,
      estimatedCost: Math.round(modelCost * 100) / 100,
    };
    totalCost += modelCost;
  }
  
  return {
    totalRuns: modelsToRun.length * 2 * TEST_PROMPTS.length * 5,
    byModel: result,
    totalEstimatedCost: Math.round(totalCost * 100) / 100,
  };
}

// ============================================================================
// Print Summary
// ============================================================================

if (require.main === module) {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         CROSS-MODEL ABLATION EXPERIMENT DESIGN                  ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log('║                                                                  ║');
  console.log('║  HYPOTHESIS: Famous persona priors exist across model sizes,    ║');
  console.log('║  but weaker models may need more prompting to access them.      ║');
  console.log('║                                                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('MODEL TIERS:');
  console.log('─'.repeat(70));
  for (const model of MODEL_TIERS) {
    const existing = model.tier === 'strong' ? ' ✓ EXISTING DATA' : '';
    console.log(`  ${model.tier.padEnd(10)} │ ${model.name.padEnd(20)} │ ${model.releaseDate}${existing}`);
  }
  console.log('');
  
  console.log('VARIANTS:');
  console.log('─'.repeat(70));
  for (const variant of CROSS_MODEL_VARIANTS) {
    console.log(`  ${variant.id}`);
  }
  console.log('');
  
  const cost = estimateCrossModelCost();
  console.log('COST ESTIMATE (excluding existing Opus data):');
  console.log('─'.repeat(70));
  for (const [model, data] of Object.entries(cost.byModel)) {
    console.log(`  ${model.padEnd(20)} │ ${data.runs} runs │ ~$${data.estimatedCost.toFixed(2)}`);
  }
  console.log('─'.repeat(70));
  console.log(`  TOTAL: ${cost.totalRuns} new runs │ ~$${cost.totalEstimatedCost.toFixed(2)}`);
  console.log('');
  
  console.log('TEST PROMPTS:');
  console.log('─'.repeat(70));
  for (const prompt of TEST_PROMPTS) {
    console.log(`  "${prompt.substring(0, 65)}..."`);
  }
}
