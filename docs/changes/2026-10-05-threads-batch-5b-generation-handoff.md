# Change - Threads batch 5b-a: authenticated generation handoff

Date: 2026-10-05
Status: Deployed in release 1.183.0; remaining flagship sub-batches are still pending
Decision: Continue ADR-159 two-service ownership and approved Threads consent, cap, and owner-approval policy.

## Before

The generation worker persisted ready drafts privately in its own database, but
Threads could not start a job, read its state, or persist the resulting draft.
There was no owner API between the publication domain and the generation job
domain.

## Change

- Threads derives `ownerId` from the authenticated request, requires the
  `threads-public-v1` intent version and user-selected cap, and idempotently
  enqueues through the service-token-protected generation API. After source
  ownership validation, generation-service reserves the existing Auth
  entitlement budget before job persistence and dispatch.
- Threads links the returned job to an opaque, owner-private publication.
- The generation service exposes an internal owner-state response only after
  matching both job ID and owner ID. It returns safe status and, when ready,
  Markdown, citations, and review scores; it excludes raw model communication,
  source snapshot, evidence bundle, cost, and internal findings.
- Threads owner polling checks publication ownership before the internal read
  and persists the result as an immutable `PENDING` revision. It does not mark
  the revision owner-approved or public.
- A matching idempotency retry returns the pinned job before another snapshot
  or budget reservation. Reusing a key with a changed request conflicts before
  another budget is held. This prevents one request from releasing an active
  job's shared budget.

## Why

The user-selected cap and existing entitlement path must remain authoritative,
and a job result must cross service boundaries through HTTP rather than shared
database access. Snapshot validation precedes Auth reservation, and idempotent
retries must not reserve or close a second budget. Owner approval remains a
distinct later transition. Public
reads, unpublish, and export stay gated until publication safety scanning and
the owner review flow are implemented.

## Knowledge delta

- Architecture and service ownership: `docs/03-architecture/clawai-threads-architecture.md`
- API/config operations: `docs/04-backend/service-guide-threads.md` and `docs/04-backend/service-guide-thread-generation.md`
- Queue runbook: `skills/run-threads-generation-queue.md`
- Product index: `wiki/Threads.md`
- Sequencing and accepted deviation: `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- Gate evidence: `docs/qa-evidence/2026-10-05-threads-generation-handoff.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and inventory snapshot are regenerated from source.

Code paths traced by this record:

- `apps/claw-thread-generation-service/src/modules/generation/`
- `apps/claw-threads-service/src/app/`
- `apps/claw-threads-service/src/modules/publications/`
- `tools/__tests__/esm-namespace-import-bindings.test.mjs`

No new rule or skill was needed: existing billing, service-boundary, queue, and
QA runbooks cover this path. No new environment variable was added; all three
URLs/token values already exist in `.env.example` and deployment environments.

## Verification

See the linked QA evidence for local HTTP probes, normal hooks, GitHub CI, and
production rollout. Public content behavior is explicitly outside this subbatch.
