# ClawAI — Cursor Agent Guide

## Scope

This file is the authoritative guide for **Cursor** (and any other IDE-integrated AI coding agent) working on the ClawAI codebase. It mirrors the rules in `CLAUDE.md` but is optimized for Cursor's editing-focused surface.

If you are Cursor, read this file BEFORE making any change. Also read the root `CLAUDE.md` — the rules there apply to every AI agent equally. Differences between the two files are tooling-specific only; the engineering standards, mindsets, and constraints are identical.

## Rules and Skills Folders (Read First)

Before making any change, read:

1. `rules/00-master-rules.md` — The 5 absolute blockers. "Done" definition. Non-negotiable constraints.
2. The relevant rule file for your task:
   - `rules/01-planning-rules.md` for planning/architecture decisions
   - `rules/02-backend-rules.md` for NestJS service changes
   - `rules/03-frontend-rules.md` for Next.js/React changes
   - **`rules/04-testing-rules.md`** for testing requirements — READ THIS before every PR
   - `rules/05-infra-rules.md` for Docker/Nginx/CI/env changes
   - `rules/06-docs-rules.md` for documentation requirements
3. The relevant skill file for your operation:
   - `skills/04-debug-toolkit.md` when diagnosing an issue
   - `skills/05-qa-toolkit.md` when writing tests or QA evidence
   - `skills/06-docker-toolkit.md` for container operations
   - `skills/01-codebase-navigation.md` when exploring unfamiliar code

## Hard Testing Mandate (from rules/04-testing-rules.md)

These are DELIVERY BLOCKERS — a PR without them is rejected:

1. **Unit tests written BEFORE implementation** (TDD) — failing tests first
2. **QA script** in `qa/test-<feature>.sh` with **20-25 API variations** per endpoint (happy + 401 + 403 + 404 + 400 + boundary + null + overflow)
3. **DTO fuzz tests** — every new Zod schema tested for all invalid inputs
4. **DB verification** — `docker exec ... psql -tAc "SELECT COUNT(*) ..."` after every write test
5. **Docker log check** — 0 UnhandledPromiseRejection, 0 FATAL at end of QA
6. **UI manual testing** — real browser: loading / empty / error / success states
7. **Coverage ≥ 95%** on all new code
8. **QA evidence** documented in `.claude/Integrations/<feature>__QA_output.md`

## Mandatory rule

**Follow `CLAUDE.md` and `rules/` exactly.** `CLAUDE.md` defines:

- Architecture (17 NestJS microservices + Next.js + Ollama + 13 PostgreSQL + MongoDB + Redis + RabbitMQ)
- Layer boundaries (Controller → Service → Repository → Manager)
- ESLint rules (no `any`, no inline types, strict enums, no string literal unions)
- The 18-item delivery checklist
- Phases 0–12 of the software development lifecycle
- The 20 engineering mindsets (planning, TDD, audit, QA, UI testing, UAT, bug-free, coverage, wiring, docs, etc.)

Do not deviate from those rules. Do not invent new patterns. Do not bypass tests.

## Cursor-specific workflow

1. **Open `CLAUDE.md` first.** Pin it in your tab bar. Read it every session.
2. **Open the service-specific `CLAUDE.md`** for every service you touch.
3. **Use Cursor's Agent / Compose mode** for multi-file changes — always with an explicit plan.
4. **Use Cursor's inline chat (Cmd+K / Ctrl+K)** for small edits within a file — never for architectural changes.
5. **Use Cursor's indexing** to find related code before editing. Do not grep-replace without reading.

## The 25 mindsets (mirror of CLAUDE.md)

Every mindset in `CLAUDE.md` applies to Cursor identically:

