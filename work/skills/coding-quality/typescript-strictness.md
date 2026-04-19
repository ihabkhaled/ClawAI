---
id: typescript-strictness
title: TypeScript strictness
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

# TypeScript strictness

## Purpose

`strict` mode is on for a reason. Every escape hatch introduced is a lie we pay for later.

## Strict rules

- **MUST NOT** use `any`. Use `unknown`, generics, or proper types. **BLOCKER**.
- **MUST NOT** use `!` non-null assertion. Handle nullability explicitly.
- **MUST NOT** use `@ts-ignore` or `@ts-expect-error` without a tracked issue + expiry date.
- **MUST** use `import type { … }` for type-only imports.
- **MUST** provide explicit return types on exported functions.
- **MUST** prefer `type` over `interface` unless declaration merging is needed.

## Anti-patterns

- `const x = data as any;`
- `const x = data!;`
- `// @ts-ignore` on a problem you'll "fix later".

## Validation checklist

- [ ] `npm run typecheck` = 0 errors
- [ ] No new `any`
- [ ] No new `!`
- [ ] No new `@ts-ignore`

## Quality gate

| Check                 | Blocker? | Evidence |
| --------------------- | -------- | -------- |
| Typecheck clean       | yes      | CI       |
| No `any` grep matches | yes      | grep     |

## Definition of done

1. Typecheck green.
2. No escape hatches added.

## References

- `CLAUDE.md` — Universal Code Rules
