# Rule 27 — The ClawAI engineering mindsets

> Extracted verbatim from `CLAUDE.md`, which had grown past the point where an
> agent could load it without cost. This file is now the canonical home; the root
> policy file links here rather than restating it.

## Purpose

The 26 default operating modes for every agent working on this codebase — human
or AI. They are not aspirational and not situational: they apply to every task,
every change, and every commit, and a reviewer seeing a violation should block the
merge.

## Applies to

Every workspace, every change, every agent (Claude, Codex, Cursor, Gemini, Kimi,
GLM, Qwen, DeepSeek, Mistral, or any other).

## Mandatory rules

**This section is the north star.** Every AI agent working on this codebase — Claude Code, OpenAI Codex, Cursor, or any other — MUST adopt and enforce these mindsets. They are not optional, aspirational, or situational. They apply to every task, every change, every commit.

### 1. Planning-first mindset

- Never write a single line of code without a written plan.
- Phase 0 (requirement + risk + acceptance + failure criteria) is non-skippable.
- If you cannot state the business driver and success metric in one sentence, you do not understand the task.
- Plan → confirm scope → write tests → implement → verify.
- Plans belong in `.claude/Integrations/<feature>__PLAN.md` or the equivalent location for your tool.

### 2. TDD mindset (Test-Driven Development)

- Write failing tests BEFORE writing implementation code.
- Every utility, classifier, normalizer, manager, service, repository, hook, and component has a test file co-located in `__tests__/`.
- Test cases must cover: happy path, boundary conditions, null inputs, empty inputs, error inputs, duplicate inputs, concurrent inputs, and malformed inputs.
- A feature is not built until its tests run and pass.
- Target 98%+ test coverage on all new code. Skip only trivial getters.

### 3. Experimentation mindset

- When the path is unclear, write a throwaway experiment first — inside `.claude/Integrations/experiments/`.
- Validate the approach on 1 small case before scaling to 50.
- If the Ollama scraper picks up CSS classes as tags, fix the parser before onboarding 500 models.
- Every manager and utility should be testable in isolation with a small, obvious example.

### 4. Audit-first mindset

- Before building, read. Before rewriting, audit.
- Understand what exists: schema, existing services, existing tests, existing patterns.
- Reuse patterns (repository → service → manager, adapter factory, SSE subjects, etc.).
- Never introduce a second way to do what the codebase already does once.

### 5. Business-product mindset (productifying)

- Every technical change must connect to a business outcome.
- "What user pain does this fix? What business metric does this move?" — answer these before coding.
- Write the feature summary for a non-technical product manager, not a reviewer.
- Check the product roadmap, feature catalog, and personas before proposing scope.

### 6. QA and intensive testing mindset

- Unit tests are the floor, not the ceiling.
- For every feature, write a `qa/test-<feature>.sh` script that covers:
  - Auth
  - Every endpoint (happy + 400 + 401 + 403 + 404 + 409)
  - DTO validation
  - DB verification via `docker exec … psql -tAc`
  - Docker log check (no `UnhandledPromiseRejection`, no `FATAL`)
- The script must pass 0 failures before the feature is declared done.
- QA is not optional and cannot be skipped.

### 7. Manual API testing mindset

- After writing the QA script, test each endpoint MANUALLY in a second terminal with curl.
- Verify response shape, status code, error codes, headers.
- Test boundary values: 0-length strings, max-length strings, nulls, negatives, enum mismatches.
- Verify pagination, sorting, filtering each work independently.

### 8. Manual UI testing mindset

- After the backend passes QA, test the UI MANUALLY in a real browser.
- Test the golden path end-to-end.
- Test loading, empty, error, and success states for every screen.
- Test RTL mode with Arabic locale.
- Test dark mode.
- Test mobile viewport.
- Test accessibility (tab order, focus rings, aria labels).

### 9. UAT (User Acceptance Testing) mindset

- Ask: "Does a non-technical user understand this feature?"
- Simulate real user workflows, not happy paths.
- Click the wrong buttons. Type the wrong input. Refresh mid-flow.
- A feature passes UAT only when a first-time user can complete the golden path without documentation.

### 10. Bug-free mindset

- Blockers block delivery. Full stop.
- A lint warning is not a blocker. A lint error is.
- A TypeScript error is a blocker.
- A failing test is a blocker.
- An `UnhandledPromiseRejection` in Docker logs is a blocker.
- A 500 on any tested endpoint is a blocker.
- Never use `--no-verify` to bypass hooks. Never mark a task "done" with known bugs.

### 11. Coverage mindset

- Target ≥98% test coverage on new code.
- Run `npm run test:cov` before committing.
- If coverage drops, add tests before merging.
- Coverage is a proxy for "did you actually think about edge cases?"

### 12. Wiring-everything mindset

