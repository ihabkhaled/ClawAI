# Release Evidence — Model Exposure & Plan Entitlements

Every row is something that was run and observed. Anything not measured says so.

## Source

- Feature branch: `feat/model-exposure-plan-entitlements`
- Base: `origin/main` at `75426b6d` (v1.33.0), later merged with `origin/main`
- PR: ihabkhaled/ClawAI#171
- Coding Agent version used: `0.63.3`, then `0.63.4` after the multi-window fix
- Coding Agent repairs: ihabkhaled/ClawAI-Coding-Agent#2 (`0.63.3`, `0.63.4`)
- Paired backend fix: ihabkhaled/ClawAI#175

## Architecture

- ADR: `ADR-model-identity-exposure-entitlement.md`
- Executable identity: `ConnectorModel` row, `connectorId + modelKey`
- Inventory source: `ConnectorModel` in connector-service
- Exposure source: `ConnectorModel.exposure`, default `UNEXPOSED`
- Plan entitlement: `PlanModelAccess` in auth-service, validated over HTTP
- Precedence, as a pure function: `packages/shared-entitlements/src/model-authorization.ts`
- Router-infrastructure separation: `ConnectorModel.kind`; only `CHAT` is user-executable

## Migration

| Item              | Value                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| Migration IDs     | `20260822232000_add_model_exposure_and_kind`, `20260823093000_backfill_existing_model_exposure`   |
| Rehearsed against | `claw-pg-connector`, PostgreSQL 16.13, in a transaction, rolled back                              |
| Rows before       | 160 visible under the old catalogue predicate                                                     |
| Rows after        | 160 visible under the new predicate                                                               |
| Backfilled        | 160 (`ACTIVE` on an enabled connector)                                                            |
| Left `UNEXPOSED`  | 0 (every existing row qualified)                                                                  |
| Fresh install     | no-op, no rows to backfill                                                                        |
| Rerun safe        | Idempotent: a second run updates 0 rows. **Not intent-preserving on a manual replay** — see below |

### Backfill replay — measured, and a correction

Replayed in a transaction against the same database:

```
second run of the backfill              UPDATE 0     (idempotent)
admin unexposes 3 models, replay again  UPDATE 3     (they came back EXPOSED)
rows left UNEXPOSED after replay        0
```

An earlier commit message on this branch claimed the trailing
`exposure = 'UNEXPOSED'` predicate stops the backfill re-exposing anything an
administrator later hides. **That claim is wrong.** An administrator-unexposed
row _is_ `UNEXPOSED`, so it matches the predicate and is re-exposed.

The predicate does make the statement idempotent — running it twice in a row
changes nothing — which is what was actually verified the first time and then
over-claimed. It does not encode administrator intent, because nothing in the
row distinguishes "never exposed" from "deliberately unexposed".

In practice Prisma records the migration in `_prisma_migrations` and runs it
once, so this is a caveat rather than a live defect. It becomes real if the
backfill is ever re-applied by hand after go-live — during a restore rehearsal,
say. Anyone doing that must expect every unexposure to be undone.

A durable fix would need the row to carry why it is unexposed, never-exposed
versus revoked, which the current schema does not model. Recorded rather than
patched over.

## Test evidence

| Suite                       | Command                              | Result                  |
| --------------------------- | ------------------------------------ | ----------------------- |
| auth-service                | `npx jest`                           | 69 suites, 582 passed   |
| chat-service                | `npx jest`                           | 100 suites, 1334 passed |
| connector-service           | `npx jest`                           | 19 suites, 176 passed   |
| routing-service             | `npx jest`                           | 92 suites, 1328 passed  |
| frontend                    | `npm run test`                       | 350 files, 2072 passed  |
| shared-entitlements         | `npx jest`                           | 4 suites, 24 passed     |
| 300-case entitlement matrix | `model-authorization.matrix.spec.ts` | 300/300                 |
| Typecheck                   | per workspace                        | 0 errors                |
| Lint                        | per workspace                        | 0 errors                |
| Build                       | all five workspaces                  | pass                    |

## Security

| Property                          | Evidence                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Forged model refused              | `plans.service.spec.ts` — unknown pair rejected, `replaceModelAccess` never called     |
| One bad row rejects the batch     | same suite — named in the error, nothing written                                       |
| Unexposed model cannot execute    | `access-control.service.spec.ts` — `MODEL_NOT_EXPOSED`, administrators included        |
| Fail-closed on outage             | client returns `false` when connector-service cannot answer; failures uncached         |
| Empty allow-list denies           | `plan-model-gate.utility.spec.ts` — `unsatisfiable` unless `ALLOW_ALL`                 |
| No inventory probe without a plan | `NO_ACTIVE_PLAN` outranks every deployment fact; all 60 no-plan rows return one reason |
| Admin route protected             | `GET /connectors/:id/models` requires `ADMIN_CONNECTORS_MANAGE`                        |
| Enumeration bounded               | validate-exposed capped at 200 pairs; exposure mutation capped at 200 keys             |

## Not measured

Stated rather than implied:

- **Playwright browser burn-in** — not run. No browser journey evidence.
- **Chaos suite** — not run. No injected 429/500, partial pagination, mid-request connector disable, or Redis-down evidence.
- **Performance at 100 / 500 / 1000 models** — not measured. No catalogue or authorization p50/p95 figures.
- **AUTO exposure-awareness** — the execution chokepoint refuses unexposed models, but the router's candidate set is not itself exposure-filtered.
- **`authorizeModel` is not yet the production path** — it encodes and proves the precedence; the live checks remain the Prisma where-clause and `isModelAllowedForUsage`.
- **Admin exposure route** — hook and table exist and are typed; the `/admin` page composing them is not wired.
- **Plan-mutation audit** — a service log, not a structured audit action.

## Decision

**CONDITIONAL.** The data-durability and plan-validation work is complete and
evidenced. The runtime enforcement is real on every execution path that reaches
`dispatchProvider`, which includes AUTO, fallback, escalation, consensus and
compare. What is missing before this should be called a finished security
release is the browser, chaos and performance evidence, and moving the live
checks onto `authorizeModel` so the proven precedence is the one that runs.
