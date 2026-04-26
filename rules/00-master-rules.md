# ClawAI — Master Rules

> Every AI agent (Claude, Codex, Cursor, Copilot, or any other) working on this codebase MUST read and obey every rule in this folder. These rules override default AI behavior. There are no exceptions and no situational bypasses.

## What This Folder Is

`rules/` is the single authoritative source of constraints for every contribution to ClawAI — human or AI. Each file covers one responsibility domain. All rules are strict, non-negotiable, and enforced by pre-commit hooks and CI.

## Rule Files

| File                   | Domain                                                                |
| ---------------------- | --------------------------------------------------------------------- |
| `01-planning-rules.md` | Phase 0–0g: planning gate before every change                         |
| `02-backend-rules.md`  | NestJS architecture: controllers, services, managers, repos           |
| `03-frontend-rules.md` | Next.js architecture: pages, hooks, components, state                 |
| `04-testing-rules.md`  | **Mandatory testing**: TDD, unit, API (20-25×), UI, QA, UAT, coverage |
| `05-infra-rules.md`    | Docker, Nginx, CI, .env, shared packages                              |
| `06-docs-rules.md`     | Documentation: when, where, what format                               |
| `07-commit-rules.md`   | Conventional commits, PR rules, branch rules                          |
| `08-security-rules.md` | Security: secrets, auth, input validation, OWASP                      |
| `09-refactor-rules.md` | **Refactor discipline**: extraction, dedup, logging, coverage, splits |

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