1. Planning-first
2. TDD (write failing tests first)
3. Experimentation (throwaway prototypes in `.claude/Integrations/experiments/`)
4. Audit-first (read before write)
5. Business-product (connect to business outcome)
6. QA + intensive testing (`qa/test-<feature>.sh` with DB + Docker log checks)
7. Manual API testing (curl every endpoint after tests pass)
8. Manual UI testing (real browser, golden path + edge cases)
9. UAT (non-technical user workflow simulation)
10. Bug-free (TypeScript error = blocker, failing test = blocker)
11. Coverage (≥92% per service, all four metrics)
12. Wiring-everything (split compose files in `docker/`, nginx, health, shared packages, CI, i18n, docs)
13. No-missing-requirements (re-read request 3×, checklist every verb)
14. Observability (structured logging, correlation IDs, auditable events)
15. Idempotency (re-runnable QA, additive migrations)
16. Documentation (every feature produces docs — no exception)
17. Root-cause (bug fixed only when root cause understood + regression-protected)
18. Reversibility (prefer reversible actions, confirm before destructive)
19. Least-code (delete more than add, no premature abstraction)
20. Honest-status (never claim done when incomplete)
21. **Logging-coverage** — every public method emits debug/info/warn/error per the rule (added 2026-04-26)
22. **Test-coverage flagship** — ≥92% per service, ratcheted in CI (added 2026-04-26)
23. **Shared-utilities-first** — search `packages/shared-utilities/` before writing a new utility (added 2026-04-26)
24. **Inline-extraction** — zero inline `type`/`interface`/`enum`/`const`/`function` in logic files (added 2026-04-26)
25. **Method-size discipline** — service ≤50 lines, manager ≤80 lines, file ≤500 lines (added 2026-04-26)
26. **Extend-don't-parallelize** — when the codebase ships a layer that solves the problem class (auth, RBAC, SSE rich-progress, event bus, repository pattern), EXTEND it through the existing seam rather than building a parallel stack. Examples: local-runtime rich-progress extends `ChatStreamService` + `ProviderStreamExecutor` (PR1, 2026-05-30) — see `docs/LOCAL_RUNTIME_PROGRESS_ADR.md`; capability framework extends `AccessPolicy`; `@claw/shared-utilities` consolidated per-service utilities. (added 2026-05-30)

## Refactor standards (2026-04-26)

Banned patterns (ESLint enforced):

- `as unknown as X` (use real types)
- `console.log` / `console.debug` / `console.info` / `console.trace` (use NestJS Logger)
- `let` at module scope
- inline `interface`/`type`/`enum`/`function` in logic files
- string-literal union types

File-size thresholds (warn at 500, hard error in Phase U):

- Service method ≤50 lines / complexity 10
- Manager method ≤80 lines / complexity 15
- All production files ≤500 lines

Coverage threshold (per-service jest/vitest):

```ts
coverageThreshold: { global: { statements: 92, branches: 92, functions: 92, lines: 92 } }
```

Cross-service utility location:

- types → `packages/shared-types/`
- values → `packages/shared-constants/`
- functions → `packages/shared-utilities/`

## Local-runtime rich-progress (extends cloud rich-progress)

**Status (2026-05-31): PR1 + PR2 + PR3 + PR4 + PR5 all shipped to `main`.**
Local-runtime users (Ollama, llama.cpp, Stable Diffusion WebUI, ComfyUI)
now see the same depth of progress UI cloud users get. The
`ClawRuntimeProgressEvent` envelope, the two admin probe endpoints, the
llama.cpp think-tag leak fix, the chat-service text-runtime metrics +
bottleneck wiring, the SD WebUI polling adapter, the ComfyUI WebSocket
adapter, and the `/admin/runtime-progress` diagnostics page are all live.
**It EXTENDS the cloud rich-progress stack (`ChatStreamService` +
`ProviderStreamExecutor` + `@Sse('stream/:threadId')` in chat-service) — it
does NOT build a parallel stack.** See:

- `docs/03-architecture/runtime-progress.md` — full architecture (PR2-5 status table)
- `docs/LOCAL_RUNTIME_PROGRESS.md` — user-facing summary
- `docs/LOCAL_RUNTIME_PROGRESS_ADR.md` — decision record
- `docs/LOCAL_RUNTIME_PROGRESS_EXPERIMENT_REPORT.md` — capability matrix
- `.claude/Integrations/pr2-5__live_smoke.md` — live smoke evidence (operator-local, gitignored)

Roadmap status:

- **PR2 — shipped.** Chat-service text-runtime metrics + bottleneck UI.
  Ollama timing fields wired through `provider-stream-reader.utility.ts` →
  `provider-stream-executor.manager.ts` (`buildFinalMetrics()`) → rich
  METRICS event with `modelLoadMs` / `promptEvalMs` / `generationMs` /
  `tokensPerSecond` + `bottleneck` + `stageTimings`. New
  `RuntimeBottleneckBreakdown` component; `RuntimeStageTimeline` real
  (was a stub).
- **PR3 — shipped.** SD WebUI adapter at
  `apps/claw-image-service/src/modules/runtime-progress/adapters/stable-diffusion-webui-progress.adapter.ts`.
  Env vars `CLAW_IMAGE_PROGRESS_POLL_INTERVAL_MS` +
  `CLAW_IMAGE_PROGRESS_PREVIEW_ENABLED`. Frontend
  `ImageGenerationProgressPanel`.
