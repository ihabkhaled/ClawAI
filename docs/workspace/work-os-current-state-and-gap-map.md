# Workspace / Work OS — Current-State Audit and Gap Map (Pass 1)

**Status: initial pass, not exhaustive.** This is the Phase 01 deliverable required by the
`ClawAI_Workspace_Automation_Prompt_Pack` before any later phase starts. It was produced by
inventorying `apps/claw-workspace-service` (modules, Prisma schema, adapters) directly against
the pack's 16-phase target. It intentionally stops short of a full line-by-line capability audit
(per-provider read/write/webhook matrix, contract-test coverage, frontend route inventory) —
that is real, multi-session work and is called out explicitly below as the next pass, not silently
skipped.

## Why this is "Pass 1" and not the final gap map

The full Phase 01 spec asks for a machine-actionable gap matrix across every provider (read
objects / write actions implemented vs advertised / webhook support / delta sync / auth modes /
known gaps / tests) plus an inventory of frontend routes, RabbitMQ contracts, plan/entitlement
gates, and QA/E2E coverage. Producing that honestly requires reading every adapter file, every
frontend workspace page, and the existing test suite — not a plausible single-session task
alongside the other three sub-projects already shipped today. This document instead establishes
the **structural map** (what subsystems exist, what Prisma models back them, how they map to the
pack's target architecture) so the next session can do the per-provider matrix without
re-discovering the module layout from zero.

## What already exists (confirmed by module + schema inventory)

`apps/claw-workspace-service/src/modules/` contains, among others:

`workspace`, `webhooks`, `chains`, `ai-actions`, `actions`, `auto-suggest`,
`suggestion-factory`, `learning`, `digest`, `inbox`, `ticket-planning`,
`connector-access`, `email-signatures`, `email-templates`

`apps/claw-workspace-service/src/modules/workspace/adapters/` has real adapters for:
Bitbucket, ClickUp, Confluence, Figma, GitHub, GitLab, Gmail, Google Calendar, Google Drive,
Jira, OneDrive, Outlook Calendar, SharePoint, Slack — i.e. **already covers essentially the
pack's entire target provider list** (Jira/Confluence/GitHub/GitLab/Bitbucket/Gmail/Drive/
Slack/ClickUp/Calendar/OneDrive/SharePoint/Figma). Provider _breadth_ is not the gap; provider
_capability depth and manifest truthfulness_ (Phase 02, Phase 13) is unverified in this pass.

`apps/claw-workspace-service/prisma/schema.prisma` already defines, among others:

