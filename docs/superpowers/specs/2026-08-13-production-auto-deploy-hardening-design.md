# Production Auto-Deploy Hardening Design

## Objective

Every successful CI and release run for a push to `main` must deploy the exact release commit to `/srv/clawai`. The server checkout remains free of tracked local edits, containers are recreated only after successful builds, and nginx serves a ClawAI-themed maintenance page when the frontend is temporarily unavailable.

## Evidence and root cause

Production run `31684025240` targeted release commit `b94fd48a`, fetched and checked it out, then stopped safely when the frontend Docker build received npm registry `ECONNRESET`. Containers and `.deploy/deployed-sha` correctly stayed on `707b2a9c`. This proves the existing CI-to-release-to-deploy trigger and exact-SHA synchronization work; the missing behavior is resilience to transient build-network failures.

## Architecture

### Trigger and source synchronization

Preserve the existing successful-CI to release to production-deploy chain. The release workflow passes its exact pushed release commit SHA into the reusable deployment workflow. On the server, `deploy-prod.sh` fetches origin and performs a detached exact-SHA checkout. This provides deterministic synchronization without a merge-prone plain `git pull` or any server-side code edits.

### Build resilience

Retry the complete Docker Compose build at most twice only when captured output contains a recognized transient network failure (`ECONNRESET`, `ETIMEDOUT`, temporary DNS/registry connectivity errors). Backoff is bounded. Compilation, configuration, migration, disk, and other deterministic failures exit immediately. Containers are never recreated until a build succeeds.

### Maintenance fallback

Intercept frontend upstream 502, 503, and 504 responses only in the frontend catch-all. Internally serve a responsive `maintenance.html` from the existing read-only nginx `public-tls` mount with HTTP 503, `Retry-After: 60`, and `Cache-Control: no-store`. API routes retain their existing behavior. The page uses ClawAI's dark navy/cyan theme, accessible contrast, and no external dependencies.

### Server integrity and verification

Never edit tracked production files through SSH. Deployment continues to reject tracked server changes. Success requires target checkout equality, affected-container health, and atomic `.deploy/deployed-sha` recording. After merge, observe the automatic release/deployment and verify clean tracked state, matching `HEAD` and recorded SHA, healthy containers, and the live application version.

## Failure behavior

- SSH transport failures retain existing bounded retries.
- Transient registry/build-network failures receive bounded retries.
- Deterministic build failures stop before container recreation.
- Failed frontend requests receive the maintenance page with HTTP 503.
- Database and persistent infrastructure containers remain outside automatic deployment.

## Tests

- Existing workflow tests cover successful CI, release, and exact-SHA deployment wiring.
- Deploy-script tests cover bounded transient-only retries and destructive-operation guards.
- Nginx tests cover frontend-only interception, headers, branding, and accessibility essentials.
- Knowledge, inventory, affected-workspace, nginx syntax, and normal Git hooks remain required.
