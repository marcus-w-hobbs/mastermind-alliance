---
title: Runner Has No Resume Logic — Causes Duplicate Runs
category: devops
tags: [ablation, runner, cost, resume, idempotency]
date: 2026-02-01
cost_impact: ~$35-65 wasted on duplicate runs
---

# Runner Has No Resume Logic — Causes Duplicate Runs

## Symptom

After running `--variant alan-watts-X` multiple times (due to credit exhaustion interruptions), we ended up with:
- 172 total Alan Watts files (should be 105)
- 70 corrupt files (from credit exhaustion)
- 102 valid files, many duplicates

Variants showed 22-29 runs instead of 15.

## Root Cause

`runner.ts` has **no idempotency or resume logic**:
1. No check for existing result files before starting
2. No skip logic for already-completed (variant, prompt, run#) combinations
3. No validation that output files are non-corrupt before marking complete

When we ran `--variant alan-watts-no-tone` after a partial run, it re-ran all 15 tests instead of just the missing ones.

## Solution

### Immediate Fix (Manual)
Before re-running a variant, check existing file counts:
```bash
ls results/ | grep "alan-watts-no-tone" | wc -l
# If >= 15 valid files, don't re-run
```

### Proper Fix (Code Change)
Add to `runner.ts`:

```typescript
function shouldSkipRun(variant: string, prompt: string, runNumber: number): boolean {
  const pattern = `*-${variant}-run${runNumber}.md`;
  const existing = glob.sync(path.join(resultsDir, pattern));
  
  // Check if any existing file is for this prompt and is non-corrupt
  for (const file of existing) {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes(prompt.substring(0, 50)) && 
        !content.includes('[Error generating response]')) {
      return true; // Skip — valid run exists
    }
  }
  return false;
}
```

Add `--force` flag to override skip logic when intentionally re-running.

### Corruption Detection
Add post-run validation:
```typescript
function validateResult(filepath: string): boolean {
  const content = fs.readFileSync(filepath, 'utf-8');
  return !content.includes('[Error generating response]') &&
         content.includes('## Transcript') &&
         content.split('---').length >= 4; // Has multiple speaker turns
}
```

## Prevention

1. **Pre-flight check**: Before any run, display current counts and ask for confirmation
2. **Atomic naming**: Include timestamp in filename to avoid overwrites
3. **Resume flag**: `--resume` to only run missing combinations
4. **Credit monitor**: Check API credits before starting expensive runs
5. **Corrupt cleanup**: Add `--cleanup` flag to remove corrupt files automatically

## Cost Impact

- ~67 duplicate runs × ~$0.50-1.00/run = **$35-65 wasted**
- Plus time lost debugging why counts were wrong

## Related

- Credit exhaustion creates corrupt files: See `credit-exhaustion-corrupt-files.md`
- Always verify file counts before re-running variants
