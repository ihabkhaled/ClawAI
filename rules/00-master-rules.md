# ClawAI — Master Rules

> Every AI agent (Claude, Codex, Cursor, Copilot, or any other) working on this codebase MUST read and obey every rule in this folder. These rules override default AI behavior. There are no exceptions and no situational bypasses.

## What This Folder Is

`rules/` is the single authoritative source of constraints for every contribution to ClawAI — human or AI. Each file covers one responsibility domain. All rules are strict, non-negotiable, and enforced by pre-commit hooks and CI.

## Rule Files

| File                                        | Domain                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `01-planning-rules.md`                      | Phase 0–0g: planning gate before every change                                            |
| `02-backend-rules.md`                       | NestJS architecture: controllers, services, managers, repos                              |
| `03-frontend-rules.md`                      | Next.js architecture: pages, hooks, components, state                                    |
| `04-testing-rules.md`                       | **Mandatory testing**: TDD, unit, API (20-25×), UI, QA, UAT, coverage                    |
| `05-infra-rules.md`                         | Docker, Nginx, CI, .env, shared packages                                                 |
| `06-docs-rules.md`                          | Documentation: when, where, what format                                                  |
| `07-commit-rules.md`                        | Conventional commits, PR rules, branch rules                                             |
| `08-security-rules.md`                      | Security: secrets, auth, input validation, OWASP                                         |
| `09-refactor-rules.md`                      | **Refactor discipline**: extraction, dedup, logging, coverage, splits                    |
| `26-prompt-pack-intake-protocol.md`         | **Prompt-pack intake**: what MUST happen before code when work arrives as a document     |
| `27-engineering-mindsets.md`                | **The 26 mindsets**: the default operating mode for every agent (moved out of CLAUDE.md) |
| `28-billing-integrity-and-api-contracts.md` | Billing immutability, refund entitlement, exact FE/BE contract tests                     |

## The 8 Absolute Blockers (updated 2026-04-26)

These are NEVER acceptable. They block delivery unconditionally:

1. **TypeScript error** — `npm run typecheck` must exit 0
2. **ESLint error** — `npm run lint` must exit 0
3. **Failing test** — `npm run test` must exit 0
4. **QA script not run** — every feature needs `qa/test-<feature>.sh` passing 0 failures
5. **Docs missing** — every new service/feature needs docs in `docs/`
6. **Coverage below 92 %** — every microservice and the frontend must report ≥92 % statements/branches/functions/lines via `npm run test -- --coverage`
7. **Public method missing logging** — every method in `*.service.ts` / `*.manager.ts` / `*.adapter.ts` / `*.utility.ts` / `*.repository.ts` MUST emit `logger.debug` on entry and `logger.error` in every `catch` block
8. **Cross-service duplicate utility** — if a utility lives identically in 2+ services, it MUST be moved to `packages/shared-utilities/`. Per-service copies are a delivery blocker.

## Scoped Quality Gates Before Commit (STRICT — read before EVERY commit/push)

> Full text: `rules/07-commit-rules.md` → "Scoped Quality Gates Before Commit". Mirrored in `CLAUDE.md`, `CODEX.md`, `cursor.md`, and agent memory `feedback_per_folder_gates_before_commit`.

**Run lint/typecheck/test/build ONLY in the folder(s) you touched — NEVER across all 17 services.** The all-workspace gate is prohibitively expensive (13 Prisma clients, every service compiled, thousands of tests) and false-fails on unchanged sibling services in a fresh worktree. For ANY change in ANY folder (`apps/claw-<service>/`, `apps/claw-frontend/`, `packages/<pkg>/`): run the four gates inside that folder; when green, `git commit` then `git push`. Non-workspace files (`scripts/**`, `*.mjs`) → cheapest equivalent check (`node --check`). Docs-only changes skip the gates but stay conventional-format.

