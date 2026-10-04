# ClawAI Threads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Work serially on `main`, as requested by the owner; do not create a worktree.

**Goal:** Ship ClawAI Threads as a research-backed publication and community product built from private chat, with isolated generation, cost limits, owner approval, public discovery, and complete QA evidence.

**Architecture:** `claw-threads-service` owns publications and social data; `claw-thread-generation-service` owns durable jobs and isolated workers. Chat supplies immutable filtered snapshots, research-service supplies evidence, and existing auth, entitlements, credits, context sizing, moderation, and discovery systems are extended.

**Tech Stack:** NestJS, PostgreSQL/Prisma, RabbitMQ, Next.js 16, shared auth/entitlements/types/constants, existing model gateway and research-service, Vitest, Playwright, and the existing i18n and public-content systems.

**Spec:** `docs/superpowers/specs/2026-10-04-clawai-threads-design.md`

## Global constraints

- Preserve the existing `/api/v1/threads` chat-thread alias and chat-share lockdown.
- Generation records public intent after a visible disclosure; drafts remain private until owner approval.
- Keep approved publication revisions public after account deletion with anonymous attribution; erase private snapshots and generation artifacts, remove reactions, anonymize public comments, and delete pending private change requests.
- Enforce the user-selected aggregate spend cap across every model call; use existing credits and entitlements and add no PAYG pricing.
- Require 3–5 authors, exact-hash unanimous agreement, Judge score ≥80, Critic score ≥75, and no more than three rounds by default.
- Never silently truncate source/evidence context or expose hidden chain-of-thought, secrets, account identifiers, or private chat metadata.
- Add no user-facing string without all 13 locales and RTL handling.
- Every code batch carries its knowledge delta and one QA evidence record; every batch is committed and pushed normally before the next starts.
- Use changed-file lint and matching specs during iteration. Do not run whole-repository tests or lint. Use tree-bound gate receipts to prevent duplicate hook work; never bypass hooks.
- A successful `main` push runs CI, then automatically creates a release and production deployment. Every pushed checkpoint must remain deploy-safe with Threads launch disabled until the final rollout batch.

## Review focus

1. Model/context changes and evidence that leave a role with incomplete input.
2. Retries, duplicate queue delivery, cancellation, and aggregate cap accounting racing with provider calls.
3. Owner approval, unpublish, indexing eligibility, and active revision switching racing with public reads.
4. Account deletion preserving approved public revisions while removing private artifacts and personal linkage.
5. Legacy chat-thread routes and chat-share sitemap/RSS behavior regressing when Threads discovery is added.

## Batch plan

Each batch is independently deployable and ends with one scoped validation pass, a valid QA record, one conventional commit, and an immediate push. Code stays disabled or internal-only until its required dependencies land. Wait for CI, release, and deployment results before beginning the next batch. Use a staged-tree gate receipt when its exact hash remains unchanged; normal hooks still run.

### Batch 1 — Contracts, service skeletons, infra, and product knowledge

**Outcome:** Both health-only service shells build and pass health checks; feature APIs, queues, and databases are not exposed yet. All required service, gateway, health, and CI discovery paths know about them.

**Code and infrastructure:**

- Create `apps/claw-threads-service/` and `apps/claw-thread-generation-service/` using the closest existing NestJS/Prisma service patterns.
- Add service ports/names to `packages/shared-constants/src/index.ts`; add validated configs in each service's `src/app/config/app.config.ts`.
- Wire both service containers into `docker/docker-compose.dev.services.yml` and `docker/docker-compose.prod.services.yml`. Add each owned database to `docker/docker-compose.dev.databases.yml` and `docker/docker-compose.prod.databases.yml` only with its first real domain schema in Batch 4 or 5; do not create placeholder schemas/tables.
- Wire the Threads publication route and origin in `infra/nginx/locations.conf`, `infra/nginx/nginx.distributed.conf.template`, and `infra/nginx/.env.distributed.example`; keep generation APIs internal and leave `/api/v1/threads` unchanged.
- Register health checks in `apps/claw-health-service/`. CI's affected-workspace matrix reads npm workspaces dynamically, so adding package manifests provides matrix discovery; this health-only batch adds no Prisma or feature-test environment.
- Propagate service ports/URLs through `.env.example`, `scripts/install.sh`, `scripts/install.ps1`, `scripts/install-tls.sh`, and `scripts/install-tls.ps1`. Add no production secret without checking the deployment environment's current secret and config conventions.
- Update workspace `package.json` files, service `CLAUDE.md` routers, and Dockerfiles from the chosen donor services. Add only service-scaffold code and health tests.

