# ADR-123 — Release version bumps are not deploy changes

## Status

Accepted — 2026-09-25.

## Context

Production builds its own images in `scripts/deploy-prod.sh` on an 8-CPU,
16 GB VPS. Deploys run only on `chore(release)` commits, and each one rewrites
`"version"` (and exact `@claw/*` pins) in ~25 manifests via
`tools/release/version.mjs`. The planner treated the root `package.json` /
`package-lock.json` as broad impact and each app's `package.json` as a change
to that app, so **every release rebuilt all ~20 images**. On 2026-09-24
`history.log` shows ~15 full rebuilds; on 2026-09-25 the box hit 100% CPU and
85–90% RAM, clamd was OOM-killed and the server became unreachable. The build
cache, pruned only after a healthy rollout, had reached 236 GB.

## Decision

1. A changed `package.json` or `package-lock.json` whose only differences
   between the deployed and target SHA are **release versions** is removed from
   the change list before planning. Release versions are: the document's own
   `version`; each lockfile workspace entry's `version` (`""`, `apps/*`,
   `packages/*` keys); an exact semver pin on an internal `@claw/*`
   dependency. Anything else — a third-party dependency, a `*` pin becoming
   exact, a script — is still a real change, and the lockfile is still broad
   impact.
2. The comparison is a JSON comparison in `python3` (present on the host).
   Without a working Python the filter is off: every manifest counts as
   changed. Fail safe, never fail open.
3. `apps/claw-frontend/package.json` is exempt: the frontend inlines its
   version as `APP_VERSION` at build time, so its image really does change.
   Surfacing the version at runtime (so a release rebuilds nothing) is a
   possible follow-up; it needs a runtime source for the version in the
   frontend and was not done in this change.
4. BuildKit cache is bounded to 20 GB before every build, after a healthy
   rollout, and from the exit trap after a failed one — best-effort, capped at
   900 s, never changing the outcome.

## Consequences

- A release rebuilds the frontend plus whatever its feature commits touched,
  instead of every image.
- A backend image may carry an older `version` string in its copied
  `package.json`. No backend reads it at runtime, so nothing user-visible
  changes. `.deploy/status.json` still reports the target commit's version.
- A future service that reads its own manifest version at runtime must be
  added to `VERSION_BAKED_MANIFESTS` in `scripts/deploy-prod.sh`.
- Tests: `tools/__tests__/deploy-prod.test.mjs` (normaliser cases, trap
  wiring) and `tools/__tests__/deploy-prod-e2e.sh` (release-only commit builds
  only the frontend; a real lockfile change stays broad; prune counts on
  failure, unhealthy and success paths).
- Runbook: [runbook-server-overloaded-by-builds.md](../11-runbooks/runbook-server-overloaded-by-builds.md).
