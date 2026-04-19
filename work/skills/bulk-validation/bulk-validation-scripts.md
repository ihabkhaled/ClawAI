---
id: bulk-validation-scripts
title: Bulk validation scripts
category: bulk-validation
level: recommended
applies_to:
  - backend-service
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - qa-lead
---

# Bulk validation scripts

## Purpose

When behavior depends on many permutations (role × endpoint × method × state), write a generator-driven script that runs them all.

## Workflow

1. Enumerate dimensions: roles × endpoints × methods × states.
2. Generate the matrix in bash or a Node/Python script.
3. For each cell, execute + assert expected status code.
4. Log to a structured file (JSON lines).
5. Fail the script if any cell deviates from expected.
6. Save evidence to `.claude/Integrations/<feature>__bulk-output.json`.

## Strict rules

- **MUST** keep scripts deterministic.
- **MUST** log per-case results for triage.
- **MUST NOT** run against prod.

## Anti-patterns

- Running 1,000 cases with no progress logging.
- Hiding failures behind `|| true`.

## Validation checklist

- [ ] Matrix dimensions explicit
- [ ] Deterministic seeds
- [ ] Per-case logging
- [ ] Aggregate pass/fail at end

## Quality gate

| Check          | Blocker? | Evidence      |
| -------------- | -------- | ------------- |
| Script exits 0 | yes      | Script output |

## Definition of done

1. Script runs to completion.
2. All cases pass.
3. Evidence saved.
