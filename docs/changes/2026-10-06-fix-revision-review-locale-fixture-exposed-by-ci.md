# Change - Fix revision-review locale fixture exposed by CI

## Files

- `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts` (M)
- `docs/changes/2026-10-06-use-the-canonical-bookworm-runtime-for-production-frontend-builds.md` (M)
- `docs/qa-evidence/2026-10-05-threads-public-discovery.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `docs/wiki/index.md` (M)

## Before

Full CI for commit `6a3a6a685` failed the generation repository spec because its
saved parent request omitted the now-required `contentLocale` field. Runtime
schema validation correctly returned `STORAGE_ERROR` before creating a review job.

## Change

Added `contentLocale: 'en'` to the parent request fixture and asserted that the
revision-review request preserves that locale.

## Now

The focused repository spec passes 11/11. The prior full CI remains red for this
fixture; a new scoped CI run is pending. No runtime behavior changed.

## Why

The fixture must match the strict generation request schema, including the
selected locale used to build revision review jobs. This keeps the test aligned
with the current persisted request contract.

## Who and intent

The owner requested continuation through validation and push. This test-only
correction resolves the CI failure before production release.

## Alternatives

Weakening the strict schema or accepting missing locale would mask invalid saved
generation jobs; those options were rejected.

## Verification and stale condition

`npx vitest run src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts`
passed 11/11. Targeted ESLint passed. Knowledge, audit, QA evidence, and trace
checks pass. Stale if the revision-review request schema changes.

knowledge delta: update plan, QA evidence, and deployment change record with the CI fixture cause and targeted verification.