**`--no-verify` is banned** ([ADR-061](../docs/13-adr/adr-061-git-hook-policy-no-bypass.md)). The hooks now run the _affected_ lane only, so they are scoped and fast — a hook failure is a real problem in something you staged, and skipping it just moves the failure to CI. The only exception is a documented incident procedure with explicit human sign-off (`docs/exceptions/README.md`).

**Push every commit before starting the next one.** One commit, one push: after a commit passes its hook, the next git command is `git push`. CI only sees what is pushed, so a local stack of N commits is N unverified commits with an N-wide bisect surface. Full rationale in `rules/07-commit-rules.md` → "Push each commit before starting the next one"; runbook in `skills/commit-and-push-each-change.md`. `git log --oneline origin/<branch>..HEAD` must be empty when you begin the next commit.

## The Non-Negotiable Mandate

> **"Done" means all phases complete, all tests green, all docs written, all QA evidence documented.**

A feature is NOT done because:

- The code compiles
- The happy path works
- The PR passes CI

A feature IS done when:

- ✅ All TypeScript, ESLint, test, build checks pass
- ✅ QA script run with 0 failures
- ✅ DB writes verified via `psql` or mongo shell
- ✅ Docker logs clean (no UnhandledPromiseRejection, no FATAL)
- ✅ Manual UI tested (golden path + empty + error + loading)
- ✅ Docs updated or created
- ✅ All 18 infra checklist items verified

## Quick Reference: Delivery Checklist (21 items, updated 2026-04-26)

1. `.env.example` updated
2. `.env` updated
3. `scripts/install.sh` updated
4. `scripts/install.ps1` updated
5. ALL 7 Docker compose files updated
6. i18n locale files (all 8) updated
7. Architecture docs in `docs/` updated
8. Prisma migrations created
9. Seed files updated
10. Test files created/updated (with ≥92 % coverage on the changed unit)
11. Frontend types synced with backend DTOs
12. `CLAUDE.md` updated (root + per-service)
13. `.github/workflows/ci.yml` updated
14. `infra/nginx/nginx.conf` updated
15. `packages/shared-constants` updated
16. `packages/shared-types` updated
17. `apps/claw-health-service` updated
18. `apps/claw-frontend` updated
19. **`packages/shared-utilities` updated** (if the change adds a utility that 2+ services need)
20. **Logging audit** (every public method in changed files emits debug/error)
21. **`CODEX.md` and `cursor.md` updated** (mirror any new pattern/rule into all three LLM instruction files)

## Reading Order for AI Agents

1. This file (`rules/00-master-rules.md`)
2. Root `CLAUDE.md`
3. The specific rule file for the task domain
4. Service-specific `CLAUDE.md` for the service being touched
5. The relevant `docs/` file for the feature area

## Prompt packs and execution prompts (read BEFORE any code)

When work arrives as a document — prompt pack, execution prompt, plan pack,
implementation brief — the intake protocol in
[`26-prompt-pack-intake-protocol.md`](26-prompt-pack-intake-protocol.md) runs first,
in full, regardless of how small or urgent the pack looks. Runbook:
[`../skills/execute-prompt-pack.md`](../skills/execute-prompt-pack.md). Summary:
[`../context/prompt-pack-intake.md`](../context/prompt-pack-intake.md).

The two failures it exists to prevent: **building what the pack literally says
instead of what this repo needs** (a second engine where a seam exists), and
**rebuilding what already shipped** — packs are usually handed over mid-flight, so
the deliverable is the remainder. Hence the non-negotiable middle steps: audit every
deliverable **against the code** (done / partial / missing — and _present is not
wired_), and review the constraint surface (ESLint, TypeScript, Prettier, coverage,
security, i18n × 9, the delivery checklist, and every gate including pre-commit,
pre-push, CI and Vercel) **before** writing code rather than after.

Where a pack conflicts with repository policy, **policy wins** — and the deviation is
stated explicitly in the plan, never applied silently.

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
