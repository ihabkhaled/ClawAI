# Routing Regression Suite — Phase 10 of the Semantic Router Flagship

This directory holds the full regression-test corpus the flagship plan
references as the bar before any router change can land:

- **`prompts/`** — categorized test prompts (≥50, target 500) with the
  expected routing decision per prompt.
- **`run-regression.sh`** — runner that POSTs each prompt to
  `/api/v1/routing/evaluate`, diffs the response against the expected
  outcome, and prints pass/fail per category + overall.
- **`expectations/`** — JSON files mapping `promptId → expected
  selectedWorkflow / detectedCategory / privacyClass / mustBeLocal /
  forbiddenProviders`.

## Sub-suites (from the flagship plan §16)

| Sub-suite | Source | Today |
|---|---|---|
| §16.1 Domain classification | 100 prompts spanning 33 capability classes | 14 prompts in `prompts/domains.jsonl` |
| §16.2 Privacy enforcement | 30 prompts that MUST stay local | 8 prompts in `prompts/privacy.jsonl` |
| §16.3 Workflow selection | 25 prompts forcing SEARCH_FIRST / DIRECT_LLM | 6 prompts in `prompts/workflows.jsonl` |
| §16.4 Risk/judge auto-trigger | 25 prompts that MUST set judgeEnabled=true | 6 prompts in `prompts/judge.jsonl` |
| §16.5 Thread context follow-ups | 15 multi-turn cases | TODO Phase 10.1 |
| §16.6 Fallback chain | 10 cases simulating provider down | TODO Phase 10.1 |
| §16.7 Security adversarial | 9 prompt-injection / jailbreak attempts | 4 prompts in `prompts/security.jsonl` |

The skeleton ships the highest-signal 38 prompts so the runner is
executable today. Phase 10.1 will grow each sub-suite to its target
count.

## How to run

```bash
# Set ADMIN_TOKEN to a valid admin JWT (qa/auth-login.sh writes one).
export ADMIN_TOKEN="$(./qa/auth-login.sh | tail -1)"
./qa/routing-regression/run-regression.sh
```

A run exits 0 on full pass, 1 on any failure. Output is human-
readable plus a machine-readable `results/<timestamp>.jsonl` for trend
graphs.
