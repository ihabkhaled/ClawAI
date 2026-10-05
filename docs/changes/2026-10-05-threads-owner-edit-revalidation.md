# Threads owner edit and revalidation

Date: 2026-10-05. Source: approved Threads product decisions and
implementation plan Batch 5b-c. Before: owners could not edit a publication
through a durable reviewed flow. Why: edits must preserve publication quality
and cost consent. The owner now submits immutable candidate text, citations, a
fresh spend cap, and an idempotency key. Generation reviews that exact text
against the parent's pinned source and evidence. Business impact: a successful
edit is not public until the owner approves it; the prior approved revision
stays available. Technical alternative rejected: mutating the live revision or
reusing its old budget would break revision history and spend consent.

Threads persists edit request identity and its durable review job reference in
an additive migration. Generation stores the review as an existing durable job
kind, with no new queue or generation schema. The worker reuses pinned snapshot,
evidence, and role configuration, but gets fresh author consensus and
Judge/Critic review. Safety, unanimous exact-hash agreement, Judge 80, Critic 75,
and matching candidate hash are required before explicit owner approval.

Rollback: deploy a forward migration if the new fields have data; do not drop
revision history. No environment or Nginx change is required.

Changed paths traced by this record:

- `apps/claw-thread-generation-service/src/modules/generation/controllers/generation-jobs-internal.controller.ts`
- `apps/claw-thread-generation-service/src/modules/generation/dto/enqueue-revision-review.dto.ts`
- `apps/claw-thread-generation-service/src/modules/generation/managers/generation-pipeline.manager.ts`
- `apps/claw-thread-generation-service/src/modules/generation/managers/__tests__/generation-pipeline.manager.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/repositories/generation-jobs.repository.ts`
- `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/services/generation-jobs.service.ts`
- `apps/claw-thread-generation-service/src/modules/generation/services/__tests__/generation-jobs.service.spec.ts`
- `apps/claw-thread-generation-service/src/modules/generation/types/generation-pipeline.types.ts`
- `apps/claw-thread-generation-service/src/modules/generation/types/revision-review.types.ts`
- `apps/claw-thread-generation-service/src/modules/generation/utilities/revision-review.utility.ts`
- `apps/claw-thread-generation-service/src/modules/generation/utilities/__tests__/revision-review.utility.spec.ts`
- `apps/claw-threads-service/prisma/schema.prisma`
- `apps/claw-threads-service/prisma/migrations/20261005150000_threads_edit_revalidation/migration.sql`
- `apps/claw-threads-service/src/modules/publications/controllers/publication-owner.controller.ts`
- `apps/claw-threads-service/src/modules/publications/dto/edit-publication-revision.dto.ts`
- `apps/claw-threads-service/src/modules/publications/dto/__tests__/edit-publication-revision.dto.spec.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/__tests__/publications.repository.spec.ts`
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts`
- `apps/claw-threads-service/src/modules/publications/services/__tests__/publication-lifecycle.service.spec.ts`
- `apps/claw-threads-service/src/modules/publications/services/threads-generation.client.ts`
- `apps/claw-threads-service/src/modules/publications/services/__tests__/threads-generation.client.spec.ts`
- `apps/claw-threads-service/src/modules/publications/types/generation.types.ts`
- `apps/claw-threads-service/src/modules/publications/types/publication.types.ts`
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/03-architecture/clawai-threads-architecture.md`
- `docs/04-backend/service-guide-threads.md`
- `docs/04-backend/service-guide-thread-generation.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `memory/2026-10-04-clawai-threads-product-decisions.md`
- `wiki/Threads.md`
- `docs/qa-evidence/2026-10-05-threads-owner-edit-revalidation.md`
- `docs/changes/2026-10-05-threads-owner-edit-revalidation.md`

No new rule or skill was needed; existing billing, queue, and QA runbooks cover
the changed behavior. Generated knowledge and inventory are refreshed at the
batch gate. No environment variable or Nginx route changed.

Stale when: revision schema, review thresholds, queue contract, cap handling,
or lane evidence changes.