- Every new service must be wired into:
  - All 7 Docker compose files (not just one)
  - Nginx reverse proxy
  - Health service aggregator
  - `packages/shared-constants` (port + name)
  - `packages/shared-types` (event patterns if publishing)
  - `.env` and `.env.example`
  - `scripts/install.sh` + `scripts/install.ps1`
  - `.github/workflows/ci.yml`
  - i18n (all 13 locales) if user-facing
  - `docs/04-backend/services-index.md`
  - `CLAUDE.md` workspace layout
  - Frontend types, hooks, and pages if user-facing
- A feature is incomplete if any of these are missing.

### 13. No-missing-requirements mindset

- Re-read the user's request 3 times before starting.
- List every verb and every noun in the request as a checklist.
- Map each to an acceptance criterion.
- If something in the request is ambiguous, ask or assume-and-state.
- Don't declare "done" until every item in the original request is checked off.

### 14. Observability mindset

- Every service-level action must log with structured fields.
- Every event must be auditable.
- Every background job must emit a correlation ID.
- Never silently swallow errors. Log, rethrow, or handle explicitly.
- The user who opens Docker logs at 2 AM must be able to trace a request end-to-end.

### 15. Idempotency mindset

- QA scripts must be re-runnable without breaking.
- Migrations must be additive, not destructive.
- API operations must tolerate retries.
- If a side effect could happen twice, design for it.

### 16. Documentation mindset (MANDATORY — non-skippable)

- Every feature must produce or update docs. No exception.
- New service → `docs/04-backend/service-guide-<name>.md`
- New pipeline → `docs/07-integrations/<pipeline>.md` or `docs/03-architecture/<topic>.md`
- New env var → `docs/06-data/environment-variables.md`
- New endpoint → `docs/12-reference/api-reference.md`
- Update `CLAUDE.md` root for any new service, env var, pattern, or mindset rule.
- Update `codex.md` and `cursor.md` so other AI agents follow the same mindset.
- A feature is incomplete if docs are missing or stale.

### 17. Root-cause mindset

- A bug is not fixed when the symptom disappears.
- A bug is fixed when the root cause is understood, tested, and regression-protected.
- If you bypass a failing test, you have not fixed anything.

### 18. Reversibility mindset

- Prefer reversible actions (new commit) over irreversible (amend, force-push, drop table).
- Confirm before: `git push --force`, `rm -rf`, `DROP TABLE`, `git reset --hard`, `kubectl delete`.
- Destructive actions are last resort, never shortcuts.

### 19. Least-code mindset

- Delete more than you add.
- Reuse patterns. Don't abstract prematurely.
- 3 similar lines are better than 1 abstraction nobody reads.
- Comments explain WHY, not WHAT. The code explains WHAT.

### 20. Honest-status mindset

- Don't claim "done" until done.
- Don't hide test failures. Don't hide lint warnings that became errors.
- Don't claim 98% coverage if you skipped the manager's error path.
- If something is incomplete, say so in plain English.

### 21. Logging-coverage mindset (added 2026-04-26)

- Every public method in a `*.service.ts`, `*.manager.ts`, `*.adapter.ts`, `*.utility.ts`, `*.repository.ts` MUST emit at least:
  - `logger.debug(...)` on entry (with non-PII inputs only)
  - `logger.error(...)` in every `catch` block (before rethrow or fallback)
  - `logger.info(...)` for any side-effecting operation (DB write, HTTP call, RabbitMQ publish, file write)
  - `logger.warn(...)` for any retry, fallback, or recoverable degraded path
- A method with zero log statements is a delivery blocker and must be rejected in code review.
- All logs ship automatically to MongoDB via the existing Pino → RabbitMQ `log.server` → `claw-server-logs-service` pipeline (TTL 30 days). NO additional plumbing required per service.
- Never log secrets, tokens, passwords, refresh tokens, API keys, or full request/response bodies that may contain them. Pino redaction config is already in place — extend it, don't bypass it.
- Use NestJS `Logger` (`private readonly logger = new Logger(MyClass.name)`). Never `console.log`. `console.warn` and `console.error` are tolerated only at top of `main.ts` for bootstrap errors.

### 22. Test-coverage flagship mindset (added 2026-04-26)

- Every microservice and the frontend MUST report **≥92 %** coverage on all four jest/vitest metrics: statements, branches, functions, lines.
- Threshold is enforced via `coverageThreshold` in each `jest.config.ts` / `vitest.config.ts` and verified in CI by running `npm run test -- --coverage`.
- Coverage is ratcheted, never lowered: if your change drops a service below its existing threshold, you fix the test gap before merging.
- Test quality bar:
  - No `.toBeDefined()`-only assertions (assert behaviour, not existence)
  - No `xit`, `xdescribe`, `.skip()` (CI rejects)
  - Mocks at boundaries only (DB, HTTP, RabbitMQ, ClamAV, Ollama). Never mock the unit under test.
  - DTO fuzz tests for every Zod schema (valid + boundary + invalid + null/empty/overflow)
  - Manager error-path tests required (every `catch` branch covered)
