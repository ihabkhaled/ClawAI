# ADR: Model Identity, Exposure and Entitlement

- **Status:** Proposed
- **Date:** 2025-01-20
- **Branch:** feat/model-exposure-plan-entitlements

## Context

The platform has four independently authored sources of truth for which models a
tenant may use, and none of them are connected by a shared identity.

`ConnectorModel` is the real synced inventory in `claw-connector-service`. It is
keyed `@@unique([connectorId, modelKey])`, and because `provider` is fixed per
`Connector`, the same `modelKey` under two connectors already produces two distinct
rows. It carries lifecycle, capability booleans, `maxContextTokens`,
`usageTier`, and per-million prices.

`PlanModelAccess` in `claw-auth-service` is the entitlement table. It is keyed
`@@unique([planId, provider, model])` where `provider` and `model` are plain
`String` columns with no foreign-key or catalog relation to `ConnectorModel`.
The write DTO `planModelAccessRowSchema` accepts `provider: z.string().max(64)`
and `model: z.string().max(128)` with no enum and no inventory lookup.
`PlansService.setModelAccess` calls `getPlan` then `replaceModelAccess` with zero
validation, so an admin can persist a model that was never synced.

The runtime chain has no single gate. `EntitlementsService.resolveModelAccessMode`
returns `ALLOW_ALL` for any admin and defaults non-admins to `DENY_ALL`; its
`allowedModels` is a verbatim copy of `PlanModelAccess` rows. In `routing-service`,
`applyPlanModelGate` treats an **empty** `allowedModels` array as _unrestricted_,
filters on `"provider/model"` string keys, promotes an allowed fallback, then
falls back to `unsatisfiable`. In `chat-service`, `AccessControlService.assertModelAllowed`
is the hard backstop via `isModelAllowedForUsage` from `@claw/shared-entitlements`,
while `assertCanUseCritic` and `assertResearchAccess` return early with an explicit
fail-open comment when entitlements are null. Finally,
`GET /connectors/:id/models` has no `@RequirePermissions` while its sibling routes
require `ADMIN_CONNECTORS_MANAGE`.

The net effect: an admin can entitle a model that does not exist, re-sync can
hard-delete rows and silently revoke entitlements, an empty plan is interpreted
as unrestricted, and the frontend has no canonical signal to render against.

## Forces

- **Identity drift:** entitlement strings are not tied to inventory rows, so
  typos and stale keys create phantom entitlements.
- **Silent revocation:** `replaceMany` hard-deletes absent `modelKey` rows on
  every sync, erasing audit history and breaking active plan entitlements.
- **Empty-array ambiguity:** an empty `allowedModels` means _unrestricted_ in the
  router but _no access_ everywhere else, creating a contradictory default.
- **Admin fail-open:** `ALLOW_ALL` for admins bypasses plan and exposure checks
  entirely, making admin usage un-governable.
- **Missing exposure state:** there is no field saying whether a synced model
  is globally exposed to the tenant; capability and visibility are conflated.
- **No single gate:** authorization logic is scattered across routing-service,
  chat-service, and shared-entitlements with no canonical owner.
- **Unprotected inventory route:** `GET /connectors/:id/models` lacks the
  `@RequirePermissions` guard its siblings enforce, leaking the full catalog.
- **Router vs. user separation:** infrastructure-routing models (embeddings,
  rerankers) share the same surface as user-executable chat models with no
  structural separation.

## Decision

1. **Executable identity is the ConnectorModel row, not the (provider, model)
   string pair.** The canonical identity of an executable model is the
   `ConnectorModel` row identified by `connectorId + modelKey`. Entitlement
   **must** target this row, not the free-text `(provider, model)` pair on
   `PlanModelAccess`. `PlanModelAccess` gains a nullable `connectorModelId`
   foreign key; the legacy `(provider, model)` columns are retained only for
   backward-compatible reads during migration and must not be used for new
   authorization decisions.

2. **Global exposure is an explicit `exposure` enum on `ConnectorModel`,
   defaulting to `UNEXPOSED`.** The enum values are `UNEXPOSED`, `EXPOSED`,
   and `DEPRECATED`. A model row created or re-synced defaults to `UNEXPOSED`;
   an admin must consciously promote it to `EXPOSED` before any plan may
   reference it. `DEPRECATED` allows existing entitlements to wind down while
   blocking new entitlements.

3. **Plan entitlement is a relation validated on write.**
   `planModelAccessRowSchema` is replaced with a schema that accepts a
   `connectorModelId` and rejects writes whose target row is not in
   `EXPOSED` state. `PlansService.setModelAccess` must call an inventory
   lookup before `replaceModelAccess`; if the lookup fails or the model is
   not `EXPOSED`, the write is rejected with a 422. Admins can no longer
   persist phantom or unexposed models.

4. **Re-sync soft-deletes instead of hard-deleting.**
   `connector-models.repository.ts replaceMany` must change: rows whose
   `modelKey` is absent from the incoming sync are set to
   `lifecycle = REMOVED` and `exposure = UNEXPOSED`, preserving the row and its
   id for audit and entitlement wind-down. Hard delete is removed entirely.
   Entitlements referencing a `REMOVED` row are treated as denied at the gate.

5. **Precedence is: inventory existence → global exposure → plan entitlement
   → modelAccessMode.** When these disagree, the most restrictive applicable
   state wins. Specifically: if the `ConnectorModel` row is `REMOVED`, deny
   unconditionally; if it is `UNEXPOSED` or `DEPRECATED`, deny new usage; if it
   is `EXPOSED`, consult `modelAccessMode` and `allowedModels`. An admin
   `ALLOW_ALL` bypasses plan checks but **never** bypasses exposure; admins
   cannot use a model the tenant has not exposed.

