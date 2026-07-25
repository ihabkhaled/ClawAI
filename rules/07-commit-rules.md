# ClawAI — Commit and PR Rules

---

## Scoped Quality Gates Before Commit (MANDATORY — STRICT — applies to EVERY change, EVERYWHERE)

> **Read this section before EVERY commit/push. No exceptions.** It is mirrored in `CLAUDE.md`, `CODEX.md`, `cursor.md`, and the agent memory `feedback_per_folder_gates_before_commit`. Policy authority: [ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md).

**The pre-commit hook is now scoped + fast** — it lint-stages only the staged files, checks knowledge freshness, and typechecks ONLY the workspaces your staged changes touch (`tools/affected/index.mjs typecheck --staged`). It does NOT run the old expensive all-workspace gate. Because it is cheap and scoped, there is **no reason to ever bypass it**. `--no-verify` is banned (ADR-061); `knowledge:verify` scans the canonical docs and fails on any `--no-verify` recommendation.

**Run the manual gates ONLY in the folder(s) you actually touched — as a confidence check before you commit, not as a replacement for the hook. NEVER run the full all-workspace lint/typecheck/test/build.** This repo is 17 backend services + the frontend + 6 shared packages. An all-workspace gate run generates 13 Prisma clients, compiles every service, and executes thousands of tests — many minutes of CPU for a one-file change. It is the wrong default for an agent on two counts: it is **prohibitively expensive**, and it **false-fails** on unchanged sibling services whose Prisma client isn't generated in a fresh worktree.

**The rule — for ANY change, in ANY folder:**

1. Identify which workspace folder(s) you edited: `apps/claw-<service>/`, `apps/claw-frontend/`, or `packages/<shared-pkg>/`.
2. Run the four gates INSIDE each touched folder ONLY:

```bash
cd apps/claw-<service>      # or apps/claw-frontend, or packages/<pkg>
npx tsgo --noEmit          # 0 errors  (frontend: npm run typecheck)
npm run lint               # 0 errors on touched files (pre-existing warnings on untouched files OK)
npm test                   # all tests pass; coverage may not drop
npm run build              # success
```

3. Multi-folder change → run the gates for EACH touched folder, never for the untouched ones.
4. Non-workspace files with no gate (`scripts/**`, `infra/**`, plain `*.mjs`) → do the cheapest equivalent check (`node --check <file>`, JSON/schema validate). Do NOT trigger an all-workspace run "to be safe".
5. When ALL gates for the touched folders are green, commit and let the hook run (it re-verifies the scoped subset):

```bash
git commit -m "<conventional-commit-message>"
git push origin <branch>
```

**Never use `--no-verify`** (nor `-c core.hooksPath=/dev/null` or any other bypass). The hook is scoped and fast; a failure in it is a real problem in something you staged — fix it, don't skip it. The only exception is a documented incident procedure with explicit human sign-off (see `docs/exceptions/README.md`).

**Hard limits (never violate):**

- NEVER skip a gate for a folder you changed.
- NEVER bypass the pre-commit / pre-push hook with `--no-verify` (or any equivalent).
- NEVER expand to the all-workspace gate after the touched-folder gates pass.
- Docs-only changes (`docs/**`, `CLAUDE.md`, `CODEX.md`, `cursor.md`, `rules/**`, locale files paired with `i18n.types.ts`) still run the (fast) hook and stay conventional-commit format.

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

## Generated artifacts are a HARD GATE (never optional)

`.ai/**`, every workspace `AGENTS.md`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` are
**generated from the tree**. CI verifies them on every push:

| CI job              | Command                    | Fails when                                                           |
| ------------------- | -------------------------- | -------------------------------------------------------------------- |
| Knowledge freshness | `npm run knowledge:check`  | a generated file's hash no longer matches the tree                   |
| Knowledge integrity | `npm run knowledge:verify` | stale file, broken link, orphan reviewer, hook-bypass, contradiction |
| Inventory audit     | `npm run audit:check`      | the inventory snapshot hash has drifted                              |

**A stale artifact turns the build red on every subsequent push**, for everyone,
until someone regenerates it. It is not a warning and it is not deferrable.

### The rule

Any commit that touches `packages/**`, `apps/**`, `infra/**`, `docker/**`,
`docs/**`, `scripts/**`, `rules/**`, `skills/**`, `tools/**` or `.env.example`
MUST regenerate and stage:

```bash
npm run knowledge:build      # rewrites .ai/** + workspace AGENTS.md
npm run audit                # rewrites the inventory snapshot
git add .ai docs/features/ai-native-engineering-os/inventory.snapshot.json
git add apps/*/AGENTS.md packages/*/AGENTS.md 2>/dev/null
npm run knowledge:verify     # what CI runs
npm run audit:check          # what CI runs
```

The pre-commit hook now does all of this **automatically**, so in normal use
there is nothing to remember. The rule is written down because the hook can be
skipped (it must not be) and because a red CI needs a documented fix.

### Order matters — regenerate AFTER formatting, never before

This is the mistake that actually caused a red build:

1. `npm run knowledge:build` — hashes the current bytes
2. `git add` / commit — **lint-staged reformats the staged files**
3. the reformatted bytes no longer match the hashes recorded in step 1
4. `knowledge:check` passes locally (it ran before the reformat) but
   `knowledge:verify` fails in CI

Generators must run **after** prettier and `eslint --fix` have settled. The
pre-commit hook is ordered that way deliberately: lint-staged is step 1,
regeneration is step 2.

### Never hand-edit a generated artifact

If a generated file is wrong, fix the **generator or its input**, then
regenerate. Editing `.ai/manifests/*.json` or a workspace `AGENTS.md` by hand is
overwritten on the next build and hides the real problem.