**Knowledge delta in the same commit:**

- Create `docs/02-business-product/clawai-threads-product-spec.md` and `docs/03-architecture/clawai-threads-architecture.md`.
- Create `docs/13-adr/adr-159-clawai-threads-two-service-architecture.md` (recheck the next free ADR number immediately before creating it; 158 was highest during planning) and update `docs/13-adr/adr-index.md`.
- Create `wiki/Threads.md`; update `wiki/Home.md`, `wiki/_Sidebar.md`, `wiki/Flagship-Features.md`, and the existing `docs/wiki/index.md` index.
- Update `docs/02-business-product/flagship-features.md`, `requirements-register.md`, and `product-roadmap.md`; `docs/04-backend/services-index.md`, `service-guide-threads.md`, and `service-guide-thread-generation.md`; `context/architecture-map.md`, `workspace-map.md`, `service-catalog.md`, `port-and-service-map.md`, and `service-dependency-map.md`; root `CLAUDE.md`; and both service `CLAUDE.md` files.
- Update `rules/23-git-commits-hooks-and-release-gates.md`, `rules/34-gate-economy-and-machine-resources.md`, `rules/48-lint-and-test-only-what-changed.md`, and `rules/07-commit-rules.md` only where necessary to make changed-file validation and exact-tree receipts consistent. Preserve the absolute ban on `--no-verify`; receipts skip only redundant expensive checks and never disable hooks.
- Create `memory/2026-10-04-clawai-threads-product-decisions.md` with the settled business choices and the account-deletion decision.
- Regenerate `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json` through the repository generators after formatting.
- **No new skill in this batch:** update the existing `skills/run-gates-once-and-land.md` and `skills/run-the-qa-team.md` for changed-file validation; existing service and QA runbooks cover setup and team lanes.
- Add the Akinator trace record in `docs/changes/2026-10-04-clawai-threads-foundation-decisions-and-gate-discipline.md`.

**Validation:** changed-file lint and the health/service specs for each new service; touched-service typecheck/build; validate compose/YAML/config; run `npm run knowledge:verify`, `npm run audit:check`, and the changed-workspace CI jobs. QA record: `docs/qa-evidence/2026-10-04-threads-service-foundation.md`.

**Deployment repair — complete:** Two rollouts exposed the missing `wget` dependency and the HTTPS/HTTP mismatch from `/certs`. The final probe uses Node's built-in `node:https` client on loopback and disables certificate verification only for that request. The 4-case spec, changed-file ESLint, local TLS smoke probes (HTTP 200 on ports 4019 and 4020), dev/prod Compose config checks, knowledge/audit/QA checks passed. Full CI 37214571065 passed; release/deploy run 37215068639 deployed v1.175.2 and reported both services healthy. QA evidence and the Akinator trace record the result.

### Batch 2 — Immutable full-context source snapshots and exports

**Implementation status:** Code and targeted documentation are in place. Chat
exposes an owner-scoped version-1 snapshot through a service-token-protected
internal endpoint, with a serializable read, explicit filtering, fail-closed
message/byte caps, and a SHA-256 digest. Generation has a validating client and
canonical JSON/Markdown exporters. TOON returns an explicit unavailable result:
no official codec or measured savings test exists in this workspace. Job
persistence and role-specific context-fit checks remain in their later planned
batches; this batch does not claim durable pinning.