6. **`ALLOW_ALL` means all exposed models; an empty `allowedModels` array
   means none.** After this change, `ALLOW_ALL` is scoped to models whose
   `ConnectorModel.exposure` is `EXPOSED`, not the entire catalog. An empty
   `allowedModels` array on a non-`ALLOW_ALL` plan means _no access_, matching
   the rest of the system. The routing-service interpretation of empty as
   unrestricted is removed; `applyPlanModelGate` must treat empty as deny.

7. **The single canonical gate is `assertModelAllowed` in `chat-service`,
   and it absorbs the scattered logic.** `isModelAllowedForUsage` in
   `@claw/shared-entitlements`, `applyPlanModelGate` in `routing-service`, and
   the exposure check all resolve into a single call path owned by
   `AccessControlService.assertModelAllowed`. `assertCanUseCritic` and
   `assertResearchAccess` must remove their fail-open early returns; null
   entitlements now deny, not allow.

8. **Router-infrastructure models are partitioned by a `kind` field on
   `ConnectorModel`.** A new `kind` enum (`CHAT`, `EMBEDDING`, `RERANKER`,
   `TOOL`) separates user-executable models from infrastructure models.
   `PlanModelAccess` and the authorization gate consider only `CHAT` for
   user entitlement. Infrastructure kinds are governed by capability flags
   on the connector, not by plan entitlement.

## Invariants

- **Sync alone never grants access.** A newly synced `ConnectorModel` row
  defaults to `UNEXPOSED`; no plan, admin, or runtime path may treat its
  existence as authorization.
- **Global exposure alone never grants plan access.** `EXPOSED` makes a
  model _eligible_ for entitlement; it does not add it to any plan's
  `allowedModels`.
- **A plan allow can never override a globally unexposed model.** If
  `exposure` is not `EXPOSED`, the gate denies regardless of what
  `PlanModelAccess` or `modelAccessMode` says.
- **The frontend never authorizes.** The UI may hide or disable models for
  ergonomics, but every authorization decision is server-side in
  `assertModelAllowed`. Frontend state is never trusted.
- **Entitlement cannot be established means deny.** If the gate cannot
  resolve a `connectorModelId`, or entitlements are null, or the model is
  absent from inventory, the decision is deny. There is no fail-open path.

## Consequences

- `PlanModelAccess` requires a migration to add `connectorModelId` and
  backfill from existing `(provider, model)` pairs where a matching
  `ConnectorModel` row exists.
- `ConnectorModel` requires a migration to add the `exposure` and `kind`
  columns, defaulting all existing rows to `UNEXPOSED` and `CHAT`
  respectively. Tenants must consciously expose their current models.
- `replaceMany` in `connector-models.repository.ts` is rewritten to
  soft-delete; the Prisma `deleteMany` call is removed.
- `applyPlanModelGate` in `routing-service` loses its empty-as-unrestricted
  branch; callers that relied on empty meaning unrestricted must supply an
  explicit `ALLOW_ALL` mode instead.
- `assertCanUseCritic` and `assertResearchAccess` in `chat-service` become
  deny-by-default, which may break existing admin workflows that depended
  on fail-open behavior. Those workflows must be migrated to explicit
  entitlements.
- `GET /connectors/:id/models` gains `@RequirePermissions(ADMIN_CONNECTORS_MANAGE)`,
  reducing the exposed catalog surface to admins.

## Migration and compatibility

1. **Phase 1 — Schema:** Add `exposure`, `kind` to `ConnectorModel`; add
   nullable `connectorModelId` to `PlanModelAccess`. No behavior changes.
2. **Phase 2 — Backfill:** Set existing `ConnectorModel` rows to
   `exposure = EXPOSED` only if they appear in at least one `PlanModelAccess`
   row; set all others to `UNEXPOSED`. Backfill `connectorModelId` where a
   unique `(provider, model)` match exists.
3. **Phase 3 — Gate cutover:** Deploy the unified `assertModelAllowed` with
   exposure and inventory checks. Remove fail-open paths. Remove
   `applyPlanModelGate` empty-as-unrestricted.
4. **Phase 4 — Validation:** Enforce write-time validation in
   `planModelAccessRowSchema` and `PlansService.setModelAccess`. Legacy
   free-text `(provider, model)` writes are rejected.
5. **Phase 5 — Cleanup:** Drop the `provider` and `model` columns from
   `PlanModelAccess` after one release cycle with no fallback reads.

## Rejected alternatives

- **Keep `(provider, model)` strings as the identity and add a validation
  lookup.** Rejected: the lookup is runtime-only and does not survive a sync
  that changes `modelKey`; the string pair is not a stable identity.
- **Add exposure as a boolean flag instead of a tri-state enum.** Rejected:
  `DEPRECATED` is needed to block new entitlements while allowing existing
  ones to wind down; a boolean cannot express that.
- **Move the gate to `routing-service` exclusively.** Rejected: routing-service
  does not have the user context to resolve admin vs. non-admin consistently,
  and chat-service is the last point before model invocation.
- **Hard-delete `PlanModelAccess` rows when a model is removed from sync.**
  Rejected: this erases audit history and makes entitlement churn invisible;
  soft-delete on `ConnectorModel` preserves the trail.
- **Use connector capability flags instead of a `kind` enum.** Rejected:
  capability flags describe what a connector _can do_; they do not partition
  individual model rows within a connector that supports multiple kinds.
- **Treat empty `allowedModels` as unrestricted with an explicit `UNRESTRICTED`
  mode flag.** Rejected: it preserves the ambiguity that caused the bug;
  `ALLOW_ALL` scoped to exposed models already covers the legitimate use case.
