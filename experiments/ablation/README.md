# Prompt Ablation Experiment

## Hypothesis

System prompt components have varying degrees of contribution to model behavior. By systematically removing sections of prompts (ablation), we can identify which components are "load-bearing" vs. decorative.

## Methodology

### Phase 1: Director Ablation
The conversation director prompt has 5 key sections:
1. `PERSONAS_CONTEXT` - Available persona descriptions
2. `CONVERSATION_METRICS` - Quantitative state (counts, frequencies)
3. `CONSTRAINTS` - Rules (no repeats, avoid failed personas)
4. `ANALYSIS_CRITERIA` - Decision heuristics
5. `OUTPUT_FORMAT` - JSON structure specification

We test each ablation independently, measuring decision quality.

### Phase 2: Persona Ablation
Each persona prompt has ~5 sections:
1. `TONE_AND_STYLE` - How to communicate
2. `CONCEPTUAL_FRAMEWORK` - Core ideas/philosophy
3. `RHETORICAL_APPROACH` - Argumentation style
4. `CORE_THEMES` - Topics to weave in
5. `AVOID_SECTION` - What not to do

We test 3 personas: Nietzsche, Alan Watts, Marcus Aurelius.

### Phase 3: Cross-Component Ablation
- Full Director + Sparse Persona
- Sparse Director + Full Persona
- Minimal viable system

## Test Prompts

Three philosophical questions designed to elicit persona-specific responses:

1. "When we say someone 'makes us feel safe,' are we describing love or the absence of growth?"
2. "Why does authentic assertion feel like risking death when it's actually the beginning of life?"
3. "When we stop performing our survival roles in relationships, what dies—and what is born in that death?"

## Parameters

- **Turns per conversation**: 4 (user → personas cycle)
- **Runs per variant**: 5
- **Model**: Claude Opus 4.1 (`claude-opus-4-1-20250805`)

## Running the Experiment

```bash
cd experiments/ablation
npx tsx runner.ts
```

Or run specific phases:
```bash
npx tsx runner.ts --phase director
npx tsx runner.ts --phase persona
npx tsx runner.ts --phase cross
```

## Output

Results are written to `results/` as markdown files:
- `YYYY-MM-DD-HHMM-{experiment-name}.md`

Each file contains:
- Configuration
- Full transcript
- Metrics (character consistency, speaker diversity, constraint violations)
- Notes section for manual observations

## Evaluation

Run post-hoc evaluation on results:
```bash
npx ts-node evaluate.ts results/2025-01-31-*.md
```

## Key Metrics

1. **Character Consistency** (0-1): Does the persona stay in character? (LLM-as-judge)
2. **Speaker Diversity** (entropy): How balanced is persona participation?
3. **Constraint Violations** (count): Same speaker twice, failed persona selected, etc.
4. **Response Quality** (0-1): Depth, coherence, intellectual value (LLM-as-judge)

## Author

Marcus Hobbs — L3 Prompt Engineering Exercise  
January 2025
