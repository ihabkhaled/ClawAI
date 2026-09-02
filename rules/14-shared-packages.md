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
6. **Every service Dockerfile builds every shared package the service declares —
   `Dockerfile` AND `Dockerfile.dev`, in the same commit as the `package.json`
   dependency.** Root `.dockerignore` deliberately copies `packages/*/dist` into
   the image, so a package the Dockerfile forgets to build runs whatever stale
   `dist` the developer's host had. That is invisible until the host dist and
   the compiler disagree: on 2026-09-02 a shared-entitlements dist emitted before
   `tsc-alias -f` existed crashed payment-service under ESM with
   `ERR_MODULE_NOT_FOUND …/dist/entitlements-adapter` (no `.js` extension). Nine
   `Dockerfile.dev` files had the gap; every prod `Dockerfile` had the line, so
   CI and production never showed it. Runbook:
   [add-a-shared-package-to-a-service](../skills/add-a-shared-package-to-a-service.md).

## Prohibited patterns

- Putting a cross-service constant in a service instead of `@claw/shared-constants`.
- Adding `packages/<name>` without the two ci.yml edits × four jobs.
- A per-service copy of something already in a shared package.
- Adding `@claw/shared-<x>` to a service's `package.json` without a
  `RUN cd packages/shared-<x> && npm run build` line in BOTH of that service's
  Dockerfiles.

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
- **Root test** — `tools/__tests__/dockerfile-shared-package-completeness.test.mjs`
  (`npm run knowledge:test`, runs in CI) fails if any `apps/*/Dockerfile` or
  `Dockerfile.dev` omits a `npm run build` line for a `@claw/shared-*` package
  that service declares. Its sibling `shared-package-build-order.test.mjs`
  checks the ORDER of what is built; this one checks the recipe is COMPLETE.

## Related skills

- [09-refactor-toolkit](../skills/09-refactor-toolkit.md)
- [add-a-shared-package-to-a-service](../skills/add-a-shared-package-to-a-service.md)

## Related context

- Root `CLAUDE.md` — "CI Workflow Footgun", "Shared-utilities-first mindset".

## Definition of done

- [ ] Shared code lives in the correct package; no service-local copy remains.
- [ ] New package added to both CI spots in all four jobs.
- [ ] Dependent containers rebuilt after a shared-package change.
- [ ] Every Dockerfile of every service that declares the package builds it
      (`npm run knowledge:test` green).
