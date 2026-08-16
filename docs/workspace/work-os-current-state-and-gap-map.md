# Workspace / Work OS — Current-State Audit and Gap Map (Phase 01–03)

**Status: Phase 01 (per-provider capability matrix), Phase 02 (capability manifest / registry
truth), and a deliberately-scoped-down real slice of Phase 03 (canonical event fabric, webhook
sources only) are done. Phase 01's duplication scan, frontend route inventory, and RabbitMQ
contract inventory are still pending (see "Explicitly not yet verified" below). Phase 03's
non-webhook sources and Phase 04 onward are not started — each remaining phase is independently
a multi-day-to-multi-week feature (durable workflow DAGs, saga/compensation, a knowledge graph,
etc.); they're being built as real, tested, one-phase-per-batch slices rather than attempted all
at once, per explicit instruction.**

Pass 1 (below, preserved) established the structural map. Pass 2 adds the machine-actionable
per-provider matrix the spec actually asks for, built by reading every adapter's
`getCapabilities()`, `executeWriteAction`/write-helper dispatch, `fetchObjectDetails`,
`downloadFileContent`, `getDefaultScopes`, the webhook signature-verifier registry, the frontend
action-label map, and each adapter's test coverage — plus three concrete drift bugs found and
fixed along the way (details in "Drift found — and fixed — during this pass").

## Per-provider capability matrix (Pass 2)

Read/search/live-fetch/download reflect the interface's optional methods
(`fetchObjectDetails` = Live fetch, `downloadFileContent` = Download). Search is uniform across
every provider — `workspace-search.service.ts` queries already-synced `WorkspaceObject` rows
filtered by provider, not a per-provider live API, so it is not a per-adapter capability gap.
"Write actions" lists the actual `actionType` strings each adapter's `executeWriteAction`
dispatches on. "Tests" counts dedicated `__tests__/*.adapter.spec.ts`-style files only (not the
shared `adapter-contract.spec.ts` or `workspace-adapter.factory.spec.ts`, which exercise the
factory wiring, not per-provider behavior).

