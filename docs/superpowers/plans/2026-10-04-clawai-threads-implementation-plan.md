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
- Require 3â€“5 authors, exact-hash unanimous agreement, Judge score â‰¥80, Critic score â‰¥75, and no more than three rounds by default.
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

### Batch 1 â€” Contracts, service skeletons, infra, and product knowledge

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

**Deployment repair â€” complete:** Two rollouts exposed the missing `wget` dependency and the HTTPS/HTTP mismatch from `/certs`. The final probe uses Node's built-in `node:https` client on loopback and disables certificate verification only for that request. The 4-case spec, changed-file ESLint, local TLS smoke probes (HTTP 200 on ports 4019 and 4020), dev/prod Compose config checks, knowledge/audit/QA checks passed. Full CI 37214571065 passed; release/deploy run 37215068639 deployed v1.175.2 and reported both services healthy. QA evidence and the Akinator trace record the result.

### Batch 2 â€” Immutable full-context source snapshots and exports

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

### Batch 3 â€” Entitlement, credit reservation, and aggregate job cap

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

### Batch 4 â€” Isolated generation worker and research/review pipeline (4a/4b)

**Outcome:** A durable job completes research, author drafting, exact-hash unanimous consensus, Judge, Critic, bounded revisions, and owner-review readiness without running inside chat-service. This work is split into two pushed commits so the persisted pipeline can land before worker-recovery safeguards.

**Code:**

- Add job, attempt, checkpoint, model communication, evidence bundle, revision-draft, and audit persistence to `apps/claw-thread-generation-service/prisma/schema.prisma`.
- Add the generation-owned PostgreSQL database to development and production DB compose files, migrations, runtime config, installer values, and health readiness; this is the first batch that persists generation state.
- Add dedicated RabbitMQ queues/routing keys and typed events under `packages/shared-types/`; persist state before acknowledging dispatch.
- Add research-service client using existing internal HTTP/service-token patterns; store evidence URL/hash/version/role/correlation/budget metadata and pass the identical evidence bundle to every role.
- Reuse existing connector model snapshots, entitlements, `ChatContextGatewayManager`/context-sizing utilities, and provider billing paths. Prove each complete role payload fits its actual model window including instructions and output reserve.
- **4a (this commit):** Add 3â€“5 author roles, same-hash unanimous agreement, Judge â‰¥80, independent Critic â‰¥75, max three rounds, provider-diverse fallbacks, persisted checkpoints, cancellation, the existing shared RabbitMQ retry/DLQ behavior, and enqueue idempotency. The internal result remains private and has no publication handoff.
- **4b (implemented locally; production rollout pending):** Add bounded job attempts, checkpoint-based resume, database-backed two-slot concurrency, periodic heartbeats, stale-worker recovery, FIFO dispatch with retry backoff, and idempotent budget closure. Focused tests cover slot contention, retry exhaustion, lease-expiry/heartbeat races, checkpoint resume, retry preserving the aggregate budget, and canonical evidence hashes. Live production migration remains subject to the repository's manual database-change procedure.
- Store only structured concise findings; do not request or retain hidden chain-of-thought. No UI/public read path is enabled yet.

