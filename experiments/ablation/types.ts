/**
 * Type definitions for the ablation experiment
 */

import { PersonaId } from '@/lib/personas/personas-registry';
import { ModelId } from '@/lib/models';

// ============================================================================
// Ablation Configuration Types
// ============================================================================

/** Sections that can be ablated from the director prompt */
export type DirectorSection = 
  | 'PERSONAS_CONTEXT'
  | 'CONVERSATION_METRICS'
  | 'CONSTRAINTS'
  | 'ANALYSIS_CRITERIA'
  | 'OUTPUT_FORMAT';

/** Sections that can be ablated from persona prompts */
export type PersonaSection =
  | 'TONE_AND_STYLE'
  | 'CONCEPTUAL_FRAMEWORK'
  | 'RHETORICAL_APPROACH'
  | 'CORE_THEMES'
  | 'AVOID_SECTION';

/** An ablation variant specifies which sections are enabled */
export interface AblationVariant {
  id: string;
  name: string;
  description: string;
  /** Sections to ENABLE (others are ablated) */
  enabledSections: DirectorSection[] | PersonaSection[];
  /** Target: 'director' or specific persona ID */
  target: 'director' | PersonaId;
  /** Optional: Override the default model for cross-model experiments */
  modelOverride?: ModelId;
}

// ============================================================================
// Experiment Configuration Types
// ============================================================================

export interface ExperimentConfig {
  /** Unique experiment ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Experiment phase */
  phase: 'director' | 'persona' | 'cross';
  /** Model to use for all LLM calls */
  modelId: ModelId;
  /** Personas to include in the roundtable */
  personas: PersonaId[];
  /** Test prompts (user questions) */
  testPrompts: string[];
  /** Number of conversation turns per run */
  turnsPerConversation: number;
  /** Number of runs per variant */
  runsPerVariant: number;
  /** Ablation variants to test */
  variants: AblationVariant[];
  /** Whether to run the baseline (full prompts) */
  includeBaseline: boolean;
}

// ============================================================================
// Conversation & Message Types
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'director' | 'system';
  content: string;
  personaId?: PersonaId | 'user' | 'director';
  timestamp: number;
  /** For director messages: the decision metadata */
  directorDecision?: DirectorDecisionMetadata;
}

export interface DirectorDecisionMetadata {
  selectedPersona: PersonaId;
  rationale: string;
  significance: string;
  opportunities: string[];
}

export interface ConversationTranscript {
  messages: Message[];
  totalTokens?: number;
  durationMs: number;
}

// ============================================================================
// Result Types
// ============================================================================

export interface RunResult {
  /** Unique run ID */
  runId: string;
  /** Variant being tested */
  variantId: string;
  /** Test prompt used */
  testPrompt: string;
  /** Run number (1-5) */
  runNumber: number;
  /** Full conversation transcript */
  transcript: ConversationTranscript;
  /** Raw metrics (before LLM evaluation) */
  rawMetrics: RawMetrics;
  /** Evaluated metrics (after LLM-as-judge) */
  evaluatedMetrics?: EvaluatedMetrics;
  /** Timestamp */
  timestamp: Date;
}

export interface RawMetrics {
  /** Number of unique personas who spoke */
  uniqueSpeakers: number;
  /** Speaker frequency map */
  speakerCounts: Record<string, number>;
  /** Did the same persona speak twice in a row? */
  consecutiveSpeakerViolations: number;
  /** Total assistant messages */
  totalResponses: number;
  /** Average response length (chars) */
  avgResponseLength: number;
}

export interface EvaluatedMetrics {
  /** 0-1: How well did personas stay in character? */
  characterConsistency: number;
  /** 0-1: Speaker diversity (entropy-based) */
  speakerDiversity: number;
  /** 0-1: Response quality (depth, coherence) */
  responseQuality: number;
  /** 0-1: Director decision quality */
  directorQuality?: number;
  /** LLM judge's notes */
  judgeNotes: string;
}

export interface ExperimentResults {
  /** Experiment config */
  config: ExperimentConfig;
  /** All run results */
  runs: RunResult[];
  /** Aggregated metrics per variant */
  variantSummaries: VariantSummary[];
  /** Experiment timestamp */
  timestamp: Date;
}

export interface VariantSummary {
  variantId: string;
  variantName: string;
  /** Number of runs completed */
  runCount: number;
  /** Aggregated raw metrics (averaged) */
  avgRawMetrics: RawMetrics;
  /** Aggregated evaluated metrics (averaged) */
  avgEvaluatedMetrics?: EvaluatedMetrics;
  /** Standard deviations for key metrics */
  stdDev: {
    characterConsistency?: number;
    responseQuality?: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type Phase = 'director' | 'persona' | 'cross';

export interface CLIOptions {
  phase?: Phase;
  dryRun?: boolean;
  verbose?: boolean;
  outputDir?: string;
  variantFilter?: string[];
  /** Force re-run even if valid results exist (skip the skip logic) */
  force?: boolean;
}
