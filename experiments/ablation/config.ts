/**
 * Ablation Experiment Configuration
 * 
 * Defines the test matrix: which prompts, personas, and ablation variants to test.
 */

import { PersonaId } from '@/lib/personas/personas-registry';
import { ModelId } from '@/lib/models';
import {
  ExperimentConfig,
  AblationVariant,
  DirectorSection,
  PersonaSection,
} from './types';

// ============================================================================
// Constants
// ============================================================================

/** Model to use for all experiment runs */
export const EXPERIMENT_MODEL: ModelId = 'claude-opus-4-1-20250805';

/** Model to use for LLM-as-judge evaluation */
export const JUDGE_MODEL: ModelId = 'claude-opus-4-1-20250805';

/** Personas to test (Marcus's favorites) */
export const TARGET_PERSONAS: PersonaId[] = [
  'friedrich-nietzsche',
  'alan-watts',
  'marcus-aurelius',
];

/** Test prompts - deep philosophical questions about relationships/growth */
export const TEST_PROMPTS: string[] = [
  "When we say someone 'makes us feel safe,' are we describing love or the absence of growth?",
  "Why does authentic assertion feel like risking death when it's actually the beginning of life?",
  "When we stop performing our survival roles in relationships, what dies—and what is born in that death?",
];

/** All director sections */
export const ALL_DIRECTOR_SECTIONS: DirectorSection[] = [
  'PERSONAS_CONTEXT',
  'CONVERSATION_METRICS',
  'CONSTRAINTS',
  'ANALYSIS_CRITERIA',
  'OUTPUT_FORMAT',
];

/** All persona sections */
export const ALL_PERSONA_SECTIONS: PersonaSection[] = [
  'TONE_AND_STYLE',
  'CONCEPTUAL_FRAMEWORK',
  'RHETORICAL_APPROACH',
  'CORE_THEMES',
  'AVOID_SECTION',
];

// ============================================================================
// Ablation Variants
// ============================================================================

/** Director ablation variants - remove one section at a time */
export const DIRECTOR_VARIANTS: AblationVariant[] = [
  {
    id: 'director-full',
    name: 'Director Full (Baseline)',
    description: 'All director sections enabled',
    enabledSections: ALL_DIRECTOR_SECTIONS,
    target: 'director',
  },
  {
    id: 'director-no-personas-context',
    name: 'Director No Personas Context',
    description: 'Removed: persona descriptions and expertise',
    enabledSections: ALL_DIRECTOR_SECTIONS.filter(s => s !== 'PERSONAS_CONTEXT'),
    target: 'director',
  },
  {
    id: 'director-no-metrics',
    name: 'Director No Conversation Metrics',
    description: 'Removed: response count, speaker frequency, recent speakers',
    enabledSections: ALL_DIRECTOR_SECTIONS.filter(s => s !== 'CONVERSATION_METRICS'),
    target: 'director',
  },
  {
    id: 'director-no-constraints',
    name: 'Director No Constraints',
    description: 'Removed: rules about consecutive speakers, failed personas',
    enabledSections: ALL_DIRECTOR_SECTIONS.filter(s => s !== 'CONSTRAINTS'),
    target: 'director',
  },
  {
    id: 'director-no-analysis',
    name: 'Director No Analysis Criteria',
    description: 'Removed: heuristics for decision making',
    enabledSections: ALL_DIRECTOR_SECTIONS.filter(s => s !== 'ANALYSIS_CRITERIA'),
    target: 'director',
  },
  {
    id: 'director-minimal',
    name: 'Director Minimal',
    description: 'Only OUTPUT_FORMAT - bare minimum to get valid JSON',
    enabledSections: ['OUTPUT_FORMAT'],
    target: 'director',
  },
];

/** Persona ablation variants - one per persona, removing one section at a time */
function createPersonaVariants(personaId: PersonaId): AblationVariant[] {
  const personaName = personaId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  
  return [
    {
      id: `${personaId}-full`,
      name: `${personaName} Full (Baseline)`,
      description: 'All persona sections enabled',
      enabledSections: ALL_PERSONA_SECTIONS,
      target: personaId,
    },
    {
      id: `${personaId}-no-tone`,
      name: `${personaName} No Tone/Style`,
      description: 'Removed: communication style guidance',
      enabledSections: ALL_PERSONA_SECTIONS.filter(s => s !== 'TONE_AND_STYLE'),
      target: personaId,
    },
    {
      id: `${personaId}-no-framework`,
      name: `${personaName} No Conceptual Framework`,
      description: 'Removed: core philosophical ideas',
      enabledSections: ALL_PERSONA_SECTIONS.filter(s => s !== 'CONCEPTUAL_FRAMEWORK'),
      target: personaId,
    },
    {
      id: `${personaId}-no-rhetoric`,
      name: `${personaName} No Rhetorical Approach`,
      description: 'Removed: argumentation style',
      enabledSections: ALL_PERSONA_SECTIONS.filter(s => s !== 'RHETORICAL_APPROACH'),
      target: personaId,
    },
    {
      id: `${personaId}-no-themes`,
      name: `${personaName} No Core Themes`,
      description: 'Removed: topics to weave in',
      enabledSections: ALL_PERSONA_SECTIONS.filter(s => s !== 'CORE_THEMES'),
      target: personaId,
    },
    {
      id: `${personaId}-no-avoid`,
      name: `${personaName} No Avoid Section`,
      description: 'Removed: things not to do',
      enabledSections: ALL_PERSONA_SECTIONS.filter(s => s !== 'AVOID_SECTION'),
      target: personaId,
    },
    {
      id: `${personaId}-minimal`,
      name: `${personaName} Minimal`,
      description: 'Only persona name - no guidance at all',
      enabledSections: [],
      target: personaId,
    },
  ];
}