**Knowledge delta in the same commit:** Update `docs/03-architecture/clawai-threads-architecture.md`, existing `docs/04-backend/service-guide-thread-generation.md` (adopt the repository's canonical guide instead of adding a duplicate), `docs/06-data/environment-variables.md`, `wiki/Threads.md`, generated `docs/wiki/index.md`, `context/event-flow-map.md`, `context/service-dependency-map.md`, `context/database-ownership-map.md`, `context/port-and-service-map.md`, `context/service-catalog.md`, `context/workspace-map.md`, `docs/04-backend/services-index.md`, root `CLAUDE.md` router, service `CLAUDE.md`, and the `skills/00-index.md` entry; add `skills/run-threads-generation-queue.md`. Add enforceable `rules/61-threads-generation-invariants.md` only alongside architecture tests that check the service boundary, exact-hash consensus, full-context path, and dedicated queue. No new skill duplicating existing research/model gateway runbooks.

**4a validation:** changed generation/research specs; changed-file lint; generation and Chat typecheck/build; Docker generation image build (including shared-types); shared-types typecheck; installer and Compose config validation; focused billing/i18n regression. Frontend production build and restart/resume/worker-loss behavior are explicitly deferred. QA record `docs/qa-evidence/2026-10-04-threads-generation-pipeline.md`.

**4b validation and knowledge delta:** changed-file ESLint; four focused specs (15 tests); generation-service typecheck; Prisma schema validation. Update `docs/03-architecture/clawai-threads-architecture.md`, `docs/04-backend/service-guide-thread-generation.md`, `wiki/Threads.md`, `skills/run-threads-generation-queue.md`, this plan, and create `docs/changes/2026-10-05-threads-batch-4b-worker-recovery.md` plus `docs/qa-evidence/2026-10-05-threads-generation-recovery.md`. Regenerate `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`. No new rule or skill: the existing queue runbook and scoped-gate/QA rules cover the recovery procedure. Live DB migration, API/browser integration, full QA lanes, commit, push, CI, and deployment remain pending; do not represent them as passed.

### Batch 5 â€” Publication lifecycle, social, moderation, and deletion

**Outcome:** Owners can review, approve, publish, revise, unpublish, and export; authenticated readers can participate; moderation and account deletion follow the approved policy.

**Execution split (safety gate):** 5a provisions the Threads-owned database
and atomic owner approval transition. 5b-a wires authenticated generation
handoff, snapshot-first reservation of the existing entitlement cap,
cancellation, and private draft synchronization. 5b-b adds safety scanning and validated owner revisions before
public reads, unpublish, and exports. 5c adds social, moderation, reports, and
account-deletion handling. Do not publish or expose public content before 5b-b.

**5a status:** Implemented, normally committed/pushed, CI-green, and deployed
to production in release `v1.182.1` (`5f7cdc9`). Production Threads and
generation containers are healthy; `pg-threads` accepts connections. The
production `.env` is `deploy:deploy` mode `600` and readable by the deploy user.
Production route probing returned the expected unauthenticated 401.

**5b-a knowledge delta:** `docs/03-architecture/clawai-threads-architecture.md`,
`docs/04-backend/service-guide-threads.md`,
`docs/04-backend/service-guide-thread-generation.md`,
`skills/run-threads-generation-queue.md`, `wiki/Threads.md`, this plan,
`docs/changes/2026-10-05-threads-batch-5b-generation-handoff.md`, and
`docs/qa-evidence/2026-10-05-threads-generation-handoff.md`. No new rule or
skill: the existing billing, service-boundary, generation-queue, and QA rules
cover this API seam. Regenerate generated knowledge and inventory artifacts.
Also refresh the directly affected product spec, `docs/04-backend/services-index.md`,
`context/architecture-map.md`, `context/service-dependency-map.md`, root
`AGENTS.md` workspace count, and the earlier 5a QA evidence now that its release
and production deployment have completed.
The implementation is incomplete until normal hooks, push, CI, local runtime
probe, and deployment complete.

**5b-b progress:** The first deployable slice adds publication safety scanning,
fail-closed public read allow-lists, owner unpublish, and JSON/Markdown exports.
Safety findings are machine codes only; a secret/PII match stays private.
Public resolution requires PUBLISHED, OWNER_APPROVED, safety APPROVED, and
indexEligible in the database query. Owner text edits and revalidation remain a
separate required slice: revalidation must use a new owner-selected cap and a
durable idempotent Generation-service operation before an edit can become
review-ready. UI and discovery integration remain separate later batches.

**5b-b knowledge delta:** `docs/02-business-product/clawai-threads-product-spec.md`,
`docs/03-architecture/clawai-threads-architecture.md`,
`docs/04-backend/service-guide-threads.md`, `wiki/Threads.md`, this plan,
`memory/2026-10-04-clawai-threads-product-decisions.md`,
`docs/changes/2026-10-05-threads-publication-safety-reads.md`, and
`docs/qa-evidence/2026-10-05-threads-publication-safety-reads.md`. No new skill
or rule: current service, security, and QA runbooks cover this implementation.

**5b-c plan â€” owner text edits and exact-text revalidation:**

- **Code paths:** `apps/claw-threads-service/src/modules/publications/{controllers/publication-owner.controller.ts,services/publication-lifecycle.service.ts,repositories/publications.repository.ts,services/threads-generation.client.ts,dto/}`, `apps/claw-threads-service/prisma/schema.prisma` and its additive migration; `apps/claw-thread-generation-service/src/modules/generation/{dto/,services/generation-jobs.service.ts,repositories/generation-jobs.repository.ts,managers/generation-pipeline.manager.ts,types/}` and its schema/migration; focused specs beside each changed module.
- **Callers/contracts:** authenticated owner edit route â†’ Threads lifecycle â†’ service-token generation request â†’ durable generation queue â†’ owner-state poll. The public reader continues serving the prior owner-approved revision until explicit approval atomically activates the validated candidate.
- **Data/money:** immutable revision rows; each edit uses a fresh idempotency key and owner-selected cap; generation reserves a new aggregate budget and reuses the parent job's immutable source snapshot and saved evidence. No fresh research, no closed-budget reuse, no direct cross-database reads.
- **Knowledge delta in the same batch:** update `docs/02-business-product/clawai-threads-product-spec.md`, `docs/03-architecture/clawai-threads-architecture.md`, `docs/04-backend/service-guide-threads.md`, `docs/04-backend/service-guide-thread-generation.md`, `wiki/Threads.md`, this implementation plan, `memory/2026-10-04-clawai-threads-product-decisions.md`, and create `docs/changes/2026-10-05-threads-owner-edit-revalidation.md` plus `docs/qa-evidence/2026-10-05-threads-owner-edit-revalidation.md`. Regenerate `.ai/**`, workspace `AGENTS.md`, and `docs/features/ai-native-engineering-os/inventory.snapshot.json`. No new skill/rule: existing metering, generation queue, service-boundary, and QA runbooks cover the procedure and invariants.
- **Deployment:** additive migrations only; keep routes internal/authenticated, default private, and safe for automatic production rollout.
- **Scoped gate, once at the end:** changed-file ESLint/Prettier; focused Threads and generation specs; both services' typecheck/build; migration/schema validation; QA evidence, knowledge, and inventory validators; normal hooks, push, CI, release, and production health/API verification.
- **Assumptions:** a revalidation uses the roles and evidence pinned to the original generation, but a new user-selected cap/idempotency key; reviewer outputs are valid only for the exact candidate hash; failed validation leaves the candidate private and the currently published revision unchanged.

**5c-a plan â€” authenticated community contributions and reports:**

- **Code paths:** `apps/claw-threads-service/prisma/schema.prisma` plus additive migration; `apps/claw-threads-service/src/modules/publications/{controllers,dto,repositories,services,types}` and focused tests. Extend public reads through explicit DTO allow-lists only.
- **Callers/contracts:** public read â†’ authenticated comment/reaction/change-request/report routes. Require an authenticated account, but do not gate contributions on generation entitlements. Publication owners review change requests; existing moderators resolve reports and hide violating comments.
- **Data/security:** unique per-user reactions, bounded comment/request text, publication must be currently public, no author identity list in public reads, no cross-owner mutation, and report details remain moderator-only. Reuse existing global rate limits; do not add a second limiter.
- **Knowledge delta in the same batch:** update this plan, `docs/02-business-product/clawai-threads-product-spec.md`, `docs/03-architecture/clawai-threads-architecture.md`, `docs/04-backend/service-guide-threads.md`, `wiki/Threads.md`, and add `docs/changes/2026-10-05-threads-community-contributions-and-moderation.md` plus `docs/qa-evidence/2026-10-05-threads-community-contributions.md`; refresh generated `.ai/**`, service `AGENTS.md`, `docs/wiki/index.md`, and inventory snapshot. No new rule or skill: existing RBAC, service-boundary, and whole-team QA runbooks apply.
- **Deferred within 5c:** Auth-owned account deletion and cross-service erasure/anonymous retention are a separate 5c-b batch because Auth currently hard-deletes the user without a durable event/outbox. Do not claim deletion compliance until that path is durable and verified.
- **Scoped gate, once at the end:** changed-file ESLint/Prettier; focused Threads specs; Threads typecheck/build; additive migration, authenticated/unauthenticated API probes, IDOR checks, QA evidence, generated knowledge/inventory; normal hooks, push, CI, release, and production health.
- **Assumptions:** the owner decision permits anonymous public comment attribution after deletion; this batch does not change deletion behavior. Contribution and report controls use existing authentication/RBAC infrastructure.

**5c-a implementation status:** Backend contribution/report APIs, owner
resolution through a fresh capped revision review, moderator resolution, schema
migration, docs, and focused tests are implemented. The batch remains partial:
account-deletion processing, UI, internationalization, and integrated role
fixtures are follow-up work. See `docs/changes/2026-10-05-threads-community-contributions-and-moderation.md`.

**5c-a production result (2026-10-05):** Release `v1.187.1` at
`0a7df7e590e9ac4c1d7abff444148a8dd40897b9` is deployed. The deployment status
file records `completed` at that SHA; Threads API and generation containers
report healthy; production nginx passes `nginx -t`; the generation API returns
401 without credentials through nginx and `/api/v1/health` returns 200. The
corrected production image build includes `@claw/shared-entitlements` in both
Threads Docker build stages. See the updated community QA evidence.

**5c-b plan — durable account deletion and anonymous retention:**

**Status (2026-10-05):** Implemented in this working batch. Auth writes a
transactional outbox event; Threads and Generation consume it idempotently with
hashed tombstones and the approved retention policy. Focused specs pass; live
cross-service QA, lint/typecheck/build, generated knowledge, and CI remain open.

- **Code paths:** add `USER_DELETED` to `packages/shared-types/src/events/event-patterns.ts` and its payload to `event-payloads.type.ts`; add an Auth-owned deletion outbox model/migration in `apps/claw-auth-service/prisma/` plus `users.repository.ts`, `users.service.ts`, `users.module.ts`, a deletion-outbox repository/publisher and focused specs. Add deletion tombstones/migrations and layered account-deletion consumer/service/repository/specs to `apps/claw-threads-service/src/modules/account-deletion/` and `apps/claw-thread-generation-service/src/modules/account-deletion/`; guard publication/job creation in their existing repositories against a tombstoned account. No new public route or environment variable.
- **Callers/contracts:** Auth account deletion transaction -> durable outbox -> typed RabbitMQ event -> independent idempotent consumers in Threads and Thread Generation. Keep service database ownership; do not synchronously fan out HTTP or cross-read a database.
- **Data/deletion:** retain only Threads revisions already owner-approved and public, clear source snapshots and owner identity, delete private/unapproved publications and all generation jobs/artifacts, remove publication reactions, anonymize visible comments, delete pending change requests, and clear deleted reporter/moderator identity from retained moderation records. Persist a one-way account digest plus event ID as a tombstone, never the raw account ID, in each consumer database. Outbox payload is cleared after successful publish; delivery is at least once and consumers are idempotent.
- **Knowledge delta in the same commit:** update this plan, `docs/02-business-product/clawai-threads-product-spec.md`, `docs/03-architecture/clawai-threads-architecture.md`, `docs/03-architecture/data-ownership.md`, `docs/04-backend/service-guide-threads.md`, `docs/04-backend/service-guide-thread-generation.md`, `wiki/Threads.md`, `docs/wiki/index.md`, `context/database-ownership-map.md`, `context/service-dependency-map.md`, `memory/2026-10-04-clawai-threads-product-decisions.md`, `docs/13-adr/adr-index.md`; add ADR-160, `rules/61-threads-account-deletion.md`, `skills/handle-cross-service-account-deletion.md`, `docs/changes/2026-10-05-threads-account-deletion.md`, and `docs/qa-evidence/2026-10-05-threads-account-deletion.md`; update the existing community QA record with the successful release/deployment proof and register the new rule in `rules/README.md`. Regenerate `.ai/**`, service `AGENTS.md` files, and `docs/features/ai-native-engineering-os/inventory.snapshot.json` from their sources.
- **Why no other knowledge:** no new public behavior, plan permission, model role, or user-facing string is introduced. No `.env.example`, installer, nginx, README, or locale edit is needed; the new delivery uses existing RabbitMQ configuration and the launch UI is a later batch.
- **Scoped gate, once at the end:** changed-file ESLint/Prettier and matching specs; Auth, shared-types, Threads, and Thread Generation workspace typecheck/build; validate and apply the three additive local migrations; focused data-retention/idempotency probes; run the QA evidence checker and Akinator path/sensitive/version checks; then normal hooks, push, CI, release, deploy, and production health verification.
- **Assumptions:** Auth's existing self-delete endpoint remains the sole initiator; event delivery is at least once; anonymized approved publication content remains public by the owner's decision. If account IDs become reusable or a legal retention rule requires a different record policy, the digest/tombstone and cleanup policy must be revisited.

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

### Batch 6 â€” Owner and community UI, all locales

**Outcome:** Users can configure generation, review its cost/status, manage drafts/publications, contribute, report abuse, and review change requests in an accessible responsive interface.

**Progress:** Owner generation, approval, community controls, and deletion handling are implemented. Batch 7 adds persisted content locale, language-specific author prompts, public server rendering and metadata, a localized discovery hub, independent sitemap chunks, and RSS/Atom entries. Scoped tests, typechecks, production build, and browser/device checks pass. Role-tier, approved-publication UAT, Lighthouse, and remote CI/release evidence remain open.

**Knowledge delta for public reader UI:** `docs/02-business-product/clawai-threads-product-spec.md`, this plan, `wiki/Threads.md`, `docs/changes/2026-10-05-threads-public-reader-community-ui.md`, and `docs/qa-evidence/2026-10-05-threads-public-reader-community.md`. Generated `.ai/**`, workspace `AGENTS.md`, and the inventory snapshot are regenerated. No new rule, skill, ADR, or memory entry is needed: existing public-content safety, i18n, and QA rules apply; approved product decisions did not change.

**Knowledge delta for this owner-flow slice:** `docs/02-business-product/clawai-threads-product-spec.md`, `docs/05-frontend/frontend-architecture.md`, `context/request-flow-map.md`, `wiki/Threads.md`, this plan, `docs/changes/2026-10-05-threads-batch-6-generation-owner-ui.md`, and `docs/qa-evidence/2026-10-05-threads-generation-owner-ui.md`. Generated `.ai/**`, workspace `AGENTS.md`, and the inventory snapshot are regenerated. No new skill (existing prompt-pack, frontend/i18n, metered-credit, and QA runbooks apply), rule (no new invariant or gate was introduced), ADR or memory entry (approved product decisions did not change), or router (canonical indexes already point to these docs) is needed. `context/chat-surface-parity-map.md` is unchanged because chat and its shared modes were not modified.

**Knowledge delta for owner change-request review:** `docs/02-business-product/clawai-threads-product-spec.md`, this plan, `wiki/Threads.md`, `docs/changes/2026-10-05-threads-owner-change-request-review.md`, and `docs/qa-evidence/2026-10-05-threads-owner-change-request-review.md`; regenerate `.ai/**` and the inventory snapshot. Existing owner-only APIs, capped revision review, moderation, and billing rules are reused; no new rule, skill, ADR, memory entry, or router is introduced.

**Code:**

- Add Threads repository/hooks/components/pages under existing `apps/claw-frontend/src/lib/`, `src/hooks/`, `src/components/`, and `(portal)` route conventions; use `/api/v1/thread-publications`, never the legacy `/api/v1/threads` alias.
- Add generation disclosure and intent record, citation/style/type settings, model roles, visible cap, eligibility, queue progress, cancellation/retry, owner review, revision history, approval, publish/unpublish, exports, comments/reactions/change requests/reporting.
- Add every string to the 13 locale dictionaries and `i18n.types.ts`; test Arabic/Persian RTL, keyboard navigation, screen reader names, color contrast, and reduced motion.
- Do not duplicate normal chat orchestration surfaces. Threads consumes the same supported context/model abstractions without changing regular chat, Compare, Consensus, Escalation, labs, or Judge/Critic parity.

**Knowledge delta in the same commit:** Update `docs/05-frontend/frontend-architecture.md`, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, `context/request-flow-map.md`, and `context/chat-surface-parity-map.md` only for the new shared boundary; add screenshots to the QA evidence artifact. No new UI skill if existing frontend/i18n/accessibility skills cover it.

**Validation:** lint changed TS/TSX/i18n files only; run matching unit specs and focused Playwright tests; frontend typecheck/build; capture product screenshots and evidence at mobile/tablet/desktop and both orientations, including RTL. QA record `docs/qa-evidence/2026-10-04-threads-owner-ui.md`.

**Cancellation recovery slice:** The portal now distinguishes a pending cancellation request, accepted cancellation, retryable failure, and terminal cancellation from worker state. Knowledge delta in the same batch: this plan, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, `docs/changes/2026-10-05-threads-generation-cancellation-ux.md`, and `docs/qa-evidence/2026-10-05-threads-generation-cancellation-ux.md`; regenerate `.ai/**`, workspace `AGENTS.md`, and inventory. No new skill, rule, ADR, memory entry, or router is needed because cancellation uses the existing owner-scoped API and worker behavior; no security or business contract changes.

### Batch 7 â€” Public reading, hub, SEO, sitemap, feeds, and marketing

**Outcome:** Approved, safety-approved, index-eligible Threads are independently discoverable without lifting chat-share lockdown.

**Code:**

- Add public detail/hub pages under existing `(marketing)` Next.js routes, with localized metadata, canonical links, robots, structured article data, safe rendering and related publications.
- Extend the existing public-content registry, sitemap, RSS/Atom, cache, and llms.txt paths with a separate Threads source. Preserve existing chat-share filter and lockdown tests unchanged.
- Add search/category/pagination only where backed by current public-query patterns; never expose reader identities or private owner identifiers.
- Add marketing pages only after real screenshots/content and page-specific design/accessibility assertions are ready.

**Knowledge delta in the same commit:** Update `docs/03-architecture/clawai-threads-architecture.md`, `docs/02-business-product/clawai-threads-product-spec.md`, `wiki/Threads.md`, SEO/discovery docs, `context/request-flow-map.md`, `docs/01-executive-context/` only where positioning requires a link, and the flagship/marketing page registries. Update sitemap/feed docs and operational discovery runbooks.

**Validation:** changed discovery and route specs only; changed-file lint; focused Playwright/public route snapshots; independent proof that locked chat shares remain absent while eligible Threads appear; Lighthouse on each new public marketing URL, including accessibility/color contrast. QA record `docs/qa-evidence/2026-10-04-threads-public-discovery.md`.

### Batch 7 deployment correction - production frontend image

**Outcome:** The release deployment builds and serves the Threads discovery frontend on the production image.

**Evidence:** Release `v1.194.0` reached production deployment, but the frontend Docker build failed before any containers were recreated. `next build --turbopack` on `node:26-alpine` could not resolve `@vercel/turbopack-next/internal/font/google/font` for the existing `next/font/google` imports. CI's frontend build used Ubuntu and passed. The canonical stack and all other production images use `node:26-bookworm-slim`.

**Code:** Change only `apps/claw-frontend/Dockerfile` to use the canonical Debian/glibc base. Add a regression assertion in `tools/__tests__/deploy-workflow.test.mjs`. Keep the existing fonts and Turbopack build command.

**Knowledge delta in the same batch:** Update `wiki/Build-System.md`, `docs/changes/2026-10-05-threads-public-discovery.md`, and this plan. Update the L15/findings/open-gaps in `docs/qa-evidence/2026-10-05-threads-public-discovery.md` with the deploy failure and actual recovery evidence. No new skill, rule, context, memory entry, ADR, or router: the existing canonical stack already requires Bookworm, and this fix introduces no new operational procedure or product contract.

**Validation:** Run only `node --test tools/__tests__/deploy-workflow.test.mjs` and a production frontend Docker build, then run the end-of-batch knowledge/audit gates. Push through normal hooks. Verify the release workflow's production health checks and the live Threads discovery endpoint before Batch 8.

**CI follow-up:** Full CI selected all workspaces and exposed a stale generation repository fixture missing `contentLocale`. Add the selected locale and assert it is preserved by revision-review requests in `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts`. The focused spec passes 11/11; push this test correction with the QA/change-record update and wait for the scoped CI rerun before production release.

**Production build concurrency follow-up:** Release `v1.194.1` fixed the frontend base image, but the 19-service rollout still overloaded the 8-core VPS during one Compose build despite `COMPOSE_PARALLEL_LIMIT=1`. The environment variable alone did not serialize BuildKit targets. Pass Docker Compose's explicit `--parallel` limit and default to 1 for both manual and automatic deploys. The v1.194.2 retry still saturated swap because Compose/BuildKit scheduled every requested target from one invocation; it was stopped before container recreation. The prior deployed SHA remained active.

**CI follow-up:** The Linux end-to-end deployment rehearsal's Docker stub parsed Compose options before the `build` subcommand but did not consume the new global `--parallel` option. This made the stub mistake a failed build for a successful deploy and invalidated its downstream assertions. Update `tools/__tests__/deploy-prod-e2e.sh` to parse the option and assert the fixture behavior from `tools/__tests__/deploy-prod.test.mjs`; run the rehearsal in WSL Ubuntu on Windows.

**Build serialization correction:** Build planned services in separate Compose invocations rather than passing every target to one BuildKit Bake graph. Keep one 3600-second total deadline across the service loop and retain bounded transient network retries for the individual failing service. Regression evidence: the WSL Ubuntu deployment rehearsal passes 131/131 and asserts each Compose build has one target. Production v1.194.2 remains undeployed; the next release must prove host load stays within safe limits before any container recreation.

### Batch 8 â€” Enablement, integrated QA, and release readiness

**Outcome:** The whole product is enabled only after all prior batches are deployed and verified; launch readiness includes the whole repository QA team and real evidence.

**Code:** fix only integration defects found by the preceding lanes. Keep changes within their owning workspace; no unrelated refactors.

**Knowledge delta in the same commit:** Complete `docs/features/clawai-threads/` with scaled SDLC artifacts (`00-intake.md`, `01-business-analysis.md`, `02-product-requirements.md`, `03-acceptance-criteria.md`, `04-scope-and-non-goals.md`, `06-delivery-plan.md`, `08-architecture.md`, `09-impact-analysis.md`, `10-security-analysis.md`, `11-data-and-migration-plan.md`, `12-test-strategy.md`, `16-developer-validation.md`, `17-QA-evidence.md`, `20-UAT.md`, `21-go-no-go.md`, `22-release-plan.md`, `23-rollback-plan.md`, `25-release-evidence.md`). Update `wiki/Threads.md`, `wiki/Home.md`, `wiki/_Sidebar.md`, `wiki/Flagship-Features.md`, `docs/02-business-product/flagship-features.md`, `docs/13-adr/adr-index.md`, product/business indexes, service/context maps, root/service routers, and memory with final behavior and release evidence. Add or extend one reusable skill/rule only if prior batches established a real repeatable procedure/enforced invariant.

**Validation:** run the full QA team across all 15 lanes with `docs/qa-evidence/2026-10-04-clawai-threads-launch.md`; run each relevant changed-file spec, touched-workspace typecheck/lint/build, QA evidence checker, `npm run knowledge:verify`, `npm run audit:check`, focused Playwright, real curl/API with branch-log proof, free/paid/admin RBAC matrix, device/orientation/RTL screenshots, security, performance/accessibility, all-locale review, UAT, CI/release/deploy checks. Run no all-workspace `npm test` or lint. Report any unavailable lane as NOT_RUN and do not claim DONE until closed.

**Batch 8 progress (2026-10-06):** live API, browser, device and RBAC lanes ran on the local stack and are recorded in `docs/qa-evidence/2026-10-06-clawai-threads-launch.md` (PARTIAL). They found and fixed raw translation keys across the Threads UI and a missing article JSON-LD (`docs/changes/2026-10-06-threads-live-qa-fixes.md`). The 18 SDLC files are replaced by `docs/features/clawai-threads/README.md`. Still open: capped live generation UAT, paid/custom-role matrix, Lighthouse, and the production rollout. Pack items outside this plan (views counter, push/email, auto incident ticket, TOON, marketing pages) await an owner scope decision.

## Prompt-pack 40-round verification map

The 40 rounds below are the pack's distinct verification concerns, distributed into the owning batches. They supplement the repository's 15 QA evidence lanes; they do not replace them. Record exact command/action, output, screenshots/logs where relevant, and data cleanup. Use the per-batch QA record as the index to its round evidence.

| Round | Verification                                                                                            | Owning batch                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Requirement â†’ implementation path â†’ automated test â†’ live evidence traceability                   | All; consolidate in 8                                                                                                                          |
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
| 15    | Exhausted fallback â†’ final failure, notification/ticket, no public content, released credits          | 4                                                                                                                                              |
| 16    | Credit sufficiency, cap, hold, partial failure, actual finalize, cancel/crash release, no double charge | 3 and 4                                                                                                                                        |
| 17    | Anonymous/user/custom/contributor/moderator/admin direct API access                                     | 3 and 5                                                                                                                                        |
| 18    | Dynamic plan enable/disable; generation gate while contributions remain available                       | 3 and 6                                                                                                                                        |
| 19    | Public hub/detail/pagination/search/social/change-request APIs                                          | 5 and 7                                                                                                                                        |
| 20    | Like/dislike, comments, accept/reject, publish/revoke/read concurrency                                  | 5                                                                                                                                              |
| 21    | Anonymous/authenticated readers, crawler/bot filtering, rate abuse, deleted owner                       | 5 and 7                                                                                                                                        |
| 22    | IDOR, injection/XSS/SSRF, prompt injection, CSRF, mass assignment, secrets, PII, spam, enumeration      | 5â€“7                                                                                                                                          |
| 23    | Credential/PII fixtures and block/warn/redact behavior                                                  | 2 and 5                                                                                                                                        |
| 24    | Sitemap/RSS eligibility, revoke, lastmod, locale/chunking, AI discovery, chat-share lockdown            | 7                                                                                                                                              |
| 25    | Ready/published/failure notifications and denied/invalid/duplicate delivery                             | 4â€“6                                                                                                                                          |
| 26    | One admin incident ticket with safe diagnostics and no raw thread/auth data                             | 4 and 5                                                                                                                                        |
| 27    | Full browser journey: create â†’ queue â†’ resume â†’ revise â†’ approve â†’ publish â†’ contribute     | 6 and 8                                                                                                                                        |
| 28    | Several real 15â€“25-turn topic threads with full provenance evidence                                   | 8; use local/lowest-cost available models and each job's user-selected cap; otherwise record NOT_RUN with the exact credential/runtime blocker |
| 29    | Mobile/tablet/desktop widths, both mobile/tablet orientations, Arabic RTL, overflow/overlap             | 6â€“8                                                                                                                                          |
| 30    | Keyboard, focus, labels, dialogs, live progress, contrast, reduced motion                               | 6â€“8                                                                                                                                          |
| 31    | All locales, no missing keys, localized marketing/email/push, RTL                                       | 6â€“8                                                                                                                                          |
| 32    | Public latency, queue/stage timings, query shape/N+1, discovery latency                                 | 4, 7, and 8                                                                                                                                    |
| 33    | Bounded queue/read/social/sitemap load and proof that queue pressure does not harm normal chat          | 4, 5, and 7                                                                                                                                    |
| 34    | Worker termination, research/provider/RabbitMQ/database outage and recovery                             | 4                                                                                                                                              |
| 35    | Dev/prod compose, health, env, nginx, installers, migrations                                            | 1 and 8                                                                                                                                        |
| 36    | Normal chat/share, auth, plans, billing, research, orchestration, sitemap/RSS regressions               | 2â€“8                                                                                                                                          |
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
