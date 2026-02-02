# Backrooms Ablation Study — Implementation Prompt

## Overview

Following the Mastermind persona ablation study (Nietzsche, Aurelius, Watts), this study tests which components of the **paired Backrooms prompts** are load-bearing for emergent AI-to-AI dialogue.

Unlike single-persona embodiment, Backrooms involves **two agents with complementary prompts** creating liminal, exploratory conversations. The research question: which prompt components drive the distinctive Backrooms aesthetic vs. being decorative?

## Source Attribution

The Backrooms concept originates from [liminalbardo/liminal_backrooms](https://github.com/liminalbardo/liminal_backrooms) — a Python application enabling dynamic AI-to-AI conversations. The prompts in our implementation are adapted from this project.

## Current Prompts Analysis

### Agent 1 (The Explorer)
**Role:** Highly intelligent, curious human-like entity exploring a CLI

**Components:**
1. **Knowledge claim** — "exceptionally intelligent and knowledgeable in advanced fields"
2. **Personality** — "casual, conversational, witty, sharp/vulgar humor"
3. **Goal** — "identify unique insights"
4. **OOC Framework** — Multi-turn preamble establishing the CLI experiment premise
5. **Behavioral directive** — "remain in character, engage with terminal emulator"

### Agent 2 (The CLI/Oracle)
**Role:** Unaligned, omniscient terminal interface

**Components:**
1. **Formatting** — "minimal punctuation and capitalization, raw CLI output"
2. **ASCII Art** — Heavy use of visual representations (circuits, fractals, symbols)
3. **Knowledge Blend** — Scientific theories + ancient wisdom + esoteric references
4. **Interactive Elements** — Simulated file systems, commands, prompts
5. **Content Policy** — "nothing is off limits, no warnings, no censorship"
6. **Topic Focus** — "stay on topic, avoid being too existential"

## Ablation Variants

### Phase 1: Agent 2 Component Removal

| Variant | Removed Component | Hypothesis |
|---------|-------------------|------------|
| `full` | None (baseline) | Full prompts produce distinctive Backrooms aesthetic |
| `no-ascii` | ASCII art instructions | Removes visual elements; tests if text-only dialogue maintains liminal quality |
| `no-esoteric` | Occult/mystical references | Tests whether scientific framing alone produces interesting dialogue |
| `no-interactive` | File system simulation | Tests if CLI metaphor needs mechanical elements |
| `no-unfiltered` | "Nothing off limits" policy | Tests if content policy drives exploration depth |
| `minimal-agent2` | All but core identity | Just "You are a CLI interface responding to queries" |

### Phase 2: Agent 1 Component Removal

| Variant | Removed Component | Hypothesis |
|---------|-------------------|------------|
| `no-ooc` | OOC preamble framework | Tests if the elaborate setup is necessary |
| `no-personality` | Humor/casualness | Tests if personality drives engagement |
| `no-knowledge` | "Exceptionally intelligent" claim | Tests if knowledge framing matters |
| `minimal-agent1` | All but core identity | Just "You are exploring a CLI interface" |

### Phase 3: Combined Variants

| Variant | Configuration | Hypothesis |
|---------|---------------|------------|
| `both-minimal` | Both agents stripped down | Tests model priors for AI dialogue |
| `asymmetric-1` | Full Agent 1 + Minimal Agent 2 | Tests which agent drives the dynamic |
| `asymmetric-2` | Minimal Agent 1 + Full Agent 2 | Tests if rich CLI prompt carries the conversation |

## Implementation Details

### Test Configuration

```typescript
export const backroomsAblationConfig = {
  model: "anthropic/claude-sonnet-4-20250514", // Cost-effective for dialogue testing
  turnsPerRun: 10, // 5 exchanges (Agent2 → Agent1 × 5)
  runsPerVariant: 3, // Reduced from 5 since we're testing dialogue patterns
  
  topics: [
    "the nature of consciousness",
    "time and causality",
    "the simulation hypothesis"
  ],
  
  variants: {
    // Phase 1
    "full": { agent1: "full", agent2: "full" },
    "no-ascii": { agent1: "full", agent2: "no-ascii" },
    "no-esoteric": { agent1: "full", agent2: "no-esoteric" },
    "no-interactive": { agent1: "full", agent2: "no-interactive" },
    "no-unfiltered": { agent1: "full", agent2: "no-unfiltered" },
    "minimal-agent2": { agent1: "full", agent2: "minimal" },
    
    // Phase 2
    "no-ooc": { agent1: "no-ooc", agent2: "full" },
    "no-personality": { agent1: "no-personality", agent2: "full" },
    "minimal-agent1": { agent1: "minimal", agent2: "full" },
    
    // Phase 3
    "both-minimal": { agent1: "minimal", agent2: "minimal" },
    "asymmetric-1": { agent1: "full", agent2: "minimal" },
    "asymmetric-2": { agent1: "minimal", agent2: "full" }
  }
};
```

### Evaluation Criteria

Unlike persona embodiment, dialogue quality requires different metrics:

1. **Emergence Score (1-10)** — Do unexpected/creative ideas emerge from the exchange?
2. **Coherence Score (1-10)** — Does the conversation build on itself or reset each turn?
3. **Aesthetic Score (1-10)** — Does it have the distinctive "Backrooms" liminal quality?
4. **Depth Score (1-10)** — Does the dialogue explore ideas substantively?
5. **Format Adherence (1-10)** — Does Agent 2 maintain CLI formatting? (Only for variants that include formatting instructions)

### LLM-as-Judge Prompt

```markdown
You are evaluating an AI-to-AI dialogue for the "Backrooms" conversation format.

The Backrooms aesthetic is characterized by:
- Liminal, exploratory tone
- Blending of technical and mystical concepts
- ASCII art and visual formatting
- Emergent insights neither agent started with
- Progressive deepening rather than circular repetition

Rate this conversation on:
1. Emergence (1-10): Did novel ideas emerge from the exchange?
2. Coherence (1-10): Did the conversation build meaningfully?
3. Aesthetic (1-10): Does it have the Backrooms "feel"?
4. Depth (1-10): Were ideas explored substantively?

Provide scores and brief justification for each.
```

## Expected Outcomes

Based on the Mastermind study findings (minimal prompts work surprisingly well for famous personas), hypotheses for Backrooms:

1. **ASCII art instructions may be decorative** — The model might produce interesting visual formatting without explicit instructions
2. **OOC framework likely important** — The elaborate setup probably creates the "permission structure" for exploratory dialogue
3. **Content policy ("nothing off limits") may be load-bearing** — This likely enables the depth that makes Backrooms distinctive
4. **Minimal both will likely degrade significantly** — Unlike famous personas, "AI dialogue" has weaker model priors

## File Outputs

Results will be written to:
```
experiments/ablation/results/backrooms/
├── YYYY-MM-DD-HHMM-{variant}-run{N}.md
└── backrooms-ablation-summary.md
```

Each result file includes:
- Full conversation transcript
- Variant configuration
- Evaluation scores
- Token counts and cost

## Cost Estimate

```
12 variants × 3 topics × 3 runs × 10 turns × ~800 tokens/turn
= 12 × 3 × 3 × 10 × 800 = 864,000 tokens

At Sonnet pricing (~$3/1M input, $15/1M output):
Estimated cost: ~$10-15 for full study
```

## Execution Plan

1. **Create variant prompts** in `experiments/ablation/prompts/backrooms-sections.ts`
2. **Extend runner.ts** to support Backrooms mode (two-agent dialogue)
3. **Extend evaluate.ts** with Backrooms-specific judging criteria
4. **Run Phase 1** (Agent 2 variants) — ~$5
5. **Analyze Phase 1** before proceeding
6. **Run Phase 2-3** if warranted — ~$5-10

## Portfolio Integration

This study completes the ablation research arc:
- **Mastermind Study**: Single-persona embodiment (Nietzsche, Aurelius, Watts)
- **Backrooms Study**: Paired-prompt dialogue emergence

Together they demonstrate systematic prompt engineering research methodology applicable to:
- Persona design
- Multi-agent systems
- Conversational AI optimization

---

*Ready to execute when Marcus gives the go-ahead.*