| Existing model                                                       | Maps to pack concept                                                                                                                                                                                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkspaceChain`, `WorkspaceChainRun`, `WorkspaceChainRunStep`       | The "current sequential chains" Phase 05 explicitly says to evolve into Workflow Engine V2 — **not a greenfield build**, a migration target already named in the pack.                                                             |
| `AiActionPolicy`, `AiActionApprovalQueue`                            | Approval/risk engine groundwork for Phase 06 (Saga/compensation) and Phase 14 (governance).                                                                                                                                        |
| `WebhookDelivery`                                                    | Webhook ingestion groundwork for Phase 04 (needs verification of signature checks, dedupe, DLQ per provider).                                                                                                                      |
| `WorkspaceObjectLink`                                                | Proto knowledge-graph edge model for Phase 10 — schema may already support source/target/relation; confidence/provenance/AI-inferred-vs-explicit fields need verification.                                                         |
| `WorkspaceConnectorGrant`                                            | Proto access-grant model, plausible starting point for Phase 12's `WorkspaceGrant` (personal-connector-only vs org-installation distinction needs verification).                                                                   |
| `WorkspaceProviderDefinition`, `WorkspaceProviderAppConfig`          | Proto capability-registry rows for Phase 02's canonical manifest — whether this is already the single source of truth or one of several drifted lists is exactly the "registry/adapter drift" question Phase 01/02 ask to resolve. |
| `AutoSuggestRun`, `SuggestionDeduplication`, `SuggestionTriggerRule` | Learning/suggestion groundwork for Phase 11.                                                                                                                                                                                       |
| `ImplPromptHandoff`                                                  | Looks like an existing implementation of (or precursor to) the pack's "Ticket → Code → Done" golden recipe (Phase 07 #3).                                                                                                          |
| `DigestSnapshot`, `UserDigestPreference`                             | Existing digest system — candidate input/output for the Phase 08 "Today" and Phase 07 "Daily Work Brief" recipe.                                                                                                                   |

**Bottom line of Pass 1:** this is much closer to "harden, unify, and extend an existing
Work-OS-shaped system" than "build one from scratch," which matches the pack's own framing
("Reuse and extend existing architecture. Do not create parallel duplicate systems... Do not
rebuild working foundations."). The real work is very likely concentrated in:

- **Phase 02** (does one canonical capability manifest exist, or is there drift across
  `WorkspaceProviderDefinition`, adapter code, and frontend action lists?),
- **Phase 03/04** (is there a _canonical_, versioned `WorkspaceEvent` model distinct from
  `WebhookDelivery`, with dedupe/replay/DLQ, or does each adapter still push ad hoc events?),
  **This session's earlier work confirms chat-service's event/stream layer is unrelated to this
  — this is workspace-service's own event pipeline, not to be conflated.**
- **Phase 05/06** (does `WorkspaceChain`/`WorkspaceChainRun` support DAG branching, parallel
  fan-out, per-step retry/compensation, and crash-safe resume, or is it still a fixed
  sequential list?),
- **Phase 10** (does `WorkspaceObjectLink` carry confidence/provenance/inferred-vs-explicit, or
  is it a flat many-to-many table?),
- **Phase 12** (does `WorkspaceConnectorGrant` distinguish org installations from personal
  connectors, with policy inheritance, or is it still purely per-user?).

## Explicitly not yet verified in this pass (next session's starting point)

- Per-provider read/write/webhook/delta-sync capability matrix (the actual Phase 01 deliverable
  table) — requires reading all 14 adapter files against `WorkspaceProviderDefinition` rows.
- Whether `chains`/`ai-actions`/`actions` module boundaries already have the duplication the
  pack warns about ("chain vs workflow overlap... duplicate action enums... duplicate approval
  queues").
- Frontend `/workspace/*` route and hook inventory (Phase 08's redesign target).
- RabbitMQ event contract inventory for workspace-service (`claw.events` topic exchange usage).
- Existing QA/E2E coverage for the modules above.
- Plan/entitlement gates on Workspace features (this session's RBAC work on
  `feat/chat-experience-revamp` covered the 9 chat orchestration labs only — Workspace has its
  own, separate plan-gate surface, unaudited here).

## Recommended execution order for the remaining 15 phases

Given the amount of already-existing infrastructure, phases should be re-ordered slightly from
the pack's default sequence to front-load the work that de-risks everything after it:

1. **Finish Phase 01 properly** — the per-provider capability matrix and duplication scan above,
   as its own gated batch, before touching any code.
2. **Phase 02** (capability manifest) — establishes the single source of truth every later phase
   depends on; cheap relative to its leverage.
3. **Phase 03/04** (event fabric + realtime/reconciliation) — the backbone Workflow Engine V2
   triggers on.
4. **Phase 05/06** (Workflow Engine V2 + Saga/retry) — the highest-risk, highest-value phase;
   depends on 02–04 being real.
5. **Phase 07** (golden recipes) — cheapest to ship once 05/06 exist; delivers visible user value
   early rather than waiting for every later phase.
6. **Phase 08/09** (Work OS UX + NL Automation Studio) — needs 05–07 to have something real to
   surface.
7. **Phase 10/11** (knowledge graph + learning) — can proceed in parallel with 08/09 once the
   event fabric (03) is stable, since both consume the same event stream.
8. **Phase 12** (org installations/RBAC) — should land before Phase 13's provider expansion goes
   to production, so deepened provider actions inherit the right grant model from day one.
9. **Phase 13** (provider capability expansion) — depth work per provider.
10. **Phase 14** (observability/security/governance) — threaded throughout in practice, but the
    dedicated hardening pass belongs here once the surfaces it audits exist.
11. **Phase 15** (test labs/chaos/E2E) — needs 01–14 substantially complete to be meaningful.
12. **Phase 16** (migration/docs/release gate) — final phase, unchanged from the pack's ordering.

Each numbered item above should ship as its own batch: scoped, gated (typecheck/lint/test/build
in the touched workspaces only), committed, and pushed before the next starts — consistent with
this repo's existing "large flagship work ships in batches" rule. At the current pace this is
realistically many further sessions of work, not a single pass.
