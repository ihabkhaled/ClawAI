---
id: code-quality-gate
title: Code quality gate
category: quality-gates
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Code quality gate

## Pass criteria

- `npm run lint` → 0 errors across affected workspaces
- `npm run typecheck` → 0 errors across affected workspaces
- `npm run build` → success across affected workspaces
- No `eslint-disable` added
- No `any` added
- No `@ts-ignore` added
- Commitlint passes

## Fail criteria (any = blocked)

- 1+ lint error
- 1+ typecheck error
- 1+ build error
- New suppressions detected
- New `any` or `@ts-ignore`
- Commit message convention violated

## Evidence required

- CI log (lint, typecheck, build steps green)
- Diff shows no suppression tokens

## Blocker severity

**HARD BLOCKER.** No waivers.
