# Audit 04 - Existing Runtime Gates

Sources read: apps/claw-routing-service/src/modules/routing/utilities/plan-model-gate.utility.ts, apps/claw-chat-service/src/modules/chat-messages/services/access-control.service.ts

## 1. plan-model-gate.utility.ts

Exports `applyPlanModelGate` (`plan-model-gate.utility.ts:10`). Takes `decision: RoutingDecisionResult` and `allowedModels: string[]`. Decision order: (1) if `allowedModels.length === 0` return `outcome: 'unrestricted'` — no provider/model check. (2) Build a Set of `"provider/model"` and filter the fallback chain. (3) If the primary is allowed, return `outcome: 'allowed'` with filtered chain. (4) If primary forbidden, promote the first allowed fallback to primary, `outcome: 'promoted'`. (5) If none allowed, `outcome: 'unsatisfiable'`. It considers only `"provider/model"` membership; it has no `modelAccessMode` field and no separate provider-vs-model distinction. Decisive lines: `if (allowedModels.length === 0) { return { decision, outcome: 'unrestricted' }; }` and `const isAllowed = (provider: string, model: string): boolean => allowed.has(`${provider}/${model}`);`. When ALLOW_ALL (empty array) is set it returns the decision unchanged as `unrestricted`.

## 2. access-control.service.ts

`AccessControlService` gates chat sends: model-in-plan, plan feature, RBAC permission, and daily token quota (`access-control.service.ts:30` `assertCanSendMessage`). A chat request reaches `assertCanSendMessage(userId, opts)`. Entitlement data comes from `EntitlementsAdapter.getEntitlements` via `AUTH_SERVICE_URL` (`access-control.service.ts:154` `resolve`). It does NOT allow by default when data is missing: `resolve` rethrows as `ENTITLEMENTS_UNAVAILABLE` / 503. However `assertCanUseCritic` and `assertResearchAccess` fail-open on a null entitlements result. The hard model gate is `assertModelAllowed` using `isModelAllowedForUsage(ent, provider, model, ModelUsageType.PRIMARY)`.

## 3. What already exists that must be reused

- `isModelAllowedForUsage` from `@claw/shared-entitlements`, used in `assertModelAllowed` — the plan-row membership test a canonical gate should build on.
- `applyPlanModelGate` in `plan-model-gate.utility.ts` — the existing fallback-promotion logic for AUTO-mode routing.
- `hasPlanFeature` / `hasPermission` from `@claw/shared-entitlements`, used by `assertFeatureEnabled` / `assertPermissionGranted` — feature + RBAC gating to reuse.

## 4. What is missing

- Neither file verifies a model exists in real connector inventory. `applyPlanModelGate` matches against `allowedModels` plan rows only; `assertModelAllowed` checks `isModelAllowedForUsage` plan rows only. Both trust the plan rows and do not consult connector catalog.
- No `modelAccessMode` (ALLOW_ALL / ALLOW_LISTED / DENY) handling exists in `applyPlanModelGate`; it only special-cases the empty-array ALLOW_ALL path.
- No single canonical authorization gate: chat-service and routing-service each implement model checks independently, risking divergence.
