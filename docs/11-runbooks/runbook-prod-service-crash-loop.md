# Runbook: Production service crash-loops after a release (Nest cannot resolve dependencies)

Companion to [runbook-service-crash](runbook-service-crash.md) and
[verify-a-release-on-production](../../skills/verify-a-release-on-production.md).

## Symptom

- Right after a release, `/api/v1/health` shows a service that IS deployed as
  down, routes through nginx return 502, and `docker ps` shows `Restarting`.
- CI was green and unit tests passed.

## Diagnose (read-only)

```bash
docker logs --tail 200 claw-<service>
```

The signature is `Nest can't resolve dependencies of the <Class> (?, ...)`.
It names the consumer class, the missing provider and the module. Check:

1. Which module lists the consumer (controller or provider)?
2. Does that same module list the dependency in `providers`, or import a module
   that exports it?

## Why tests did not catch it

Unit specs construct classes with mocks; they never build the Nest module graph.
A provider added to one module, or a consumer moved to another, compiles and
passes every spec and crashes only at boot.

## Fix pattern

1. Add the provider to the `providers` of the module that lists its consumer (or
   export it from its home module and import that module). Never `@Optional()`
   it away.
2. Add a spec that builds the module with `Test.createTestingModule` (overriding
   only I/O providers such as Prisma and the broker) and calls `compile()`, so a
   missing provider fails the test.
3. Boot the service locally before pushing (see
   [release lessons 2026-10-14](../16-quality-engineering/RELEASE_GATES_STANDARD.md#release-lessons-2026-10-14)).
4. Ship the fix through the normal gates. Rolling back or restarting on the host
   needs the owner's explicit OK.

## Verify

`docker ps` shows the container `healthy`, `/api/v1/health` lists it up, and the
log shows the application started with no resolver error.
