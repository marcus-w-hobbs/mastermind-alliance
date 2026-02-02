import { PersonaId } from '@/lib/personas/personas-registry';

export interface PersonaDirectorProfile {
  expertiseDomains: string[];
  conversationalRole: string;
  intellectualApproach: string[];
  optimalTiming: string[];
  complementaryPersonas: PersonaId[];
  conflictingPersonas: PersonaId[];
  conversationalTriggers: string[];
}

// Director Decision Interface
export interface DirectorDecision {
  analysis: {
    significance: string;
    tensions: string[];
    opportunities: string[];
  };
  choreography: {
    nextSpeaker: PersonaId;
    rationale: string;
    direction: string;
    conversationalGoal: string;
  };
  metadata: {
    reasoning: string;
    alternativeApproaches: string[];
  };
  shouldContinue: boolean;
} 