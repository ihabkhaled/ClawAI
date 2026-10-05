# Threads publication safety and read slice

Date: 2026-10-05. Source: owner-approved Threads prompt pack and recorded
product decisions. Before: generated drafts stayed private and had no scanner,
public read, unpublish, or export path. Why: public intent still requires owner
approval, while secret/PII matches need to remain private. Business impact:
owners can approve clean work and revoke it; readers receive only approved safe
content. Operational impact: one additive Threads migration applies at service
start; rollback requires a forward migration if any rows have been written.

Batch 5b-b adds a bounded secret/PII scan for generated publication content.
Matched content remains private; persisted safety findings are machine codes and
never include matched text. Passing safety and the existing Judge/Critic floors
makes a revision eligible for owner approval.

The public API resolves only published, owner-approved, safety-approved,
index-eligible revisions, and returns Markdown plus citation URLs through an
explicit allow-list. Owner APIs unpublish and export JSON or Markdown. Text edits
and their new budgeted revalidation operation remain unfinished and must land
before launch.

Changed paths traced by this record:

- `apps/claw-threads-service/prisma/schema.prisma`
- `apps/claw-threads-service/prisma/migrations/20261005140000_threads_publication_safety/migration.sql`
- `apps/claw-threads-service/src/common/enums/publication-export-format.enum.ts`
- `apps/claw-threads-service/src/modules/publications/constants/publication-review.constants.ts`
- `apps/claw-threads-service/src/modules/publications/constants/publication-safety.constants.ts`
- `apps/claw-threads-service/src/modules/publications/controllers/publication-owner.controller.ts`
- `apps/claw-threads-service/src/modules/publications/controllers/publication-public.controller.ts`
- `apps/claw-threads-service/src/modules/publications/publications.module.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/__tests__/publications.repository.spec.ts`
- `apps/claw-threads-service/src/modules/publications/repositories/publications.repository.ts`
- `apps/claw-threads-service/src/modules/publications/services/publication-lifecycle.service.ts`
- `apps/claw-threads-service/src/modules/publications/types/publication-safety.types.ts`
- `apps/claw-threads-service/src/modules/publications/types/publication.types.ts`
- `apps/claw-threads-service/src/modules/publications/utilities/__tests__/publication-safety.utility.spec.ts`
- `apps/claw-threads-service/src/modules/publications/utilities/publication-safety.utility.ts`
- `docs/02-business-product/clawai-threads-product-spec.md`
- `docs/03-architecture/clawai-threads-architecture.md`
- `docs/04-backend/service-guide-threads.md`
- `docs/features/ai-native-engineering-os/inventory.snapshot.json`
- `docs/qa-evidence/2026-10-05-threads-publication-safety-reads.md`
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md`
- `docs/wiki/index.md`
- `memory/2026-10-04-clawai-threads-product-decisions.md`
- `wiki/Threads.md`
- `docs/changes/2026-10-05-threads-publication-safety-reads.md`

Knowledge paths `AGENTS.md`, `.ai/**`, and
`docs/features/ai-native-engineering-os/inventory.snapshot.json` were generated
from the changed tree; no hand edits were made. Flat `wiki/Threads.md` follows
the repository's existing wiki convention. No README or router change was
needed because the backend service guide and existing root routers already link
the relevant service/product documentation.

Verification: 16 focused tests passed; changed-file ESLint and Prettier passed;
Threads typecheck and build passed; the local Prisma deploy applied the safety
migration; the local public route returned the expected 404 for a missing slug
through nginx; `nginx -t` passed. See the linked QA evidence for unrun lanes.

Stale when: publication schema, public response shape, safety patterns, export
formats, or QA gate results change.