- **PR4 — shipped.** ComfyUI adapter at
  `apps/claw-image-service/src/modules/runtime-progress/adapters/comfyui-progress.adapter.ts`.
  Env var `COMFYUI_BASE_URL`. Workflow template loader + node mapper.
  Frontend `ComfyUINodeTimeline`.
- **PR5 — shipped.** `/admin/runtime-progress` ADMIN-only diagnostics
  page (`apps/claw-frontend/src/app/(portal)/admin/runtime-progress/page.tsx`)
  calling both probe endpoints in parallel + `RuntimeProbeCard` per runtime.

If you are Cursor and a user asks for "live progress for local models" or
similar: this is already done — point them at the docs above. The remaining
gap is durable RabbitMQ publishing of the 12 declared `runtime.progress.*`
patterns (today the envelope flows over SSE only). Reject any suggestion
that introduces a new SSE endpoint, a new microservice, or a parallel
envelope.

## Build toolchain (tsgo) — see docs/08-runtime-devops/build-system.md

The repo compiles with **tsgo** (`@typescript/native-preview`), not `tsc`/`nest build`. After compile, **tsc-alias** rewrites path aliases (`@app/*`, `@common/*`, `@modules/*`) to relative paths. The `typescript` dependency is aliased to `@typescript/native-preview@beta`; ts-jest still pulls real `tsc` transitively. Per-workspace scripts: `build` = `tsgo -p tsconfig.build.json && tsc-alias -p tsconfig.build.json`; `typecheck` = `tsgo --noEmit`; `dev` runs tsgo + tsc-alias in `--watch` under `nodemon`. Docker images use `node:26-bookworm-slim` (glibc — tsgo binaries are not musl-compatible, so never Alpine). All 5 shared packages also build/lint/test/typecheck with tsgo and are first-class CI matrix entries.

## Cursor editing conventions

- Never mass-rename without reading every file first.
- Never accept a multi-file diff that contains inline types in restricted files (see ESLint rules in `CLAUDE.md`).
- Use the "Apply" button deliberately — review every hunk.
- For prisma schema changes, always follow with `prisma migrate dev --name <name>`.

## Commit and push conventions

- Conventional commits: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert` + scope.
- Commit bodies describe WHY, not WHAT.
- Include `Co-Authored-By: Cursor <noreply@cursor.sh>` footer line.
- Never use `--no-verify`. The pre-commit hook runs lint-staged (eslint --fix + prettier) + `npm run typecheck`; the pre-push hook runs `npm run build` + `npm run test`.
- Chunk commits by logical boundary (schema, backend logic, frontend, infra, docs) — not by time.

## If Cursor suggests something contrary to CLAUDE.md

**CLAUDE.md wins.** Always. Cursor's suggestions are just that — suggestions. They are not authority. Reject any suggestion that:

- Introduces `any` types
- Adds inline types in restricted files
- Uses string literal unions where enums exist
- Skips i18n for user-facing text
- Disables ESLint rules
- Adds a new service without wiring through all split compose files in `docker/` + nginx + health + shared packages
- Claims "done" without QA script running
- Reintroduces a per-service `jwt.utility.ts` after dedup (use `@claw/shared-utilities`)
- Adds a public method without `logger.debug` entry + `logger.error` catch
- Lowers a `coverageThreshold` to land a change
- Uses `as unknown as X` to satisfy the type checker
- Uses `console.log` anywhere
- Adds a new `packages/<name>/` workspace without also updating `.github/workflows/ci.yml` "Build shared packages" step in ALL FOUR jobs (lint / typecheck / test / build) — see CI Workflow Footgun below

## CI Workflow Footgun (added 2026-04-27)

When you add a new package under `packages/`, the CI workflow needs an extra build line to compile its `dist/` before consumer services typecheck. Local builds hide this because `node_modules/@claw/<pkg>` symlink + `dist/` are populated by `npm install` + `npm run build`. CI starts fresh and fails with `Cannot find module '@claw/<pkg>'` until the line is added.

```yaml
- name: Link tsgo binary (@typescript/native-preview)
  run: npm rebuild @typescript/native-preview
- name: Build shared packages
  run: |
    cd packages/shared-types && npx tsgo -p tsconfig.build.json
    cd ../shared-constants && npx tsgo -p tsconfig.build.json
    cd ../shared-rabbitmq && npx tsgo -p tsconfig.build.json
    cd ../shared-auth && npx tsgo -p tsconfig.build.json
    cd ../shared-utilities && npx tsgo -p tsconfig.build.json
    cd ../<new-shared-package> && npx tsgo -p tsconfig.build.json   # MUST add for any new shared package
