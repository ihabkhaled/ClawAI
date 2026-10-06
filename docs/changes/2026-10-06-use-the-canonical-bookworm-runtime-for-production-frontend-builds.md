# Change - Use the canonical Bookworm runtime for production frontend builds

## Files

- `apps/claw-frontend/Dockerfile` (M)
- `apps/claw-thread-generation-service/src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts` (M)
- `docs/changes/2026-10-05-threads-public-discovery.md` (M)
- `docs/qa-evidence/2026-10-05-threads-public-discovery.md` (M)
- `docs/superpowers/plans/2026-10-04-clawai-threads-implementation-plan.md` (M)
- `docs/wiki/index.md` (M)
- `tools/__tests__/deploy-workflow.test.mjs` (M)
- `wiki/Build-System.md` (M)

## Before

Release `v1.194.0` failed while building the production frontend image: Turbopack
could not resolve the existing Google font module from the Alpine-based image.
The deploy workflow stopped before recreating containers, leaving the previous
production version active.

## Change

Changed the frontend production Docker base to `node:26-bookworm-slim`, matching
the repository runtime baseline. Added a focused deployment workflow regression
test and updated the build wiki, Threads change record, plan, and QA evidence.

## Now

The Dockerfile fix and regression test are present. Full CI exposed a stale
generation repository fixture missing `contentLocale`; adding the locale and
asserting it in the review request makes the targeted spec pass 11/11. Lighthouse,
AI-native, and wiki publish gates pass. CI rerun, production image build, and
redeployment remain pending.

## Why

The repository mandates Debian/glibc images, and the failing image was the only
production Alpine frontend image. Keeping the same fonts and Turbopack command
isolates the runtime mismatch without changing product behavior.

## Who and intent

Owner requested a production deployment repair. Intent: allow the existing
release workflow to build and deploy the Threads discovery frontend.

## Alternatives

Switching to webpack or changing font imports would broaden the fix and diverge
from the existing frontend build setup.

## Verification and stale condition

Verified locally by `node --test tools/__tests__/deploy-workflow.test.mjs`
(21/21), `npx vitest run src/modules/generation/repositories/__tests__/generation-jobs.repository.spec.ts`
(11/11), `npm run knowledge:verify`, `npm run audit:check`, and the focused QA
evidence, trace, and secret-guard checks. This record is stale if the production
base image, locale schema, or either failure cause changes before redeployment completes.

knowledge delta: documented deployment findings, CI fixture correction, and canonical frontend image requirement in wiki and QA record.
