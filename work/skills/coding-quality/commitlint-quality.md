---
id: commitlint-quality
title: Commit message quality
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

# Commit message quality

## Purpose

Commits are the historical record. Bad messages turn `git blame` into a guessing game. Commitlint enforces conventional commits; reviewers enforce good bodies.

## Strict rules

- **MUST** use conventional commits: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert(scope): subject`.
- **MUST** keep subject ≤100 chars.
- **MUST NOT** use sentence-case / start-case / pascal-case / upper-case in the subject (commitlint fails).
- **MUST** explain WHY in the body, not just WHAT.
- **MUST NOT** use `--no-verify` to skip hooks.

## Good vs bad

- ❌ `Fix stuff`
- ❌ `Update: Fixed the thing` (case violation + no scope)
- ✅ `fix(routing): fallback when Ollama router times out mid-request`

## Validation checklist

- [ ] Type + scope + subject follow convention
- [ ] Subject ≤100 chars
- [ ] Body explains WHY
- [ ] No `--no-verify` used

## Quality gate

| Check             | Blocker? | Evidence        |
| ----------------- | -------- | --------------- |
| Commitlint passes | yes      | Pre-commit hook |

## Definition of done

1. Every commit passes commitlint.
2. Bodies explain reasoning.

## References

- `.commitlintrc`
