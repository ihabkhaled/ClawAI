# ADR-070: Workspace-tier hierarchical priors — scope decision for V6

**Status**: Accepted
**Date**: 2026-08-15
**Deciders**: ClawAI core team
**Slice**: Cloud Smart Router — Batch 11, Learning Evolution V6 ("Tenant/domain/user personalization")

## Context

The source pack's V6 requirement (`07_LEARNING_EVOLUTION_V4_V7_PROMPT.md`):
"Use hierarchical priors: global → domain/task → tenant → user after evidence.
Prevent overfit, cold-start instability, tenant leakage, and preference
overriding hard policy."

`docs/architecture/cloud-smart-router/IMPLEMENTATION_PLAN.md` deviation D8
already flagged the blocking gap: routing-service's schema has **zero**
`userId`/`workspaceId`/`tenantId` columns anywhere, and the plan explicitly
sequenced V6 last, "gated behind a scoping migration + backfill... called out
as its own risk."

Two further facts, checked before writing any code:

1. **ClawAI's tenant boundary is the workspace**, not a separate "tenant"
   concept — `claw-workspace-service` owns a `Workspace` model
   (`apps/claw-workspace-service/prisma/schema.prisma`). Per this repo's
   service-database-boundary rule, routing-service may never join against
   that table; a workspace id here is always an opaque, unvalidated string
   reference.
2. **`RoutingContext` carries no user identity at all**, and this batch is
   scoped to `routing` only (`IMPLEMENTATION_PLAN.md` §6, Batch 11 row) —
   `chat-service`, which is where a real user/workspace id would originate
   and be threaded into the RabbitMQ payload that becomes `RoutingContext`,
   is out of scope for this batch entirely.

## Decision

**Deliver the workspace tier only** (`global → domain/task → workspace`).
Defer the user tier — there is no `userId` concept anywhere in
routing-service to hang it on, and inventing one here would be scope
creep into a cross-service identity decision this batch has no mandate to
make.

**Deliver it as inert, fully-tested capability, not a live behavior
change.** `RoutingContext.workspaceId` and
`RoutingCompletedEventPayload.workspaceId` are both new optional fields that
no current caller populates. Every code path gated on them degrades to
exactly today's behavior — a no-op — for 100% of current production
traffic. Threading a real workspace id from chat-service through the
RabbitMQ payload is explicitly **not** done in this batch: it is
cross-service work outside `routing`'s workspace boundary for Batch 11,
and doing it here would mean shipping an unreviewed contract change to a
sibling service inside a learning-evolution batch. Flagged below as the
concrete follow-up.

**A new table (`RouterWorkspacePrior`), layered on top of
`RouterModelProfile`/`RouterTopicProfile`, never replacing them.** The
global tier (ADR-069) remains the sole thing that runs unconditionally on
every decision. The workspace tier is consulted only when
`context.workspaceId` is present, and only ever adjusts `confidence` on an
already-fully-decided `RoutingDecisionResult` — it has no code path capable
of changing `selectedProvider`/`selectedModel`, because
`RouterWorkspacePriorManager.resolveNudge` is called after (not instead of)
`RouterEducationManager`'s own provider/model override logic
(`shouldOverrideToBestProfile`) has already run.

## How each pack requirement is met

| Requirement                                           | How                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hierarchical priors, global → domain/task → workspace | `calibrateDecision` always computes the global (`RouterModelProfile`) calibration first; the workspace nudge is a strictly secondary, additive adjustment applied last, via `RouterWorkspacePriorManager.resolveNudge`.                                                                                                                                                                  |
| Prevent overfit                                       | `MIN_WORKSPACE_PRIOR_SAMPLE_SIZE` (3) gates the nudge off entirely below that route count, independent of how strong the signal looks; `MAX_WORKSPACE_PRIOR_NUDGE` (0.1) hard-caps the magnitude regardless of sample size or blend weight.                                                                                                                                              |
| Prevent cold-start instability                        | No prior row (`findWorkspacePrior` returns null) → `resolveNudge` returns `{ applied: false }` → the decision is returned completely unmodified, identical to today's behavior.                                                                                                                                                                                                          |
| Prevent tenant leakage                                | `RouterWorkspacePrior` is looked up by the exact composite key `(workspaceId, provider, model, taskFamily)` from `context.workspaceId` — there is no code path that reads a prior for any workspace other than the one on the current request's context (tested explicitly: `router-workspace-prior.manager.spec.ts`, "tenant isolation").                                               |
| Prevent preference overriding hard policy             | The nudge function's return type (`WorkspacePriorNudgeResult`) carries only `{ confidence, applied }` — it is structurally incapable of returning a provider or model, so it cannot override policy even if a future caller mis-wired it. Hard privacy/eligibility filtering (`detectLocalEnforcementDomain`, `CloudRouterEligibilityManager`) runs upstream of all of this, unaffected. |

