# 14 — Shared Packages

## Purpose

Six `packages/shared-*` workspaces hold everything used by two or more services.
They exist to kill duplication and to give cross-cutting concerns (types, events,
auth, RabbitMQ, entitlements, utilities) a single owner. Editing them has repo-wide
blast radius, so they carry the strictest wiring rules.

## Applies to

`packages/shared-{auth,constants,entitlements,rabbitmq,types,utilities}`.

## Mandatory rules

1. **Right package for the kind of thing:**
   - `@claw/shared-types` — TS types + RabbitMQ event payloads shared by 2+ services.
   - `@claw/shared-constants` — values shared by 2+ services (ports, names, `EXCHANGE_NAME`, `API_PREFIX`).
   - `@claw/shared-utilities` — functions shared by 2+ services (http-client, jwt, crypto, retry).
   - `@claw/shared-auth` — guards/decorators (`AuthGuard`, `RolesGuard`, `@Public`, `@Roles`, `@CurrentUser`).
   - `@claw/shared-rabbitmq` — `RabbitMQModule`/`RabbitMQService` (retry + DLQ), `StructuredLogger`.
   - `@claw/shared-entitlements` — plan/feature gate evaluation.
2. **Promote on the second copy.** The moment a helper exists identically in two
   services, move it to `@claw/shared-utilities` and import in both.
3. **Compile with tsgo.** Shared packages build via `tsgo -p tsconfig.build.json`
   (+ `tsc-alias`), like services — not `tsc`/`nest build`.
4. **Adding a NEW `packages/<name>` workspace requires two CI edits per job, in all
   four jobs** of `.github/workflows/ci.yml`: the "Build shared packages" `cd …`
   line AND a `strategy.matrix.include` entry. Skipping either is the documented CI footgun.
5. **Changing a shared package means rebuilding dependents** — a stale service
   container will run old shared code (full stop → rm → rmi → build).

## Prohibited patterns

- Putting a cross-service constant in a service instead of `@claw/shared-constants`.
- Adding `packages/<name>` without the two ci.yml edits × four jobs.
- A per-service copy of something already in a shared package.

## Correct pattern

```yaml
# .github/workflows/ci.yml — Build shared packages (all four jobs)
cd packages/shared-utilities && npx tsgo -p tsconfig.build.json
cd ../<new-package> && npx tsgo -p tsconfig.build.json      # edit #1
# strategy.matrix.include (all four jobs):
- { service: <new-package>, workspace: '@claw/<new-package>', prisma: false }   # edit #2
```

## Enforcement

- **CI job** — the per-package matrix builds/lints/tests each shared package.
- **Knowledge check** — `.ai/manifests/packages.json` lists the canonical set.
- **Review checklist** — the two-edits-per-job rule is verified for new packages.

## Related skills

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)

## Related context

- Root `CLAUDE.md` — "CI Workflow Footgun", "Shared-utilities-first mindset".

## Definition of done

- [ ] Shared code lives in the correct package; no service-local copy remains.
- [ ] New package added to both CI spots in all four jobs.
- [ ] Dependent containers rebuilt after a shared-package change.
