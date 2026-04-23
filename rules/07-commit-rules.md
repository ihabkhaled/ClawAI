# ClawAI — Commit and PR Rules

---

## Conventional Commits Format

```
<type>(<scope>): <subject>

<body — WHY, not WHAT>

<footer>
```

**Types**: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`

**Subject**: max 100 chars, lowercase, no period at end, no PascalCase, no UPPER_CASE

**Body**: Explain WHY the change was needed. The diff shows WHAT changed.

**Footer**: `Co-Authored-By: <AI-name> <noreply@...>`

Examples:

```
feat(connector): add Ollama cloud catalog sync

Connector sync was limited to locally installed models. Users couldn't
discover or select cloud Ollama models without knowing model names.
Now syncs 200+ models from ollama.com catalog.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

```
fix(chat): route OLLAMA connector provider to callOllama()

Provider comparison only checked 'local-ollama'. Connectors created
with provider=OLLAMA (uppercase) fell through to cloud provider call,
which failed silently and triggered local fallback with wrong model.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## Commit Chunking

Chunk commits by logical boundary, not by time:

```
Commit 1: schema migration (Prisma change)
Commit 2: backend implementation (service, manager, controller, DTO)
Commit 3: events (shared-types, publisher, consumer)
Commit 4: frontend implementation (types, hooks, components, page, i18n)
Commit 5: infrastructure (env, docker, nginx, CI)
Commit 6: tests (unit, QA script)
Commit 7: docs (CLAUDE.md, docs/ files)
```

---

## Pre-commit Hook (Never Skip)

```
1. prettier --write        (format staged files)
2. npm run lint            (ESLint 0 errors)
3. npm run typecheck       (TypeScript 0 errors)
4. npm run build           (production build success)
5. npm run test            (all tests pass)
```

**NEVER `--no-verify`.** If a hook fails, fix the underlying issue.

If the pre-commit hook fails and you create a new commit to fix it, NEVER use `--amend` — it modifies the previous commit. Create a fresh commit.

---

## Branch Rules

- Primary branch: `main`
- Feature branches: `feat/<feature-name>`
- Fix branches: `fix/<issue-description>`
- Never force-push to `main` without explicit user approval
- Delete branches after merge

---

## PR Rules

PR title = conventional commit subject line.

PR body must include:

```markdown
## Summary

- What changed (3 bullets max)

## Test evidence

- Unit tests: X passing
- API QA: X/Y passing (link to qa/ script)
- Manual UI: tested loading/empty/error/success states

## Checklist

- [ ] All 18 infra items verified
- [ ] QA script run with 0 failures
- [ ] Docs updated
```

---

## What Never Goes in a Commit

- TypeScript errors
- ESLint errors
- Commented-out code blocks
- `console.log` statements
- `eslint-disable` comments
- `@ts-ignore` or `@ts-expect-error` comments
- TODO comments that aren't tracked issues
- Hardcoded secrets (API keys, passwords, tokens)
- Inline types/enums/consts in restricted files
