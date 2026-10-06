# Change - Use the canonical Bookworm runtime for production frontend builds

## Files

- `apps/claw-frontend/Dockerfile` (M)
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

The source fix and regression test are present. The focused test passes 21/21;
knowledge verification, inventory audit, evidence validation, trace, and changed
file secret guard pass. Production image build and redeployment are pending.

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
(21/21), `npm run knowledge:verify`, `npm run audit:check`, and the focused QA
evidence, trace, and secret-guard checks. This record is stale if the production
base image or the root cause changes before redeployment completes.

knowledge delta: documented deployment findings and canonical frontend image requirement in wiki and QA record.