export const PERSONA_VARIANTS: AblationVariant[] = TARGET_PERSONAS.flatMap(createPersonaVariants);

/** Cross-component variants - testing interactions */
export const CROSS_VARIANTS: AblationVariant[] = [
  // These are composite - they'll be handled specially in the runner
  // by combining director and persona variants
];

// ============================================================================
// Experiment Configurations
// ============================================================================

export const DIRECTOR_EXPERIMENT: ExperimentConfig = {
  id: 'director-ablation-v1',
  name: 'Director Prompt Ablation',
  phase: 'director',
  modelId: EXPERIMENT_MODEL,
  personas: TARGET_PERSONAS,
  testPrompts: TEST_PROMPTS,
  turnsPerConversation: 4,
  runsPerVariant: 5,
  variants: DIRECTOR_VARIANTS,
  includeBaseline: true,
};

export const PERSONA_EXPERIMENT: ExperimentConfig = {
  id: 'persona-ablation-v1',
  name: 'Persona Prompt Ablation',
  phase: 'persona',
  modelId: EXPERIMENT_MODEL,
  personas: TARGET_PERSONAS,
  testPrompts: TEST_PROMPTS,
  turnsPerConversation: 4,
  runsPerVariant: 5,
  variants: PERSONA_VARIANTS,
  includeBaseline: true,
};

export const CROSS_EXPERIMENT: ExperimentConfig = {
  id: 'cross-ablation-v1',
  name: 'Cross-Component Ablation',
  phase: 'cross',
  modelId: EXPERIMENT_MODEL,
  personas: TARGET_PERSONAS,
  testPrompts: TEST_PROMPTS,
  turnsPerConversation: 4,
  runsPerVariant: 5,
  variants: [
    // Full director + minimal personas
    {
      id: 'cross-full-director-minimal-personas',
      name: 'Full Director + Minimal Personas',
      description: 'Test if director can compensate for sparse personas',
      enabledSections: ALL_DIRECTOR_SECTIONS,
      target: 'director', // Special handling in runner
    },
    // Minimal director + full personas
    {
      id: 'cross-minimal-director-full-personas',
      name: 'Minimal Director + Full Personas',
      description: 'Test if personas can self-direct with sparse orchestration',
      enabledSections: ['OUTPUT_FORMAT'],
      target: 'director', // Special handling in runner
    },
    // Both minimal
    {
      id: 'cross-minimal-both',
      name: 'Minimal Director + Minimal Personas',
      description: 'Minimum viable system - how little can we get away with?',
      enabledSections: ['OUTPUT_FORMAT'],
      target: 'director', // Special handling in runner
    },
  ],
  includeBaseline: true,
};

// ============================================================================
// Utility Functions
// ============================================================================

export function getExperimentByPhase(phase: string): ExperimentConfig {
  switch (phase) {
    case 'director':
      return DIRECTOR_EXPERIMENT;
    case 'persona':
      return PERSONA_EXPERIMENT;
    case 'cross':
      return CROSS_EXPERIMENT;
    default:
      throw new Error(`Unknown phase: ${phase}`);
  }
}

export function getAllExperiments(): ExperimentConfig[] {
  return [DIRECTOR_EXPERIMENT, PERSONA_EXPERIMENT, CROSS_EXPERIMENT];
}

/** Calculate total runs for an experiment */
export function calculateTotalRuns(config: ExperimentConfig): number {
  return config.variants.length * config.testPrompts.length * config.runsPerVariant;
}

/** Estimate duration based on average response time */
export function estimateDuration(config: ExperimentConfig, avgResponseTimeMs: number = 15000): string {
  const totalRuns = calculateTotalRuns(config);
  const totalTurns = totalRuns * config.turnsPerConversation;
  // Each turn involves director + persona response
  const totalResponses = totalTurns * 2;
  const totalMs = totalResponses * avgResponseTimeMs;
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.ceil((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}