## Alternatives considered

1. **Add `workspaceId` as a nullable column on `RouterModelProfile` /
   `RouterTopicProfile` directly**, keying rows by
   `(provider, model, taskFamily, topicKey, workspaceId)`. Rejected: it
   would change the existing global tier's unique constraint and every
   current upsert/read against it — real risk to the one learning system
   with production effect, for a tier that is inert until a future batch
   feeds it real data. A separate table costs one migration and one join;
   the alternative costs touching live, working code for no immediate
   behavioral gain.
2. **Fold the workspace-prior logic into `RouterEducationManager`
   directly.** Rejected on the same file-size grounds V4 already applied to
   `replay.manager.ts`: `router-education.manager.ts` was already flagged
   over this repo's file-size guidance by ADR-069's own disclosed
   deviation; adding more to it compounds a problem already noted as
   warranting a future split, rather than deferring it further.
3. **Also thread a real workspace id from chat-service now**, so the
   capability is live rather than inert. Rejected: out of this batch's
   `routing`-only workspace scope (`IMPLEMENTATION_PLAN.md` §6), and a
   cross-service RabbitMQ payload contract change deserves its own
   reviewed batch, not a rider on a learning-evolution slice.

## Consequences

- Zero behavior change for any request in production today — every new
  code path requires `workspaceId`, which nothing sends.
- The full mechanism (schema, repository, manager, both hook points) is
  built and unit-tested end to end, so activating it later is exactly
  "chat-service starts passing a workspace id" — no further routing-service
  design work required.
- **Follow-up, not this batch:** thread a real workspace id from
  chat-service into the RabbitMQ payloads that become `RoutingContext` and
  `RoutingCompletedEventPayload`, as its own reviewed, cross-service change.
- **Follow-up, not this batch:** the user tier (`workspace → user`) needs a
  `userId` concept in routing-service first, which does not exist anywhere
  today — a separate scoping decision, likely alongside whichever batch
  adds the workspace-id threading above.
- V7 (bounded contextual bandit) explicitly requires "Only after V1–V6" per
  the pack. With the user tier of V6 deferred, V7 correctly stays
  not-started — see the Batch 11 summary for that call recorded
  explicitly, not silently skipped.

## Migration

Additive only — no destructive change, no existing table's constraint
touched:

- `routing_outcome_records`: `workspace_id TEXT?` (nullable).
- New table `router_workspace_priors`: `(id, workspace_id, provider, model,
task_family, route_count, success_rate, confidence_in_prior,
score_version, last_updated, created_at)`, unique on
  `(workspace_id, provider, model, task_family)`.

Migration file:
`apps/claw-routing-service/prisma/migrations/20260815193000_add_router_workspace_prior_v6/migration.sql`,
hand-written (no live database in this environment to run
`prisma migrate dev` against, consistent with ADR-069's migration —
applying it to a real database is a deliberate follow-up step, not done
here). `npx prisma generate` was run to refresh the TypeScript client from
the edited schema only — no database touched.

## Validation

`cd apps/claw-routing-service && npm run typecheck && npm run lint && npm test`.
New coverage: `router-workspace-prior.manager.spec.ts` (nudge math: overfit
gate, cold-start fallback, tenant isolation, bounded clamp, never touches
provider/model), plus integration tests added to
`router-education.manager.spec.ts` and `routing-education.repository.spec.ts`.

## Rollback

Of this ADR's code: revert the listed files; the migration is additive so
reverting the application code is safe without a down-migration (the
`router_workspace_priors` table and `workspace_id` column simply go
unread and unwritten — every path that touches them is already gated on
`context.workspaceId`/`payload.workspaceId`, which nothing sets). No
runtime rollback procedure is needed beyond that: since this batch never
went live in production (no caller populates a workspace id), there is no
"bad batch" to roll back the way ADR-069's `rollbackCalibration` addresses
for the global tier.
