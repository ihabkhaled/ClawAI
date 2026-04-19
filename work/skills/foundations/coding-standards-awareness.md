---
id: coding-standards-awareness
title: Coding standards awareness
category: foundations
level: mandatory
depends_on:
  - foundations/repo-understanding
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# Coding standards awareness

## Purpose

ESLint in ClawAI is strict by design. Every rule exists because we got burned without it. Learning the rules pre-empts 80% of review churn.

## When to use

- Every code change.
- Before opening a PR.

## Inputs required

- `CLAUDE.md` — Universal Code Rules, ESLint Rules

## Workflow

1. Remember the absolute rules:
   - No `any`
   - No `eslint-disable`
   - No string literal unions (use enums)
   - No inline types/interfaces/enums/constants in logic files
   - No `==` or `!=`
   - No `var`
   - No `process.env` directly (use AppConfig)
   - No `console.log` (use Logger)
   - No `!` non-null assertion
2. Know the extraction rules — types go to `types/`, enums to `common/enums/`, constants to `constants/`, utilities to `common/utilities/`.
3. Run `npm run lint` locally before every commit.
4. Fix root cause, never suppress.

## Strict rules

- **MUST** fix ESLint errors — never suppress with `eslint-disable`. **BLOCKER** if suppressed.
- **MUST** extract types/enums/constants to their dedicated files.
- **MUST NOT** define types/interfaces inline in `*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`, `*.interceptor.ts`, `*.pipe.ts`, `*.module.ts`.
- **MUST** use enums from `src/common/enums/` — never string literal unions for domain values.
- **MUST** use `type` over `interface` unless declaration merging is needed.
- **MUST** use `===` and `!==`.
- **MUST** use `import type` for type-only imports.

## Anti-patterns

- `type X = 'a' | 'b'` — should be an enum.
- `interface User {}` in a controller file — extract to `types/`.
- `if (x == null)` — use `x === null`.
- `process.env.FOO` — read via AppConfig.

## Validation checklist

- [ ] `npm run lint` → 0 errors
- [ ] `npm run typecheck` → 0 errors
- [ ] No inline types in logic files
- [ ] No string literal unions for domain values
- [ ] No `any`
- [ ] No `eslint-disable`

## Quality gate

| Check               | Blocker? | Evidence            |
| ------------------- | -------- | ------------------- |
| ESLint 0 errors     | yes      | `npm run lint`      |
| Typecheck 0 errors  | yes      | `npm run typecheck` |
| No `any` introduced | yes      | Reviewer grep       |

## Test requirements

None for this skill directly — test discipline is in `testing/`.

## Definition of done

1. Lint is green.
2. Typecheck is green.
3. No bypassed rules.

## Examples

- `apps/claw-ollama-service/src/common/enums/business-category.enum.ts` — extracted enum.
- `apps/claw-ollama-service/src/modules/ollama/types/discovery.types.ts` — extracted types.

## References

- `CLAUDE.md` — Universal Code Rules, ESLint Rules, Extraction Rules
