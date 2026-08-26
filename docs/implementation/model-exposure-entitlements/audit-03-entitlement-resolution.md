# Audit 03 - Entitlement Resolution

Source read: apps/claw-auth-service/src/modules/entitlements/services/entitlements.service.ts

## 1. What the entitlement snapshot contains

`EntitlementsService.getForUser` builds it. Model-related fields returned:

- `modelAccessMode` via `resolveModelAccessMode`
- `allowedModels` mapped from `modelAccess` rows
- `allowedProviders` derived as `[...new Set(modelAccess.map((m) => m.provider))]`

Each `allowedModels` entry has: `provider`, `model`, `isAllowed`, `allowAsPrimary`,
`allowAsFallback`, `allowAsJudge`, `allowInCompare`, `dailyTokenLimitOverride`.

## 2. PlanModelAccessMode

`PlanModelAccessMode` is imported from `../../../generated/prisma`. Values used
here: `ALLOW_ALL` and `DENY_ALL` (others UNVERIFIED from this file). `resolveModelAccessMode`
returns `ALLOW_ALL` when `if (isAdmin) { return PlanModelAccessMode.ALLOW_ALL; }`. The inline
comment states ALLOW_ALL uses an empty model list as the unrestricted routing hot path, so
yes, ALLOW_ALL bypasses the per-model allow list.

## 3. Who consumes this

`getForUser` and `getEnforcedForUser` are the public entry points, both returning
`UserEntitlements`. `resolveDailyLimit` returns `{ dailyLimit, isAdmin }` for quota reservation.
The file does not show downstream consumers. UNVERIFIED. Expected caller: a model routing or
authorization guard service that trusts the snapshot to gate model invocation.

## 4. Gap for the exposure design

The snapshot is built purely from `plan.modelAccess` rows (`PlanModelAccess`), whose `provider`
and `model` fields are unvalidated free strings copied verbatim into `allowedModels`. A runtime
authorization gate trusting this snapshot would treat any string a plan admin entered as a
real, routable model identity, with no cross-check that it maps to a deployed provider model.
