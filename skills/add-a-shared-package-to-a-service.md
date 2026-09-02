---
name: add-a-shared-package-to-a-service
summary: Wire a @claw/shared-* dependency into a service so the container actually builds it — package.json, Dockerfile, Dockerfile.dev, CI, then the full rebuild cycle — and know the stale-host-dist crash it prevents.
task_keywords:
  [
    shared package,
    add dependency,
    Dockerfile,
    Dockerfile.dev,
    ERR_MODULE_NOT_FOUND,
    stale dist,
    shared-entitlements,
    npm run build,
    rebuild service,
    tsc-alias,
  ]
applies_to: [all-services, docker, monorepo-root]
required_rules: [14-shared-packages, 05-infra-rules]
required_context: [package-boundaries, service-dependency-map, stack-and-toolchain]
affected_workspaces: [the service gaining the dependency]
required_tests:
  [
    tools/__tests__/dockerfile-shared-package-completeness.test.mjs,
    tools/__tests__/shared-package-build-order.test.mjs,
  ]
required_docs: [docs/08-runtime-devops/docker-guide.md, docs/08-runtime-devops/build-system.md]
validation_lane: npm run knowledge:test
---

# Skill: Add a Shared Package to a Service

The runbook for [rule 14 §6](../rules/14-shared-packages.md). A service that
declares `@claw/shared-<x>` in `package.json` but whose Dockerfile never builds
it does not fail to build. It runs the developer's stale host `dist` instead,
and fails only when that dist and the current compiler disagree.

## When to use

- You are adding `@claw/shared-<x>` to any `apps/<service>/package.json`.
- You are creating a new `packages/shared-<x>` (do this skill for every consumer).
- A dev container dies at boot with
  `ERR_MODULE_NOT_FOUND …/packages/shared-<x>/dist/<file>` and the path has no
  `.js` extension, while prod and CI are green.

## When NOT to use

- Changing the _contents_ of a shared package with no new consumer: that is
  the rebuild-dependents procedure in
  [06-docker-toolkit](06-docker-toolkit.md), not this.
- Adding a plain npm dependency. Only `@claw/shared-*` workspaces are copied
  into the image as prebuilt `dist`.

## Why the failure is silent

Root `.dockerignore` excludes `apps/**/dist` but keeps `packages/*/dist` on
purpose (`@claw/*` resolution). The dev Dockerfiles then rebuild a hand-listed
subset of packages. Anything not in that list is whatever the host had: on
2026-09-02 that was a shared-entitlements `dist` emitted before `tsc-alias -f`
existed, with extensionless relative imports that ESM refuses. Nine
`Dockerfile.dev` files had the gap; every prod `Dockerfile` had the line, so
nothing upstream ever showed it. Rebuilding the image without fixing the
Dockerfile copies the same stale dist again.

## Steps

1. **Declare it** in `apps/<service>/package.json` under `dependencies`.
2. **Build it in BOTH Dockerfiles**, after the packages it depends on
   (`shared-entitlements` needs `shared-types` and `shared-constants` first):

   ```dockerfile
   # apps/<service>/Dockerfile.dev
   RUN cd packages/shared-auth && npm run build
   RUN cd packages/shared-<x> && npm run build

   # apps/<service>/Dockerfile (prod, single RUN chain)
    && cd /app/packages/shared-auth && npm run build \
    && cd /app/packages/shared-<x> && npm run build
   ```

3. **New package only:** add it to the "Build shared packages" step and the
   matrix in all four `.github/workflows/ci.yml` jobs (rule 14 §4).
4. **Prove it** without touching Docker:

   ```bash
   npm run knowledge:test
   ```

   `dockerfile-shared-package-completeness` fails naming the Dockerfile and the
   package; `shared-package-build-order` fails if the line is in the wrong
   place.

5. **Rebuild the service from scratch.** `service:rebuild` alone is enough once
   the Dockerfile is right, because the build step now overwrites the copied
   dist; if the container was already running stale code, do the full cycle:

   ```bash
   docker stop claw-<service> && docker rm -f claw-<service> && docker rmi claw-<service>
   ./scripts/claw.sh service:rebuild <service>
   docker logs --tail 20 claw-<service>     # expect "Nest application successfully started"
   ```

6. **Ship the Dockerfile lines in the same commit** as the `package.json`
   change. The test runs in CI on every push.

## Definition of done

- [ ] `package.json` declares the package.
- [ ] `Dockerfile` and `Dockerfile.dev` both build it, in dependency order.
- [ ] `npm run knowledge:test` green (both Dockerfile tests).
- [ ] The container boots and logs `Nest application successfully started`.
- [ ] New package only: four CI jobs updated.

## Related

- [rule 14 — Shared Packages](../rules/14-shared-packages.md)
- [rule 05 — Infra](../rules/05-infra-rules.md) "After updating a shared package"
- [docker-guide.md](../docs/08-runtime-devops/docker-guide.md) troubleshooting entry
- [build-system.md](../docs/08-runtime-devops/build-system.md) gotchas table
- [context/package-boundaries.md](../context/package-boundaries.md)
