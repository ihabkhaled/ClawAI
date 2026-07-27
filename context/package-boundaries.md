# Package Boundaries

The 6 shared packages under `packages/` carry everything that crosses a service
boundary at compile time. Ground truth: `.ai/manifests/packages.json`,
`workspace-dependency-graph.json`.

## The three-way split rule

> **types → `@claw/shared-types` · values → `@claw/shared-constants` · functions
> → `@claw/shared-utilities`.**

If a type/value/function is used by 2+ services, it belongs in the corresponding
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

| You have…                                              | Put it in…                        |
| ------------------------------------------------------ | --------------------------------- |
| A type/enum used by 2+ services or in an event payload | `shared-types`                    |
| A constant/port/name used by 2+ services               | `shared-constants`                |
| A pure function used by 2+ services                    | `shared-utilities`                |
| An auth guard/decorator                                | `shared-auth`                     |
| Event publish/consume plumbing                         | `shared-rabbitmq`                 |
| A plan/entitlement gate                                | `shared-entitlements`             |
| Something used by only ONE service                     | keep it **local** to that service |

## CI footgun when adding a new package

Adding a `packages/<name>` workspace requires TWO edits per job × 4 jobs in
`.github/workflows/ci.yml`: (1) the "Build shared packages" `tsgo` line, and
(2) the `strategy.matrix.include` entry. Missing the matrix entry means the
package's own lint/typecheck/test never runs in CI. See
[stack-and-toolchain.md](stack-and-toolchain.md).

## Never do

- Reintroduce a per-service `jwt.utility.ts` / `http-client.utility.ts` /
  `crypto.utility.ts` after dedup.
- Add a cross-service type/value/function to a single service instead of the
  right shared package.
- Create a cycle between shared packages.