| Provider         | Read objects                             | Write actions implemented                                                                                                                                        | Webhook: implemented | Webhook: advertised (pre-fix) | Delta sync | Live fetch | Download | Auth modes      | Known gaps                                                                                                            | Dedicated tests     |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- | ---------- | ---------- | -------- | --------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------- |
| GitHub           | REPOSITORY, ISSUE, PULL_REQUEST, COMMENT | CREATE_ISSUE, CREATE_ISSUE_COMMENT, CREATE_PR_DESCRIPTION, COMMENT_PR, APPROVE_PR, ADD_PR_SUGGESTION                                                             | yes                  | yes                           | yes        | yes        | no       | OAuth + PAT     | none found                                                                                                            | 3                   |
| GitLab           | REPOSITORY, ISSUE, PULL_REQUEST          | CREATE_MR_COMMENT, APPROVE_MR, CREATE_GITLAB_ISSUE, COMMENT_GITLAB_ISSUE, UPDATE_MR_DESCRIPTION, ADD_MR_SUGGESTION, ADD_MR_IMAGE_COMMENT                         | yes                  | yes                           | no         | yes        | no       | OAuth + PAT     | no delta sync; **6 of 7 write actions had no frontend label (fixed)**                                                 | 2                   |
| Bitbucket        | REPOSITORY, PULL_REQUEST                 | CREATE_PR_COMMENT_BB, APPROVE_PR_BB, CREATE_BITBUCKET_ISSUE                                                                                                      | yes                  | yes                           | no         | yes        | no       | OAuth (no PKCE) | no delta sync; **all 3 write actions had no frontend label (fixed)**; 0 dedicated tests                               | 0                   |
| Jira             | TICKET, PROJECT, COMMENT                 | CREATE_TICKET, CREATE_JIRA_FROM_FIGMA, **CREATE_USER_STORY_FROM_FIGMA (fixed — was a labeled dead action)**, UPDATE_JIRA_ISSUE, ADD_TICKET_COMMENT, COMMENT_JIRA | yes                  | yes                           | yes        | yes        | no       | OAuth           | see fix below                                                                                                         | 1 (added this pass) |
| Confluence       | DOCUMENT                                 | CREATE_CONFLUENCE, EDIT_CONFLUENCE                                                                                                                               | no                   | false                         | no         | yes        | no       | OAuth           | no webhook, no delta sync; 0 dedicated tests                                                                          | 0                   |
| Slack            | CHANNEL, MESSAGE, USER                   | SEND_SLACK, SEND_SLACK_MESSAGE, REPLY_SLACK                                                                                                                      | yes                  | yes                           | no         | **no**     | no       | OAuth           | no live-fetch, no delta sync; 0 dedicated tests                                                                       | 0                   |
| ClickUp          | TICKET                                   | CREATE_CLICKUP_TASK, UPDATE_CLICKUP_TASK, COMMENT_CLICKUP_TASK                                                                                                   | **no**               | **true (fixed → false)**      | no         | yes        | no       | OAuth           | advertised webhooks it can't accept (fixed); **all 3 write actions had no frontend label (fixed)**; 0 dedicated tests | 0                   |
| Figma            | FILE                                     | POST_FIGMA_COMMENT (CREATE_JIRA_FROM_FIGMA / CREATE_USER_STORY_FROM_FIGMA route to the Jira adapter, not this one)                                               | yes                  | yes                           | no         | yes        | no       | OAuth           | none found beyond the Jira-side fix above                                                                             | 1                   |
| Gmail            | EMAIL                                    | SEND_EMAIL, REPLY_EMAIL, CREATE_DRAFT                                                                                                                            | no                   | false                         | yes        | yes        | no       | OAuth           | **CREATE_DRAFT had no frontend label (fixed)**                                                                        | 2                   |
| Google Drive     | FILE, DOCUMENT                           | UPLOAD_DRIVE, MOVE_DRIVE                                                                                                                                         | no                   | false                         | yes        | yes        | yes      | OAuth           | 0 dedicated tests                                                                                                     | 0                   |
| Google Calendar  | MEETING                                  | **none — read-only, no `supportsWrite`/`executeWriteAction` at all**                                                                                             | no                   | false                         | yes        | yes        | no       | OAuth           | no write path exists for a provider the pack expects meeting automation on; 0 dedicated tests                         | 0                   |
| OneDrive         | FILE                                     | UPLOAD_ONEDRIVE, MOVE_ONEDRIVE                                                                                                                                   | **no**               | **true (fixed → false)**      | yes        | yes        | yes      | OAuth           | advertised webhooks it can't accept (fixed); **both write actions had no frontend label (fixed)**; 0 dedicated tests  | 0                   |
| Outlook Calendar | MEETING                                  | **none — read-only, no `supportsWrite`/`executeWriteAction` at all**                                                                                             | no                   | false                         | no         | yes        | no       | OAuth           | same gap as Google Calendar; also no delta sync; 0 dedicated tests                                                    | 0                   |
| SharePoint       | DOCUMENT                                 | UPLOAD_SHAREPOINT, CREATE_SHAREPOINT_LIST_ITEM, UPDATE_SHAREPOINT_LIST_ITEM                                                                                      | **no**               | **true (fixed → false)**      | no         | yes        | yes      | OAuth           | advertised webhooks it can't accept (fixed); **all 3 write actions had no frontend label (fixed)**; 0 dedicated tests | 0                   |

## Drift found — and fixed — during this pass

1. **Phantom write action `CREATE_USER_STORY_FROM_FIGMA`.** Labeled "Create User Story from
   Figma" in the frontend action picker (`workspace-action.constants.ts`) and present in both the
   backend and frontend `WorkspaceActionType` enums, but no adapter ever dispatched on it — not
   the Figma adapter (which only handles `POST_FIGMA_COMMENT`) and not the Jira adapter (which
   handles the sibling `CREATE_JIRA_FROM_FIGMA` via the exact same generic issue-creation branch
   but never had the story alias added). A user picking this action would always get
   `errorMessage: "unsupported action type"`. **Fixed**: added the alias to the Jira adapter's
   existing `CREATE_TICKET`/`CREATE_JIRA_FROM_FIGMA` branch — it was already payload-driven on
   `issueType`, so the story variant needed no new logic. Added
   `jira-create-ticket.spec.ts` (the adapter had zero prior test coverage).

