---
id: eslint-compliance
title: ESLint compliance
category: coding-quality
level: mandatory
applies_to:
  - all
status: active
version: 1.0.0
last_reviewed: 2026-04-19
owners:
  - platform-team
---

# ESLint compliance

## Purpose

ESLint in ClawAI is strict by design. Zero errors, zero suppressions, fix root causes.

## Strict rules

- **MUST** `npm run lint` → 0 errors. **BLOCKER**.
- **MUST NOT** add `eslint-disable` comments. Fix the code instead.
- **MUST NOT** bypass lint with `--no-verify`.
- **MUST** run `npm run lint` locally before committing.

## Anti-patterns

- `// eslint-disable-next-line @typescript-eslint/no-explicit-any` to ship an `any`.
- Suppressing a warning instead of investigating.

## Validation checklist

- [ ] `npm run lint` = 0 errors
- [ ] No new `eslint-disable` added
- [ ] Warnings triaged (fix or accept with reason)

## Quality gate

| Check               | Blocker? | Evidence |
| ------------------- | -------- | -------- |
| Lint 0 errors       | yes      | CI       |
| No new suppressions | yes      | Diff     |

## Definition of done

1. Lint clean.
2. No suppressions introduced.

## References

- `CLAUDE.md` — ESLint Rules (Enforced Across All Services)
