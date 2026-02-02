# Ablation Experiment Results

This directory contains the output from ablation experiment runs.

## File Naming Convention

```
YYYY-MM-DD-HHMM-{variant-id}-run{N}.md
```

Example: `2025-01-31-1430-nietzsche-no-tone-run3.md`

## File Structure

Each result file contains:

1. **Configuration** - Variant, test prompt, model, enabled sections
2. **Transcript** - Full conversation with director decisions
3. **Raw Metrics** - Speaker counts, violations, response lengths
4. **Evaluated Metrics** - LLM-as-judge scores (added by evaluate.ts)
5. **Notes** - Space for manual observations

## Summary Files

Files ending in `-summary.md` contain aggregated metrics across all runs for an experiment.

## Gitignore

Individual run files are gitignored to keep the repo clean. Summary files are kept.

Add this to your `.gitignore`:
```
experiments/ablation/results/*.md
!experiments/ablation/results/README.md
!experiments/ablation/results/*-summary.md
```