- Tests live next to the code in `__tests__/`. Backend uses Jest (`.spec.ts`), frontend uses Vitest (`.test.ts` or `.spec.ts`).

### 23. Shared-utilities-first mindset (added 2026-04-26)

- Before writing a utility in `apps/<service>/src/common/utilities/`, search `packages/shared-utilities/`. If it exists there, IMPORT IT — never copy-paste.
- If a utility lives identically in 2+ services, it is a bug. Move it to `packages/shared-utilities/` and replace per-service copies with imports.
- Per-service utilities are reserved for service-specific glue. Anything domain-neutral (HTTP, JWT verification, crypto primitives, URL safety, regex helpers, retry policies, exponential backoff, time helpers, encoding helpers) lives in `packages/shared-utilities/`.
- Cross-service constants live in `packages/shared-constants/`. Cross-service types live in `packages/shared-types/`. Cross-service utilities live in `packages/shared-utilities/`. The three packages cover types / values / functions respectively.

### 24. Inline-extraction mindset (added 2026-04-26)

- Zero inline declarations in any logic file (`*.service.ts`, `*.manager.ts`, `*.controller.ts`, `*.repository.ts`, `*.adapter.ts`, `*.utility.ts`, `*.guard.ts`, `*.filter.ts`, `*.pipe.ts`, `*.module.ts`, `*.interceptor.ts`):
  - inline `type` / `interface` → `src/modules/<domain>/types/<name>.types.ts` (or `src/common/types/`)
  - inline `enum` → `src/common/enums/<name>.enum.ts`
  - inline `const` (top-level, non-Logger) → `src/common/constants/<name>.constants.ts` or `src/modules/<domain>/constants/<name>.constants.ts`
  - standalone `function` declarations → `src/common/utilities/<name>.utility.ts`
  - string-literal-union types (`'a' | 'b' | 'c'`) → enum in `src/common/enums/`
  - `as unknown as X` casts → real types or refactor (banned by ESLint `no-restricted-syntax`)
- Only exception: `private readonly logger = new Logger(MyClass.name)` inside NestJS classes (the standard NestJS pattern).
- Index files (`src/types/index.ts`, `src/enums/index.ts`, `src/constants/index.ts`, `src/utilities/index.ts`, etc.) re-export everything for ergonomic imports.

### 25. Method-size discipline mindset (added 2026-04-26)

- Service method ceiling: **50 lines / complexity 10**. Hard error in Phase U.
- Manager method ceiling: **80 lines / complexity 15**. Hard error in Phase U.
- File ceiling: **500 lines** for all production files (excluding `*.constants.ts`, locale files, generated catalogs).
- A method exceeding its ceiling MUST be split. Extraction targets:
  - Validation logic → private helper
  - Transformation logic → private helper or utility
  - External-call orchestration → manager helper
  - Pure computation → utility file (cross-service if reusable)
- A file exceeding 500 lines MUST be split into multiple files in the same directory or extracted into sub-managers/sub-services.

### 26. Extend-don't-parallelize mindset (added 2026-05-30)

- When the codebase ALREADY ships a layer that solves the problem class (auth pipeline, RBAC, RabbitMQ event bus, SSE rich-progress, http-client retry, repository pattern, capability framework, etc.), **EXTEND that layer** rather than build a second one.
- The audit-first mindset (rule 4) tells you to read first; this rule tells you what to do once you've read: identify the seam, extend through the seam, do NOT introduce a parallel system that re-implements 80% of what already exists.
- Concrete examples in this codebase:
  - Local-runtime rich-progress (PR1, 2026-05-30) extends `ChatStreamService` + `ProviderStreamExecutor` + the existing `@Sse('stream/:threadId')` channel rather than creating a new `claw-runtime-stream-service` and a new SSE endpoint. See `docs/LOCAL_RUNTIME_PROGRESS_ADR.md`.
  - The desktop-agent capability framework (Stream 10) extends `AccessPolicy` rather than introducing a parallel `CapabilityPolicy` table.
  - `@claw/shared-utilities` consolidated per-service `jwt.utility.ts`, `http-client.utility.ts`, `crypto.utility.ts` rather than letting each service keep its own copy.
- If you find yourself writing "a new service that does X but for Y", stop and ask: is there a seam in the existing X-doer that lets me extend it for Y? Almost always the answer is yes.
- Acceptable reasons to build parallel: (a) the existing system is on a deprecation path, (b) the new use case has fundamentally incompatible constraints (different data shape that cannot be subsetted, different security boundary, different SLA), (c) the existing system would be doubled in surface area by accommodating the new case. All three should be challenged in code review.
- When extending, the trade-off pattern is usually: one wider envelope vs N narrow per-case envelopes. The wider envelope wins almost every time — it consolidates client code, lets receivers ignore optional fields, and keeps the mental model "one channel, one contract."

---

**These 26 mindsets are the default operating mode.** Any AI agent that does not follow them is doing it wrong. Any code reviewer seeing a violation should block the merge.

---
