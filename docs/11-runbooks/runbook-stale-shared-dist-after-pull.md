# Runbook - Typecheck or boot fails after `git pull` in a service nobody touched

**Symptoms:** pre-commit typecheck errors such as "Property 'promptCaching' does not exist"
or "'cacheWriteInputTokens' does not exist on RawTokenBreakdown"; a dev container loops on
`nodemon app crashed`; Vitest says "Failed to resolve entry for package @claw/shared-utilities".

**Cause:** upstream changed `packages/shared-*` or a Prisma schema; your local `dist` and
generated Prisma clients are old. In CI the same error means a job forgot the shared build.

**Fix (cheapest first):**

1. `npm run build --workspace=@claw/shared-types`, then `shared-constants`, then `shared-utilities`.
2. In each failing service: `npx prisma generate`, then `npm run typecheck` there only.
3. Dev containers carry a baked copy: `./scripts/claw.sh service:rebuild <svc>` (restart is not enough).
4. In CI, every `needs.changes`-gated job copies the "Build shared packages" step
   ([rules/48](../../rules/48-lint-and-test-only-what-changed.md) item 7).