```

Update all four jobs (`lint`, `typecheck`, `test`, `build`) — they each have their own copy of the step. Each job is a ~24-entry matrix (17 services + frontend + 6 shared packages).

**SECOND required edit (added 2026-05-29):** also add the package to the per-package `strategy.matrix.include` in all four jobs, or its OWN lint/typecheck/test never runs in CI (it's only built as a dependency):

```yaml
- service: <new-shared-package>
  workspace: '@claw/<new-shared-package>'
  prisma: false
```

So a new `packages/<name>` = TWO edits × 4 jobs: the "Build shared packages" line AND the matrix entry. `@claw/shared-entitlements` had the build line (Phase C-1) but its matrix entry was missed until 2026-05-29 — silently never lint/typecheck/tested. Don't repeat: both edits, all four jobs.

## 2026-05-30 feature additions (single source of truth: CLAUDE.md)

Critic plan feature (`allowCriticReview` + selectable critic model on compare),
`WORKSPACE_VIEW` / `WORKSPACE_APP_CONFIG_VIEW` permissions (USER read-only
access to workspace pages and admin provider-app-configs), `RichPromptTextarea`
(shared autosize textarea), and `use-sticky-bottom-scroll` (auto-follow streaming
tokens) are detailed in `CLAUDE.md` — single source of truth. ADR-050 / 051 /
052 capture the architectural decisions.

## Compare / judge / critic file attachments (Slice A, 2026-05-30)

Compare / judge / critic now accept `fileIds: string[]` end-to-end: FE picker → `POST /chat-messages/parallel` → per-lane attachment resolution → judge + critic prompts. Each lane writes a per-model `FileDeliveryEntry[]` into `ChatMessage.metadata.fileDelivery` (also surfaced on `ParallelModelResponse.attachmentDelivery`) so the FE renders a delivery-mode chip (`NATIVE_IMAGE` / `EXTRACTED_TEXT` / `OMITTED_NO_VISION` / `OMITTED_UNSUPPORTED` / `TRUNCATED_TEXT`) per model. Three critical bugs were fixed: (1) `FileProcessingManager` was never wired into the parallel path so attachments silently dropped; (2) `ServiceTokenGuard` rejected internal file-content calls from chat-service when the parallel lane re-issued the service token; (3) cloud adapters sent `image_url` parts to Ollama, which silently dropped images — Ollama now receives the native `images: [base64]` shape and cloud lanes keep `image_url`. Full canonical chain in `docs/03-architecture/compare-file-attachments.md`.

## Strict pure-render TSX + streaming-token auto-scroll (2026-05-31)

`apps/claw-frontend/src/components/chat/virtualized-messages.tsx` is now the canonical strict-pure-render TSX example — ZERO hook calls of any kind. Wiring (ref, at-bottom state, callbacks, `components.Header`/`Footer`) is produced by `useVirtualizedMessagesController` and spread in via `<VirtualizedMessages {...virtualizedMessagesProps} />`. The user-reported scroll bug (streaming tokens didn't auto-follow) is fixed by `useFollowStreamingTokens`: Virtuoso's native `followOutput` only fires on array-length changes, but during streaming the LAST message's content grows in place, so the hook watches the last message's id + content length and imperatively calls `virtuosoRef.scrollToIndex({ behavior: 'auto', align: 'end' })` while `isAtBottom` is true. `react-virtuoso` MUST be imported only via `@/lib/virtuoso`; direct imports are forbidden.

## Page shell pattern — chat/[threadId] (2026-05-31)

`apps/claw-frontend/src/app/(portal)/chat/[threadId]/page.tsx` is the canonical "page shell" example. The .tsx calls **exactly ONE** controller hook (`useThreadDetailPage`) and renders **one** `<ChatThreadShell {...shellProps} />`. The controller composes `useParams`, `useTranslation`, `useThreadDataController` (which itself composes the 8 data hooks: `useThreadDetail`, `useCancelStream`, `useSendMessage`, `useDeleteThread`, `useMessageFeedback`, `useRegenerateMessage`, `useThreadSettings`, `useVirtualizedMessagesController`), `useEditableTitle`, `useResizableComposer`, `usePlanFeatures`, and `useInThreadCompare`, then assembles a single `shellProps` bag. Use this pattern any time a page would otherwise have to call more than one hook directly — push the composition down into the controller and keep the .tsx at the lint-mandated ceiling of one hook.