**Outcome:** Generation can request a deterministic, immutable, filtered chat
snapshot and obtain canonical JSON/Markdown without exposing chat database
ownership.

**Code:**

- Extend `apps/claw-chat-service/src/modules/chat-threads/` with an internal service-token-protected snapshot endpoint and focused DTO/repository mapping.
- Add snapshot version/hash/count/byte-count metadata and filtering tests for system/tool/developer messages, failed/placeholder/aborted/duplicate chunks, hidden metadata, secrets, and attachments.
- Add snapshot client, canonical JSON exporter, Markdown exporter, and TOON adapter in `apps/claw-thread-generation-service/src/modules/source-snapshots/`.
- TOON remains unavailable with an explicit reason until an official codec passes semantic round-trip/adversarial-size tests and measured fixtures show useful token savings.
- The internal API returns private source only to a service-token caller. Durable job pinning is deferred until the job aggregate lands; regeneration will take a new snapshot version.

**Knowledge delta in the same commit:** Update `docs/03-architecture/clawai-threads-architecture.md`, `wiki/Threads.md`, `wiki/Memory-and-Context-Architecture.md`, `context/service-dependency-map.md`, `docs/wiki/index.md`, the Threads privacy section in `docs/02-business-product/clawai-threads-product-spec.md`, and this file with verified implementation status. Update `docs/changes/2026-10-04-clawai-threads-foundation-decisions-and-gate-discipline.md` and create the Akinator trace record at `docs/changes/2026-10-04-threads-batch-2-source-snapshots-and-exports.md`. The Akinator sensitive register created `docs/wiki/security/sensitive-data.md`; Akinator classified the repeated automated release subject as `neither` in `.ai/ledger/decision/distil-repeat-subject-819bfd0a55d6.md`. Repository generators must also refresh `.ai/**`, touched service `AGENTS.md` files, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`. Update product memory only if implementation reveals a durable new decision. No new product skill/rule: no reusable procedure or separately enforced invariant was added.

**Validation:** changed snapshot/repository/controller/exporter specs only; changed-file lint; touched `claw-chat-service` and generation-service typecheck/build. Role-specific context fit is deferred with job execution, as no roles are wired in this batch. QA record `docs/qa-evidence/2026-10-04-threads-snapshots.md`.

### Batch 3 — Entitlement, credit reservation, and aggregate job cap

**Outcome:** Enqueue requires an eligible plan and explicit maximum spend; no job can exceed its selected aggregate ceiling, including retries and concurrent provider calls.

**Status (2026-10-04):** Partial foundation implemented on `main`: Threads
permissions/defaults, Auth-owned budget and call ledger schema, plan-use holds,
service-token budget endpoints, and optional `PaygMeter` aggregate call fences.
Generation enqueue/worker wiring and live/concurrent database validation remain
open; this batch does not enable the feature.

**Code:**

- Extend existing feature/permission catalog and defaults through `packages/shared-types/`, `packages/shared-entitlements/`, `apps/claw-auth-service/prisma/schema.prisma`, and the owning auth plan/credit modules.
- Add a parent Threads job reservation with idempotent reserve/finalize/release semantics. Reuse current per-provider `PaygMeter` holds beneath the parent ceiling; atomically reject any call whose max reservation would exceed remaining budget.
- Preserve free-tier baseline access to community participation. Plan gates apply only to generation entitlements already selected by the existing catalog.
- Add explicit permissions for create/read/update/publish/moderate actions following existing permissions and RBAC patterns.
- Persist price/cap estimates in supported integer credit units; never add a price table or PAYG surface for this feature.

**Knowledge delta in the same commit:** Update `docs/02-business-product/clawai-threads-product-spec.md`, `docs/03-architecture/clawai-threads-architecture.md`, `wiki/Threads.md`, `wiki/Package-Shared-Entitlements.md`, `docs/02-business-product/payg-credit-spec.md`, `context/permission-map.md`, and `context/service-dependency-map.md`. Add/update ADR only for a new accounting boundary. Add `skills/meter-a-thread-job-budget.md` only if the parent/child reservation becomes a reusable procedure beyond this feature; otherwise extend the existing metering skill.

**Validation:** changed credit/entitlement specs only; changed-file lint; touched shared packages/auth/generation typecheck/build; concurrency, duplicate idempotency, release/refund, plan-role matrix tests. QA record `docs/qa-evidence/2026-10-04-threads-job-budget.md`.

### Batch 4 — Isolated generation worker and research/review pipeline (4a/4b)

**Outcome:** A durable job completes research, author drafting, exact-hash unanimous consensus, Judge, Critic, bounded revisions, and owner-review readiness without running inside chat-service. This work is split into two pushed commits so the persisted pipeline can land before worker-recovery safeguards.

**Code:**

- Add job, attempt, checkpoint, model communication, evidence bundle, revision-draft, and audit persistence to `apps/claw-thread-generation-service/prisma/schema.prisma`.
- Add the generation-owned PostgreSQL database to development and production DB compose files, migrations, runtime config, installer values, and health readiness; this is the first batch that persists generation state.
- Add dedicated RabbitMQ queues/routing keys and typed events under `packages/shared-types/`; persist state before acknowledging dispatch.
- Add research-service client using existing internal HTTP/service-token patterns; store evidence URL/hash/version/role/correlation/budget metadata and pass the identical evidence bundle to every role.
- Reuse existing connector model snapshots, entitlements, `ChatContextGatewayManager`/context-sizing utilities, and provider billing paths. Prove each complete role payload fits its actual model window including instructions and output reserve.
- **4a (this commit):** Add 3–5 author roles, same-hash unanimous agreement, Judge ≥80, independent Critic ≥75, max three rounds, provider-diverse fallbacks, persisted checkpoints, cancellation, the existing shared RabbitMQ retry/DLQ behavior, and enqueue idempotency. The internal result remains private and has no publication handoff.
- **4b (implemented locally; production rollout pending):** Add bounded job attempts, checkpoint-based resume, database-backed two-slot concurrency, periodic heartbeats, stale-worker recovery, FIFO dispatch with retry backoff, and idempotent budget closure. Focused tests cover slot contention, retry exhaustion, lease-expiry/heartbeat races, checkpoint resume, retry preserving the aggregate budget, and canonical evidence hashes. Live production migration remains subject to the repository's manual database-change procedure.
- Store only structured concise findings; do not request or retain hidden chain-of-thought. No UI/public read path is enabled yet.

**Knowledge delta in the same commit:** Update `docs/03-architecture/clawai-threads-architecture.md`, existing `docs/04-backend/service-guide-thread-generation.md` (adopt the repository's canonical guide instead of adding a duplicate), `docs/06-data/environment-variables.md`, `wiki/Threads.md`, generated `docs/wiki/index.md`, `context/event-flow-map.md`, `context/service-dependency-map.md`, `context/database-ownership-map.md`, `context/port-and-service-map.md`, `context/service-catalog.md`, `context/workspace-map.md`, `docs/04-backend/services-index.md`, root `CLAUDE.md` router, service `CLAUDE.md`, and the `skills/00-index.md` entry; add `skills/run-threads-generation-queue.md`. Add enforceable `rules/61-threads-generation-invariants.md` only alongside architecture tests that check the service boundary, exact-hash consensus, full-context path, and dedicated queue. No new skill duplicating existing research/model gateway runbooks.

**4a validation:** changed generation/research specs; changed-file lint; generation and Chat typecheck/build; Docker generation image build (including shared-types); shared-types typecheck; installer and Compose config validation; focused billing/i18n regression. Frontend production build and restart/resume/worker-loss behavior are explicitly deferred. QA record `docs/qa-evidence/2026-10-04-threads-generation-pipeline.md`.

**4b validation and knowledge delta:** changed-file ESLint; four focused specs (15 tests); generation-service typecheck; Prisma schema validation. Update `docs/03-architecture/clawai-threads-architecture.md`, `docs/04-backend/service-guide-thread-generation.md`, `wiki/Threads.md`, `skills/run-threads-generation-queue.md`, this plan, and create `docs/changes/2026-10-05-threads-batch-4b-worker-recovery.md` plus `docs/qa-evidence/2026-10-05-threads-generation-recovery.md`. Regenerate `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`. No new rule or skill: the existing queue runbook and scoped-gate/QA rules cover the recovery procedure. Live DB migration, API/browser integration, full QA lanes, commit, push, CI, and deployment remain pending; do not represent them as passed.

### Batch 5 — Publication lifecycle, social, moderation, and deletion

**Outcome:** Owners can review, approve, publish, revise, unpublish, and export; authenticated readers can participate; moderation and account deletion follow the approved policy.

**Code:**

- Add publication/revision/comment/reaction/change-request/report/moderation models and migration to `apps/claw-threads-service/prisma/schema.prisma`.
- Add the publication-owned PostgreSQL database to development and production DB compose files, migrations, runtime config, installer values, and health readiness.
- Add owner, public, contribution, moderation, and internal generation-result APIs in `apps/claw-threads-service/src/modules/`; public DTOs are explicit allow-lists and use opaque IDs.
- Require owner approval before publish. Atomically switch active immutable revisions; owner text edits invalidate relevant Judge/Critic validation; accepted community changes create a new candidate revision and do not mutate the active one.
- Add safety/PII/secret scanning, eligibility statuses, ownership, rate limits, report flow, admin tools, audit, and idempotent reaction rules through existing auth patterns.
- Add account deletion consumer/API across auth, Threads, and generation service: preserve public approved revisions under anonymous attribution; delete source snapshots and private jobs/artifacts; remove reactions; anonymize public comments; delete pending private requests; never retain account linkage in public DTOs.
- Keep unapproved drafts private and public lookups fail closed; revoke removes the publication and its content from reads/discovery.

**Knowledge delta in the same commit:** Update product, architecture, privacy/moderation, deletion, API, wiki, security, service, event, permission, and DB ownership pages at their canonical paths: `docs/02-business-product/clawai-threads-product-spec.md`, `docs/03-architecture/clawai-threads-architecture.md`, `docs/03-architecture/public-chat-shares.md`, `docs/03-architecture/data-ownership.md`, `docs/04-backend/claw-threads-service.md`, `wiki/Threads.md`, `context/database-ownership-map.md`, `context/permission-map.md`, `context/service-dependency-map.md`, root `CLAUDE.md`, `docs/13-adr/adr-index.md`, and ADR for publication lifecycle/deletion if distinct from ADR-159. Update `memory/2026-10-04-clawai-threads-product-decisions.md` with tested behavior. Update `rules/61` only where a specific automated invariant is added.

**Validation:** changed service/account deletion specs only; changed-file lint; touched Threads, generation, and auth services typecheck/build; migration and data-retention tests; IDOR/RBAC matrix and public anonymous deletion proof. QA record `docs/qa-evidence/2026-10-04-threads-publication-domain.md`.

### Batch 6 — Owner and community UI, all locales

**Outcome:** Users can configure generation, review its cost/status, manage drafts/publications, contribute, report abuse, and review change requests in an accessible responsive interface.

**Code:**

- Add Threads repository/hooks/components/pages under existing `apps/claw-frontend/src/lib/`, `src/hooks/`, `src/components/`, and `(portal)` route conventions; use `/api/v1/thread-publications`, never the legacy `/api/v1/threads` alias.
- Add generation disclosure and intent record, citation/style/type settings, model roles, visible cap, eligibility, queue progress, cancellation/retry, owner review, revision history, approval, publish/unpublish, exports, comments/reactions/change requests/reporting.
- Add every string to the 13 locale dictionaries and `i18n.types.ts`; test Arabic/Persian RTL, keyboard navigation, screen reader names, color contrast, and reduced motion.
- Do not duplicate normal chat orchestration surfaces. Threads consumes the same supported context/model abstractions without changing regular chat, Compare, Consensus, Escalation, labs, or Judge/Critic parity.

**Knowledge delta in the same commit:** Update `docs/05-frontend/frontend-architecture.md`, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, `context/request-flow-map.md`, and `context/chat-surface-parity-map.md` only for the new shared boundary; add screenshots to the QA evidence artifact. No new UI skill if existing frontend/i18n/accessibility skills cover it.

**Validation:** lint changed TS/TSX/i18n files only; run matching unit specs and focused Playwright tests; frontend typecheck/build; capture product screenshots and evidence at mobile/tablet/desktop and both orientations, including RTL. QA record `docs/qa-evidence/2026-10-04-threads-owner-ui.md`.

### Batch 7 — Public reading, hub, SEO, sitemap, feeds, and marketing

**Outcome:** Approved, safety-approved, index-eligible Threads are independently discoverable without lifting chat-share lockdown.

**Code:**

- Add public detail/hub pages under existing `(marketing)` Next.js routes, with localized metadata, canonical links, robots, structured article data, safe rendering and related publications.
- Extend the existing public-content registry, sitemap, RSS/Atom, cache, and llms.txt paths with a separate Threads source. Preserve existing chat-share filter and lockdown tests unchanged.
- Add search/category/pagination only where backed by current public-query patterns; never expose reader identities or private owner identifiers.
- Add marketing pages only after real screenshots/content and page-specific design/accessibility assertions are ready.

**Knowledge delta in the same commit:** Update `docs/03-architecture/clawai-threads-architecture.md`, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, SEO/discovery docs, `context/request-flow-map.md`, `docs/01-executive-context/` only where positioning requires a link, and the flagship/marketing page registries. Update sitemap/feed docs and operational discovery runbooks.

**Validation:** changed discovery and route specs only; changed-file lint; focused Playwright/public route snapshots; independent proof that locked chat shares remain absent while eligible Threads appear; Lighthouse on each new public marketing URL, including accessibility/color contrast. QA record `docs/qa-evidence/2026-10-04-threads-public-discovery.md`.

### Batch 8 — Enablement, integrated QA, and release readiness

**Outcome:** The whole product is enabled only after all prior batches are deployed and verified; launch readiness includes the whole repository QA team and real evidence.

**Code:** fix only integration defects found by the preceding lanes. Keep changes within their owning workspace; no unrelated refactors.

**Knowledge delta in the same commit:** Complete `docs/features/clawai-threads/` with scaled SDLC artifacts (`00-intake.md`, `01-business-analysis.md`, `02-product-requirements.md`, `03-acceptance-criteria.md`, `04-scope-and-non-goals.md`, `06-delivery-plan.md`, `08-architecture.md`, `09-impact-analysis.md`, `10-security-analysis.md`, `11-data-and-migration-plan.md`, `12-test-strategy.md`, `16-developer-validation.md`, `17-QA-evidence.md`, `20-UAT.md`, `21-go-no-go.md`, `22-release-plan.md`, `23-rollback-plan.md`, `25-release-evidence.md`). Update `wiki/Threads.md`, `wiki/Home.md`, `wiki/_Sidebar.md`, `wiki/Flagship-Features.md`, `docs/02-business-product/flagship-features.md`, `docs/13-adr/adr-index.md`, product/business indexes, service/context maps, root/service routers, and memory with final behavior and release evidence. Add or extend one reusable skill/rule only if prior batches established a real repeatable procedure/enforced invariant.

**Validation:** run the full QA team across all 15 lanes with `docs/qa-evidence/2026-10-04-clawai-threads-launch.md`; run each relevant changed-file spec, touched-workspace typecheck/lint/build, QA evidence checker, `npm run knowledge:verify`, `npm run audit:check`, focused Playwright, real curl/API with branch-log proof, free/paid/admin RBAC matrix, device/orientation/RTL screenshots, security, performance/accessibility, all-locale review, UAT, CI/release/deploy checks. Run no all-workspace `npm test` or lint. Report any unavailable lane as NOT_RUN and do not claim DONE until closed.

## Prompt-pack 40-round verification map

The 40 rounds below are the pack's distinct verification concerns, distributed into the owning batches. They supplement the repository's 15 QA evidence lanes; they do not replace them. Record exact command/action, output, screenshots/logs where relevant, and data cleanup. Use the per-batch QA record as the index to its round evidence.

| Round | Verification                                                                                            | Owning batch                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Requirement → implementation path → automated test → live evidence traceability                         | All; consolidate in 8                                                                                                                          |
| 2     | Clean install, upgrades, constraints, indexes, foreign keys, revision/job integrity                     | 1 and 5                                                                                                                                        |
| 3     | Exact snapshot filtering across success, failure, abort, placeholders, attachments, citations, branches | 2                                                                                                                                              |
| 4     | Deterministic JSON/Markdown/TOON, round-trip, Unicode, huge input                                       | 2                                                                                                                                              |
| 5     | Identical source/evidence hashes for orchestrator, authors, Judge, Critic                               | 2 and 4                                                                                                                                        |
| 6     | Context-fit boundaries, eligible fallback, all-models-too-small behavior                                | 4                                                                                                                                              |
| 7     | Three/four/five-author fanout, duplicates, provider diversity, eligibility                              | 4                                                                                                                                              |
| 8     | Consensus dissent, changed hashes, stale votes, round ceiling, exact-hash unanimity                     | 4                                                                                                                                              |
| 9     | Judge score boundaries, blockers, parse/timeout/fallback                                                | 4                                                                                                                                              |
| 10    | Critic accept/reject/score/failure and independence from Judge narrative                                | 4                                                                                                                                              |
| 11    | Owner approve/reject/edit/targeted feedback/stale validation/revision/cancel                            | 5 and 6                                                                                                                                        |
| 12    | Research dedupe, crawl/fetch fallback, robots/unsafe URL, provenance, citation, outage                  | 4                                                                                                                                              |
| 13    | 202 enqueue, pickup, fairness, idempotency, cancellation, crash/restart/recovery/DLQ                    | 4                                                                                                                                              |
| 14    | Rate limit, timeout, 500, malformed output, provider/role outages, fallback                             | 4                                                                                                                                              |
| 15    | Exhausted fallback → final failure, notification/ticket, no public content, released credits            | 4                                                                                                                                              |
| 16    | Credit sufficiency, cap, hold, partial failure, actual finalize, cancel/crash release, no double charge | 3 and 4                                                                                                                                        |
| 17    | Anonymous/user/custom/contributor/moderator/admin direct API access                                     | 3 and 5                                                                                                                                        |
| 18    | Dynamic plan enable/disable; generation gate while contributions remain available                       | 3 and 6                                                                                                                                        |
| 19    | Public hub/detail/pagination/search/social/change-request APIs                                          | 5 and 7                                                                                                                                        |
| 20    | Like/dislike, comments, accept/reject, publish/revoke/read concurrency                                  | 5                                                                                                                                              |
| 21    | Anonymous/authenticated readers, crawler/bot filtering, rate abuse, deleted owner                       | 5 and 7                                                                                                                                        |
| 22    | IDOR, injection/XSS/SSRF, prompt injection, CSRF, mass assignment, secrets, PII, spam, enumeration      | 5–7                                                                                                                                            |
| 23    | Credential/PII fixtures and block/warn/redact behavior                                                  | 2 and 5                                                                                                                                        |
| 24    | Sitemap/RSS eligibility, revoke, lastmod, locale/chunking, AI discovery, chat-share lockdown            | 7                                                                                                                                              |
| 25    | Ready/published/failure notifications and denied/invalid/duplicate delivery                             | 4–6                                                                                                                                            |
| 26    | One admin incident ticket with safe diagnostics and no raw thread/auth data                             | 4 and 5                                                                                                                                        |
| 27    | Full browser journey: create → queue → resume → revise → approve → publish → contribute                 | 6 and 8                                                                                                                                        |
| 28    | Several real 15–25-turn topic threads with full provenance evidence                                     | 8; use local/lowest-cost available models and each job's user-selected cap; otherwise record NOT_RUN with the exact credential/runtime blocker |
| 29    | Mobile/tablet/desktop widths, both mobile/tablet orientations, Arabic RTL, overflow/overlap             | 6–8                                                                                                                                            |
| 30    | Keyboard, focus, labels, dialogs, live progress, contrast, reduced motion                               | 6–8                                                                                                                                            |
| 31    | All locales, no missing keys, localized marketing/email/push, RTL                                       | 6–8                                                                                                                                            |
| 32    | Public latency, queue/stage timings, query shape/N+1, discovery latency                                 | 4, 7, and 8                                                                                                                                    |
| 33    | Bounded queue/read/social/sitemap load and proof that queue pressure does not harm normal chat          | 4, 5, and 7                                                                                                                                    |
| 34    | Worker termination, research/provider/RabbitMQ/database outage and recovery                             | 4                                                                                                                                              |
| 35    | Dev/prod compose, health, env, nginx, installers, migrations                                            | 1 and 8                                                                                                                                        |
| 36    | Normal chat/share, auth, plans, billing, research, orchestration, sitemap/RSS regressions               | 2–8                                                                                                                                            |
| 37    | Marketing routes, content registry, translations, real screenshots, SEO, Lighthouse/accessibility       | 7 and 8                                                                                                                                        |
| 38    | Generated knowledge freshness/integrity and inventory after formatting                                  | Every batch                                                                                                                                    |
| 39    | Changed-file lint/spec, touched-workspace typecheck/build, exact-tree receipt, no hook bypass           | Every batch                                                                                                                                    |
| 40    | Exact local/remote CI, release/deploy commands, results, logs, screenshots, DB checks, risks            | Every batch                                                                                                                                    |

Live provider calls are billable and are not required for CI. Use mocks/contracts for automated CI. For live round 28 and provider portions of round 12, first use the least-cost available provider and a visible cap; do not exceed it. If no safe local/low-cost route is configured, record the round as NOT_RUN and keep the release verdict PARTIAL.

## Main-branch batch delivery

The owner selected direct work on `main`; no feature branch, worktree, PR, or merge step. Before each batch, require a clean, up-to-date main tree. After the scoped gate and evidence check, stage explicit paths, generate knowledge artifacts after formatting, record a staged-tree gate receipt, commit conventionally, and immediately push. Read CI, release, and production deployment statuses before the next batch. Do not use `--no-verify` or another hook bypass. If a batch is not safe for automatic production deployment, stop and redesign the batch boundary before pushing it.

## Completion definition

- All eight batches have landed as normal commits on `main`, each pushed before work on the next batch, with CI and automatic release/deployment outcomes reviewed.
- Services, migrations, queues, API/UI/discovery, security, deletion behavior, all 13 locales, and rollback/operations are implemented.
- Knowledge, wiki, business decisions, ADRs, skills/rules where justified, `.ai` artifacts, inventory, and QA evidence are current and generated correctly.
- All required QA lanes are complete with real evidence, every required GitHub gate is green, and the production rollout is confirmed healthy.
