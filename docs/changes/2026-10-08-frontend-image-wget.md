# Frontend image needs wget (2026-10-08)

**Why.** Every production deploy since 2026-10-06 22:31 rolled back with "health verification failed". Next started fine; the compose healthcheck (`wget -qO- http://127.0.0.1:3000`) could not run because `node:26-bookworm-slim` has no `wget` (the Alpine image had it in busybox). Commit 6a3a6a685 moved the frontend to Bookworm without installing it.

**What.** `apps/claw-frontend/Dockerfile` installs `wget` in the runner stage. New root test `tools/__tests__/dockerfile-healthcheck-binary.test.mjs` fails when any prod compose service health-checked with `wget` or `curl` has a Dockerfile whose last stage does not install it.

**Not changed.** The healthcheck itself, the compose files, any service code.

**Prove it.** The next production deploy must reach "healthy" for `frontend`. Until then the live site is still the last good build (v1.193.0).

QA: `docs/qa-evidence/2026-10-08-frontend-image-wget.md`.
