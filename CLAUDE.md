# CLAUDE.md — Mastermind Alliance

Open-source AI persona dialogue system with prompt ablation research.

## Quick Start

```bash
npm install
cp .env.example .env.local  # Add your ANTHROPIC_API_KEY
npm run dev
```

## Architecture

```
app/
├── page.tsx              # Landing page
├── mastermind/           # Multi-persona roundtable
└── backrooms/            # Stream-of-consciousness dialogue

lib/
├── mastermind-engine/    # Core conversation logic
├── personas/             # Persona definitions & prompts
├── models.ts             # Model configuration
└── color-generation/     # UI theming

experiments/
└── ablation/             # Prompt engineering research
    ├── runner.ts         # Test runner (with skip logic)
    ├── evaluate.ts       # LLM-as-judge scoring
    ├── results/          # Raw transcripts
    └── docs/solutions/   # Compound learnings
```

## No Authentication

This repo has no auth layer. Users provide their own API keys via `.env.local`.

## Research: Prompt Ablation

The `experiments/ablation/` directory contains a complete prompt ablation study testing which system prompt components are load-bearing vs decorative for famous persona embodiment.

**Key finding:** Minimal prompts (just the persona name) work surprisingly well for famous historical figures. The model's priors are strong enough that explicit style guidance may be redundant.

### Running Ablation Tests

```bash
# Run specific variant (skip logic prevents duplicate runs)
npx tsx experiments/ablation/runner.ts --phase persona --variant alan-watts-minimal

# Force re-run even if results exist
npx tsx experiments/ablation/runner.ts --variant alan-watts-minimal --force

# Run LLM-as-judge evaluation
npx tsx experiments/ablation/evaluate.ts results/*.md
```

## Compound Learning

When solving non-trivial problems, document solutions in:
`experiments/ablation/docs/solutions/<category>/<description>.md`

Search existing solutions before tackling related problems.

## Credits

Built by Marcus Hobbs as part of L3 Prompt Engineering research.
