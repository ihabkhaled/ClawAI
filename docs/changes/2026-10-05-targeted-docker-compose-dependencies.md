# Change - Threads Docker startup and production migrations

## Before

The scoped `service:recreate` and `service:rebuild` commands loaded only the
services Compose file. Compose rejected Threads generation because its
`depends_on` database was declared in the separate database file. Production
then failed migration because the non-root Prisma runner could not update its
engine files.

## Change

Both commands now include the mode's database Compose file while retaining
`--no-deps` and the named service arguments. Compose can resolve dependencies,
but the targeted commands still do not start or recreate database containers.
The production generation image grants its non-root runtime user ownership of
only Prisma's engine directory. The Docker toolkit skill documents the scoped
Compose behavior.

## Knowledge delta

- `scripts/claw.sh`
- `apps/claw-thread-generation-service/Dockerfile`
- `tools/__tests__/dockerfile-shared-package-completeness.test.mjs`
- `tools/__tests__/claw-service-commands.test.mjs`
- `skills/06-docker-toolkit.md`
- `wiki/Docker-and-DevOps-Architecture.md`
- Generated `.ai/**`, workspace `AGENTS.md`, and
  `docs/features/ai-native-engineering-os/inventory.snapshot.json`

No new rule or skill was needed; the existing Docker toolkit skill covers the
scoped service command behavior.

## Local runtime and validation

- The local `.env` and `.env.example` each contain one copy of all nine Threads
  URL, port, and generation-database keys. The local `.env` remains ignored.
- The generation DB answered `pg_isready`; both Threads containers became
  healthy after the targeted rebuild/recreate.
- `nginx -t` passed. The active Nginx route reached the Threads service over
  verified TLS and returned a JSON 404; the publication controller is not in
  this generation yet.
- The local mkcert leaf was reissued with both Threads service names in its
  SAN list; no CA change was needed. Nginx was reloaded after validation.
- The production image built locally. As UID 1001, `prisma migrate status`
  reported the schema current and `prisma migrate deploy` reported no pending
  migrations; the engine directory was writable.
- `node --test tools/__tests__/claw-service-commands.test.mjs`: 6 passed.
- Dockerfile permission assertion: passed as part of the focused test run.
- `bash -n scripts/claw.sh`: passed.
- The production release deploy remains pending a new green release workflow.
