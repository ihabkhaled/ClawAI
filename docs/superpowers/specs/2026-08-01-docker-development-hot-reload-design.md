# Docker development hot-reload design

## Outcome

Every ClawAI Node microservice in the development Compose stack will rebuild
and restart its running Node process when a bind-mounted TypeScript source file
changes on Windows Docker Desktop, Linux, or macOS. Production images and
production Compose behavior remain unchanged.

This infrastructure checkpoint lands before backend work for the VS Code
extension so later source changes take effect without repeated manual container
recreation. Until the checkpoint is verified, every affected service is
explicitly restarted or rebuilt after code changes.

## Existing-state audit

The development services already have the intended three-stage process:

1. `tsgo --watch` compiles `src` into `dist`;
2. `tsc-alias --watch` rewrites emitted aliases;
3. `nodemon --watch dist` restarts `node dist/main.js`.

Every backend service bind-mounts its own `src` directory. Prisma-owning
services also bind-mount `prisma` and use a development entrypoint for generation
and migrations. The frontend already enables Watchpack and Chokidar polling.

The failure is the first stage. The TypeScript watcher defaults to filesystem
events. Windows Docker Desktop exposes the changed bytes and timestamps through
the bind mount but does not reliably forward the host event into the Linux
container. When `tsgo` misses that event, `dist` does not change, so neither
`tsc-alias` nor `nodemon` has anything to process.

A live diagnostic touched only the modification time of
`claw-chat-service/src/main.ts`, waited six seconds, and restored the original
time. The mounted source timestamp changed, while the compiled `dist/main.js`
timestamp and `node dist/main.js` PID remained unchanged. This reproduces the
reported failure without changing source bytes.

## Design

The development services receive TypeScript's supported polling strategies:

```text
TSC_WATCHFILE=DynamicPriorityPolling
TSC_WATCHDIRECTORY=RecursiveDirectoryUsingDynamicPriorityPolling
```

These variables are defined once as a YAML anchor in
`docker/docker-compose.dev.services.yml` and merged into every Node
microservice. Existing service-specific environment values remain intact.
Production Compose files do not receive polling variables.

Dynamic-priority polling is preferred over replacing the build pipeline with a
full `npm run build` on every source event. It preserves incremental `tsgo`,
alias rewriting, and Nodemon restart behavior while adapting polling frequency
for inactive files. It also avoids running eighteen complete service builds on
every edit.

No container-level `restart: always` change is used. A Docker restart policy
only handles exited containers; it cannot detect or compile changed source.

## Source and dependency behavior

- `apps/claw-*-service/src/**`: incremental compile and process restart; no
  manual action after the checkpoint.
- A newly added TypeScript source file: directory polling discovers it, compiles
  it, and restarts the process.
- Prisma schema or migration: use the existing full rebuild/recreate procedure
  because generation and migrations belong to the entrypoint.
- Service `package.json` or lockfile: full rebuild/recreate.
- Shared package source: rebuild every dependent service because shared package
  distributions are image inputs rather than bind mounts.
- `.env`: restart the affected service.
- Compose or Dockerfile: recreate or rebuild as required.
- Nginx configuration: restart only nginx.

The existing `scripts/claw.sh` remains the sole Compose entrypoint.

## Verification

Static tests parse the rendered development Compose configuration and prove
that every Node microservice receives both polling variables, existing
service-specific variables survive YAML merging, the frontend keeps its own
polling configuration, and production services do not inherit development
polling.

Live verification covers representative service classes:

- a Prisma service using `docker-entrypoint.dev.sh`;
- a non-Prisma service started directly with `npm run dev`;
- a service with additional environment values;
- one local-AI-profile service when the profile is active.

For each representative service:

1. capture source timestamp, compiled output timestamp, Node PID, and health;
2. update only a tracked source file's timestamp;
3. verify compiled output changes and the Node PID is replaced within a bounded
   interval;
4. restore the original source timestamp;
5. wait for healthy status;
6. scan recent logs for fatal or unhandled errors.

At least one controlled byte-change fixture is also tested and restored to
prove the emitted JavaScript reflects content rather than timestamp alone.

## Failure handling

- A compile error keeps the watcher alive and prevents stale code from being
  reported as successfully reloaded.
- When a corrected source file compiles, the service resumes without container
  recreation.
- A restart must terminate the previous Node child before starting the next one
  so ports and RabbitMQ consumers are not duplicated.
- Health may become temporarily unavailable during restart but must recover
  within the service healthcheck window.
- Polling applies only to development containers to avoid production CPU cost.

## Acceptance criteria

- All eighteen development Node microservices receive the supported TypeScript
  polling strategies through rendered Compose configuration.
- A host edit to a bind-mounted service source file changes `dist`, replaces the
  Node process, and returns the service to healthy without manual restart,
  removal, image deletion, or recreation.
- New files are detected.
- Service-specific environment variables and profiles remain intact.
- Production Compose output contains no development watcher variables.
- Shared packages, dependencies, Prisma, environment, Compose, and nginx
  changes retain their documented rebuild/restart rules.
- Static tests, representative live probes, affected validation, generated
  knowledge checks, inventory audit, and Docker log scans pass.

## Deviation from the request

“Any code change” applies automatically to bind-mounted service source in the
development stack. Changes that alter image inputs or generated artifacts still
require rebuilds; pretending a process restart can install dependencies,
recompile shared packages, or regenerate Prisma would leave stale containers.
