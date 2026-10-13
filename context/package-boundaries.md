# Package Boundaries

The <!-- count:sharedPackages -->6<!-- /count --> shared packages under `packages/` carry everything that crosses a service
boundary at compile time. Ground truth: `.ai/manifests/packages.json`,
`workspace-dependency-graph.json`.

## The three-way split rule

> **types → `@claw/shared-types` · values → `@claw/shared-constants` · functions
> → `@claw/shared-utilities`.**

If a type/value/function is used by two or more services, it belongs in the corresponding
package — never copied per service. If a utility lives identically in 2+
services, that is a bug: move it to `@claw/shared-utilities` and replace the
copies with imports (extend-don't-parallelize).

## The 6 packages

| Package                         | Owns                                                                                                                                       | Internal deps                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| **`@claw/shared-types`**        | TypeScript types, enums, event payloads, the `EventPattern` union, the `Permission` enum                                                   | none (leaf)                    |
| **`@claw/shared-constants`**    | ports (`*_SERVICE_PORT`), exchange name (`claw.events`), API prefix, service-name constants, pagination defaults                           | none (leaf)                    |
| **`@claw/shared-utilities`**    | domain-neutral functions: jwt verify, http-client (retry/backoff), crypto primitives, url-safety, regex/time/encoding helpers              | shared-constants, shared-types |
| **`@claw/shared-auth`**         | AuthGuard, RolesGuard, `@Public`, `@Roles`, `@CurrentUser` decorators                                                                      | shared-types, shared-utilities |
| **`@claw/shared-rabbitmq`**     | RabbitMQModule, RabbitMQService (publish/consume with retry + DLQ), StructuredLogger                                                       | shared-constants, shared-types |
| **`@claw/shared-entitlements`** | plan feature gates (`allowCompareMode`, `allowJudgeMode`, `allowMemory`, …) enforced by chat `AccessControlService` + FE `useFeatureGates` | shared-types                   |

Recent additions to the leaf packages (2026-10-13): `shared-types` gained the `PLUGINS_*` permissions and the owner-only Thread generation
progress, save-proposal and observability page contracts; `shared-constants` gained `PLUGIN_SERVICE` / `PLUGIN_SERVICE_PORT` (4021);
`shared-entitlements` plan payloads carry `allowPlugins` and the `maxInstalledPlugins` / `maxUserMcpServers` limits (`null` = unlimited, `0` = disabled).

Dependency DAG (from the manifest): `shared-types` and `shared-constants` are
leaves; `shared-utilities` and `shared-rabbitmq` → both leaves;
`shared-entitlements` → `shared-types`; `shared-auth` → `shared-types` +
`shared-utilities`. No cycles.

## Who imports what

- **Every service** imports `shared-constants`, `shared-types`,
  `shared-utilities`.
- **All except health** import `shared-rabbitmq`.
- **`shared-entitlements`** is imported by audit, chat, connector, file,
  llamacpp, memory, ollama, research, routing, server-logs, workspace.
- **`shared-auth`** is imported only by agent, payment, research, workspace.
- **`health`** imports `shared-utilities` **only**.

## Decision guide

| You have…                                                       | Put it in…                        |
| --------------------------------------------------------------- | --------------------------------- |
| A type/enum used by two or more services or in an event payload | `shared-types`                    |
| A constant/port/name used by two or more services               | `shared-constants`                |
| A pure function used by two or more services                    | `shared-utilities`                |
| An auth guard/decorator                                         | `shared-auth`                     |
| Event publish/consume plumbing                                  | `shared-rabbitmq`                 |
| A plan/entitlement gate                                         | `shared-entitlements`             |
| Something used by only ONE service                              | keep it **local** to that service |

## Who builds what (Dockerfiles)

A consumer's `Dockerfile` **and** `Dockerfile.dev` must each run
`npm run build` for every `@claw/shared-*` it declares. The image copies the
host's `packages/*/dist` (root `.dockerignore` keeps it deliberately), so an
unlisted package runs stale host output instead of failing to build.

Enforced, not hand-maintained:
`tools/__tests__/dockerfile-shared-package-completeness.test.mjs` derives the
expected set from each `apps/*/package.json` and fails on any Dockerfile that
omits one; `shared-package-build-order.test.mjs` checks the order. Both run
under `npm run knowledge:test`. Runbook:
[add-a-shared-package-to-a-service](../skills/add-a-shared-package-to-a-service.md).

Stale when: a Dockerfile builds shared packages through something other than
`npm run build` (the matcher would then need updating), or `.dockerignore`
stops copying `packages/*/dist`.

## CI when adding a new package

No CI file is hand-edited for a new `packages/<name>` workspace: the affected
matrix and the shared-package build order are derived from the npm workspaces
and each `package.json` (`tools/affected/index.mjs` `ci-matrix` and
`shared-build`). The footgun now is a consumer that uses the package without
declaring it as a dependency — then neither the build order nor the matrix
sees the edge. See [stack-and-toolchain.md](stack-and-toolchain.md#ci).

## Never do

- Reintroduce a per-service `jwt.utility.ts` / `http-client.utility.ts` /
  `crypto.utility.ts` after dedup.
- Add a cross-service type/value/function to a single service instead of the
  right shared package.
- Create a cycle between shared packages.