2. **False webhook advertising — ClickUp, OneDrive, SharePoint.** All three adapters'
   `getCapabilities()` returned `supportsWebhooks: true`, but the receiver
   (`webhook-receiver.controller.ts` → `parseWebhookProvider` → `isWebhookSupported`) only
   recognizes a provider if it has a registered signature verifier in
   `webhook-signature-verifiers.utility.ts`, and only GitHub/GitLab/Bitbucket/Slack/Jira/Figma are
   registered there. Any inbound webhook for these three providers would be rejected with
   `WEBHOOK_PROVIDER_UNSUPPORTED` regardless of the flag. **Fixed**: flipped all three to `false`
   with a comment pointing at the receiver's actual behavior, so the flag stops lying. Note for
   Phase 02: `AdapterCapabilities` (including this flag) is currently **dead metadata** — grepping
   the whole backend and frontend found zero callers of `adapter.getCapabilities()` outside the
   adapters' own test files. There is no consuming capability manifest yet; Phase 02 is what
   would actually make this flag matter.

3. **19 real, backend-implemented write actions had no frontend label — every GitLab, Bitbucket,
   OneDrive, SharePoint, and ClickUp write action, plus Gmail's `CREATE_DRAFT`.** The frontend's
   `WorkspaceActionType` enum (`apps/claw-frontend/src/enums/workspace-action-type.enum.ts`) was a
   stale, partial mirror of the backend enum — it stopped before "Stream 20" (GitLab/Bitbucket)
   and "Stream 21" (OneDrive/SharePoint/ClickUp) were added, and was missing `CREATE_DRAFT`.
   Because `workspace-action-row.tsx` falls back to the raw enum string
   (`WORKSPACE_ACTION_TYPE_LABEL[action.actionType] ?? action.actionType`) rather than throwing,
   this wasn't a crash — it silently showed users machine strings like `CREATE_GITLAB_ISSUE`
   instead of "Create GitLab Issue" in the approval queue for over a third of all implemented
   write actions. **Fixed**: synced the frontend enum to the backend (19 added members) and gave
   every new value a human label in `WORKSPACE_ACTION_TYPE_LABEL`, which TypeScript now enforces
   exhaustively (`Record<WorkspaceActionType, string>`). Added
   `workspace-action.constants.test.ts` asserting no label falls back to its raw key, since the
   compiler alone wouldn't have caught a _wrong_ (as opposed to missing) label.

## Why this is "Pass 2" and not the final gap map

The Phase 01 spec also asks for a duplication scan (chain vs workflow overlap, duplicate action
enums, duplicate approval queues, duplicate search paths, overlapping frontend pages) and a
frontend route / RabbitMQ contract inventory. Those are still open — see "Explicitly not yet
verified" below. This pass fixed what it found rather than only reporting it, per the pack's "the
audit is not the final deliverable" instruction, but a full architectural duplication scan is
its own multi-hour pass and would have diluted the depth of the provider matrix above if rushed
in the same session.

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

## Phase 02 — Capability Manifest & Registry Truth (done)

The registry-vs-adapter drift flagged above was worse than suspected: `PROVIDER_DEFINITION_SEEDS`
(the DB-backed `WorkspaceProviderDefinition` seed data — already structurally close to the pack's
proposed `ProviderCapabilityManifest`) was wrong for **11 of the then-12 registered providers**,
and 2 whole providers (Google Calendar, Outlook Calendar) weren't registered at all — meaning
`ProviderRegistryService.getByProvider(GOOGLE_CALENDAR | OUTLOOK_CALENDAR)` threw
`EntityNotFoundException` for adapters that work end to end. Concretely:
`supportedActions` listed the wrong action types (or none) for GitLab, Jira, ClickUp, Slack, and
GitHub was missing 3 of 6; `capabilities.write` said `false` for Bitbucket, Confluence, Figma,
Google Drive, Gmail, SharePoint, and OneDrive despite all seven having real, working write paths;
`capabilities.webhooks` said `true` for ClickUp/SharePoint/OneDrive despite the receiver rejecting
every delivery for those three (the false-advertising bug fixed in Phase 01).

