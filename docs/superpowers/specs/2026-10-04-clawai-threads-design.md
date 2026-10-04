# ClawAI Threads Design

**Status:** Approved for planning by the owner's instruction to continue on 2026-10-04.

## Purpose

ClawAI Threads turns a user's private chat into a research-backed article or thread through asynchronous multi-model review. It adds a publication and community surface while keeping chat shares and their current discovery lockdown unchanged.

## Product decisions

- Supported publication types at launch: article, research article, guide, and technical explanation.
- Require real-source citations for factual claims. Preserve source URLs and evidence in the publication record.
- Use three to five author models. Proceed only when all active authors agree on the same exact draft hash. Judge threshold defaults to 80; Critic threshold defaults to 75; stop after three rounds.
- The generation action records public intent after a visible disclosure about publication and indexing. Do not add a separate consent checkbox. Generation output remains private until the owner explicitly approves publication.
- Require a user-selected maximum spend before enqueue. Use existing plan entitlement and credit-hold/finalize paths; add no PAYG pricing. The cap must bound aggregate cost over every provider call in the job.
- Authenticated users may comment, react, and request changes regardless of generation-plan eligibility. Use existing RBAC, rate limiting, reporting, owner controls, and admin moderation.
- Approved Threads have their own indexing and discovery eligibility. Keep the chat-share review lockdown enabled.
- On account deletion, approved publications remain publicly readable with anonymous attribution. Erase private source snapshots and generation artifacts, remove reactions, and retain public comments without account attribution or linkage. Delete pending private change requests; accepted changes already present in a published revision remain part of that immutable public revision.

## Architecture

Add two NestJS services, using the next available backend ports: `claw-threads-service` on 4019 and `claw-thread-generation-service` on 4020.

- **Threads service:** owns publication identity, immutable published revisions, owner approval, comments, reactions, change requests, moderation state, and public read/discovery APIs.
- **Generation service:** owns isolated generation workers, durable job checkpoints, attempts, cancellation, progress, and the dedicated RabbitMQ queue. Queue messages dispatch work; persisted state remains authoritative.
- **Chat service:** exposes a service-token-protected endpoint that returns an immutable, filtered source snapshot. Exclude system/developer/tool output, failed or placeholder responses, credentials, private metadata, and attachment storage identifiers. Pin every job to its snapshot hash; later chat messages cannot mutate it.
- **Research service:** performs searches and fetches. The generation service calls its existing API and persists a versioned evidence bundle; it does not scrape directly.
- **Shared systems:** extend existing authentication/RBAC, plan entitlements, credit metering, model capability/context sizing, i18n, audit, and public-content discovery patterns.

The legacy `/api/v1/threads` path rewrites to chat-service chat threads. Preserve it. Put publication APIs under a distinct prefix such as `/api/v1/thread-publications`; public pages use a distinct `/threads/<opaque-id>` route.

The generation pipeline stores structured drafts and deliberation records, never hidden chain-of-thought. Every author, Judge, and Critic receives semantically identical complete source and evidence bundles, identified by hashes. Resolve actual model context limits and output reserve before enqueue; never silently truncate. Use canonical JSON as the persisted source of truth. TOON export is allowed only with semantic round-trip tests and measured token savings; Markdown remains a user-facing export.

Generation progresses through research, parallel author drafts, exact-hash unanimous consensus, Judge review, independent Critic review, and `READY_FOR_USER_REVIEW`. Revisions preserve history. Owner edits that change meaning invalidate the prior review and require revalidation. Publishing switches the active immutable revision atomically.

The Threads public page exposes only an explicit allow-list. Opaque IDs are non-enumerable. Revoke/unpublish removes a publication from public reads and discovery. Search, sitemap, and feeds include only published, owner-approved, safety-approved, index-eligible Threads; the separate chat-share lockdown does not suppress them.

## Cost and failure controls

Before enqueue, reserve or otherwise enforce the selected job-wide spend ceiling using the existing credit system. Before each provider request, use the existing per-call hold/finalize/release flow and refuse a call that would exceed the remaining job cap. Persist actual usage and release unused reservation on success, failure, or cancellation. Idempotency keys prevent retries from charging twice.

Jobs need bounded retries, attempt counts, checkpoints, stale-worker recovery, cancellation, dead-letter handling, per-provider circuit breaking, queue fairness, and active-job limits. SSE/WebSocket is for live progress only; it is not job state. Provider failures must leave recoverable status and safe owner-facing messages.

## Security and privacy

- All owner APIs are authenticated and ownership-checked; internal service APIs require service tokens.
- All input uses existing Zod validation and service layering. Never cross another service's database boundary.
- Public DTOs use explicit field allow-lists; do not expose account IDs, emails, private chat IDs, model/provider internals, costs, moderation notes, or raw errors.
- Scan publication content before indexing; keep matched secret/PII text out of logs and responses. Comments and change requests are reportable and moderated.
- Show the public/indexing disclosure before generation and persist its version with the recorded intent. A generated draft is not public until owner approval.
- Account deletion preserves approved publication revisions with anonymous attribution, erases private snapshots and generation artifacts, removes reactions, anonymizes public comments, and deletes pending private change requests.

## UX and discovery

The create flow offers smart defaults and an Advanced section for model roles, citation style, audience, length, tone, language, research depth, and selected spend cap. Show estimated maximum spend and current plan/credit eligibility before enqueue. Provide status, cancellation, failure recovery, revision history, owner review, publish/unpublish, and exports.

Add the feature across all 13 supported locales, including RTL layouts. Extend existing public-content registry, localized sitemap, RSS, robots, metadata, and marketing-page conventions without changing chat-share eligibility. Do not launch a public reader identity list; expose only the public author identity selected for the publication, with deleted owners rendered anonymously.

## Rollout and validation

Keep new routes and discovery disabled until their owning service, migrations, frontend, and safety checks are ready. Each service must be wired through shared constants, health checks, nginx, every split compose file, installers, TLS host mapping, CI Prisma/test setup, service catalogs, and service documentation. Add no new environment variables unless required; any added value must follow the existing config propagation rules.

Use scoped, changed-file lint and tests during implementation. At each coherent batch boundary, run touched-workspace typecheck/lint/test/build once, record a tree-bound gate receipt, and keep normal git hooks enabled. Never use `--no-verify`; existing gate receipts already avoid repeating expensive checks for the exact staged tree. A successful push to `main` runs CI and then automatically creates a versioned release and production deployment, so every pushed checkpoint must be safe to deploy independently.

Every implementation batch records all 15 QA lanes in `docs/qa-evidence/<date>-<slug>.md`. Include API curl with branch log evidence, real browser flow and screenshots, RBAC/plan matrix, responsive/orientation/RTL matrix, UAT, regression, security, performance/accessibility, i18n, docs, and GitHub CI results. Never claim DONE with a skipped or failed required lane.

## Pack deviations and open review

- The pack requests a separate up-front consent control. The owner chose the generation action plus visible disclosure to record intent; final owner approval remains mandatory.
- Chat-share indexing remains locked down. Threads use their own approved-publication discovery gate.
- Account deletion follows the recommended policy: keep approved publication revisions public anonymously; erase private snapshots/generation artifacts; remove reactions; anonymize public comments; delete pending private change requests.
- The owner approved continuing from this design. The requested execution method is direct work on `main`, with one coherent, normally gated commit and push per batch.