Fixed: corrected every provider's `supportedActions`/`capabilities` against the real per-provider
matrix above, and added the two missing calendar providers. Reused the existing
`onModuleInit` upsert seeder (`ProviderRegistryService`) and `GET /workspace/providers` /
`GET /workspace/providers/:provider` API (`WorkspaceProviderRegistryController`) rather than
building parallel infrastructure — both already matched the pack's "one canonical contract, derive
the registry API from it" design, they just held wrong data.

Added the contract test the pack's acceptance criteria ask for
(`provider-registry-drift.spec.ts`, 43 assertions): every adapter now exposes
`getSupportedActionTypes(): WorkspaceActionType[]` alongside its existing `supportsWrite()`, and
the test cross-checks it against the registry seed, `supportsWrite()` against
`capabilities.write`, and `capabilities.webhooks` against the webhook receiver's own
`isWebhookSupported()` truth table (not the adapter's self-reported flag, which is exactly what
was wrong before). This test would have failed CI on every one of the bugs above — it now stands
between this class of drift and `main`.

**Not done in this pass**: the frontend already types `supportedActions`/`capabilities` on its
provider-definition model (`workspace-providers.types.ts`) via an existing repository/hook layer,
but no UI actually reads them yet for action selection — the write-action label map fixed in
Phase 01 (`WORKSPACE_ACTION_TYPE_LABEL`) is still a static, hand-maintained mirror, not
capability-API-derived. Wiring the approval-queue / workflow-builder UI to the now-correct
registry API instead is real work that belongs to Phase 08 (Work OS Command Center UX) or 09 (NL
Automation Studio), not duplicated here. Payload JSON-schema validation per action
(`payloadSchema` in the pack's proposed manifest shape) and per-action risk/approval defaults
(`risk`, `defaultApproval`) were also not added — the existing `AiActionPolicy`/approval-queue
system already carries its own risk/approval model, and reconciling the two is Phase 06's
(Saga/compensation) territory, not Phase 02's.

## Phase 03 — Canonical Workspace Event Fabric (webhook-sourced slice, done)

The full Phase 03 spec asks for a 20-field normalized event model, a mapper for ~21 canonical
event types across every provider, and a 7-way downstream fan-out (sync, workflow triggers,
suggestions, knowledge graph, digest, learning, audit) — genuinely multi-week scope. Shipped a
real, honestly-scoped-down slice instead of a stub:

**What exists before this pass, reused rather than duplicated**: `WebhookReceiverManager` already
had signature verification, dedupe-by-`externalDeliveryId`, persistence to `WebhookDelivery`, and
a publish/subscribe fan-out via RabbitMQ (`WORKSPACE_WEBHOOK_RECEIVED`) — one real consumer
already existed (`suggestion-factory/webhook-event.consumer.ts`), operating on raw
provider-specific payloads. What was missing was the _canonical_ layer: nothing normalized a
GitHub `pull_request`/`action=opened` and a GitLab `Merge Request Hook`/`action=open` into the
same `PR_OPENED` vocabulary, so every future consumer would have had to duplicate provider parsing.

**Added**:

- `WorkspaceEvent` Prisma model (migration `20260816220000_add_workspace_event_canonical_fabric`)
  — id, schemaVersion, connectorId, provider, eventType (canonical), resourceType,
  resourceExternalId, occurredAt, receivedAt, correlationId, idempotencyKey, payload, payloadHash,
  sourceDeliveryId, processingStatus. Deliberately excludes organizationId/installationId/
  actorExternalId/causationId (Phase 12's multi-tenant/actor-attribution territory) and
  riskClass/privacyClass (Phase 14's redaction territory) — adding them now without those phases'
  design would mean unused, guessed-at columns.
- `WorkspaceCanonicalEventType` enum (`common/enums/`) — the pack's full 21-value vocabulary,
  defined up front even though only 13 are populated by a real mapper yet, so the vocabulary is
  stable for later phases to extend into rather than each inventing their own.
- `WorkspaceEventMapperService` — real, provider-accurate mappers (not guessed) for GitHub,
  GitLab, Bitbucket, Jira, Slack, and Figma — the 6 providers with a working webhook receiver
  (Phase 01's matrix). Covers PR_OPENED/PR_UPDATED/PR_MERGED/PR_REVIEWED, ISSUE_CREATED/
  ISSUE_UPDATED, TICKET_CREATED/TICKET_STATUS_CHANGED, COMMENT_CREATED, CI_SUCCEEDED/CI_FAILED,
  MESSAGE_RECEIVED/MENTION_RECEIVED. Returns null (drops to raw-only) for anything unmapped rather
  than force-fitting — e.g. GitHub `push`, Figma `LIBRARY_PUBLISH`.
- `WebhookIngestConsumer` — subscribes to the existing `WORKSPACE_WEBHOOK_RECEIVED` event
  alongside the suggestion-factory consumer, maps, dedupes (idempotency key = `deliveryId:
eventType`, unique per provider), persists, and publishes the new `WORKSPACE_EVENT_INGESTED`
  pattern for future consumers to subscribe to instead of re-parsing raw payloads.
- Tests: `workspace-event-mapper.service.spec.ts` (30 cases covering every mapped event type per
  provider plus unmapped-drops-safely cases) and `webhook-ingest.consumer.spec.ts`, which
  explicitly covers the pack's two named test requirements — **duplicate delivery** (same
  WebhookReceivedEvent handled twice creates exactly one WorkspaceEvent and publishes once) and
  **out-of-order delivery** (two distinct deliveries for the same PR processed in reverse
  chronological order both persist correctly, since idempotency is keyed per-delivery not
  per-resource — this is an append-only event log, not a materialized "current state" projection).

**Explicitly not done in this slice** (real scope, not oversight):

- The other 8 canonical event types (EMAIL_RECEIVED/REPLIED, DOCUMENT_CREATED/UPDATED,
  FILE_UPDATED, TASK_CREATED/UPDATED, MEETING_STARTED/ENDED) have no webhook source today —
  Gmail/Drive/Calendar/SharePoint/OneDrive/ClickUp are poll/delta-sync only per Phase 01's matrix.
  Populating these needs either Phase 04 (realtime push/reconciliation) or teaching the existing
  sync pipeline to also emit canonical WorkspaceEvents — a natural next slice, not done here.
- No downstream consumer of `WORKSPACE_EVENT_INGESTED` exists yet — workflow triggers, the
  knowledge graph, digest, and learning modules still don't react to it (they don't react to raw
  webhooks either, today). Wiring them is each later phase's own job (05 for workflow triggers,
  10/11 for graph/learning) — Phase 03's job was the fabric, not its consumers.
- No query/replay REST API for `WorkspaceEvent` (Phase 02 got one for the provider registry
  because its own acceptance criteria demanded it; Phase 03's didn't). Cheap follow-up if needed
  before Phase 05 needs to read the event log.
- The migration was hand-authored, not generated via `prisma migrate dev`, because the shared dev
  Postgres container (`claw-pg-workspace`) is drifted from migration history across several
  concurrently-developed worktrees — resetting a shared container to unblock codegen would destroy
  other in-progress work, so it wasn't done. The migration SQL was written to match Prisma's own
  output conventions (compare against recent hand-verified migrations in the same folder) and the
  Prisma Client was regenerated cleanly from the updated schema, but the migration itself has not
  been applied-and-verified against a live database in this pass.

## Explicitly not yet verified (next session's starting point)

- Whether `chains`/`ai-actions`/`actions` module boundaries already have the duplication the
  pack warns about ("chain vs workflow overlap... duplicate action enums... duplicate approval
  queues").
- Frontend `/workspace/*` route and hook inventory (Phase 08's redesign target).
- RabbitMQ event contract inventory for workspace-service (`claw.events` topic exchange usage).
- Existing QA/E2E coverage for the modules above (the 9-of-14 adapters with zero dedicated test
  files, noted in the matrix, is one concrete piece of this — but chains/ai-actions/digest/inbox
  etc. are unaudited).
- Plan/entitlement gates on Workspace features (this session's RBAC work on
  `feat/chat-experience-revamp` covered the 9 chat orchestration labs only — Workspace has its
  own, separate plan-gate surface, unaudited here).
- Whether Google Calendar / Outlook Calendar being read-only (no write path at all) is intentional
  scope or a genuine gap — the pack's golden recipes (Phase 07) reference meeting automation,
  which would need a write path on at least one calendar provider.

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
