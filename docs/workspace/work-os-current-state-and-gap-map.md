# Workspace / Work OS — Current-State Audit and Gap Map (Phase 01–15)

**Status: Phase 01 (per-provider capability matrix), Phase 02 (capability manifest / registry
truth), Phase 03 (canonical event fabric, webhook sources), Phase 04 (sync→event reconciliation
bridge), Phase 05 (crash recovery + resume-from-failed-step), Phase 06 (error taxonomy +
manual-repair tracking), Phase 07 (mechanical chain template library), Phase 08 (Automations
page — first frontend for the chain system), Phase 09 (NL → chain draft, human reviews and
saves), Phase 10 (wiring the dormant object-link graph end to end), Phase 11 (feeding
learned preferences back into AI-action generation), Phase 12 (peer connector-sharing
completeness — "org RBAC" was never buildable, see that phase's own section), and Phase 13
(ClickUp adapter test coverage + a real sync fault-isolation fix it found), Phase 14 (Slack
webhook replay-window fix — a real, confirmed security gap), and Phase 15 (chaos-style test
coverage for the previously-untested webhook receiver) are done as real,
deliberately-scoped slices — see each phase's own section below for exactly what's in and out of
scope. Phase 01's duplication scan and RabbitMQ contract inventory are still pending (see
"Explicitly not yet verified" below). Push-subscription lifecycle management (Phase 04's full
spec), the real DAG rewrite (Phase 05's full spec), compensating/verification steps (Phase 06's
full spec), the AI-step/auto-trigger recipe layer (Phase 07's full spec), auto-triggering off
events (Phase 09's full spec), an LLM-backed preference classifier and the memory-service
write-path fix (Phase 11's full spec — see Phase 11's own section for why these were deliberately
left for memory-service's own team), true org-level RBAC (Phase 12's full spec — needs auth-service
schema/claims work that doesn't exist yet, see that phase's own section), the other 8 of 9
zero-dedicated-test adapters plus every unverified delta-sync/webhook gap in the Pass-2 matrix
(Phase 13's full spec — see that phase's own section for why only one provider was tackled),
Bitbucket/Jira's un-hardened webhook stubs and a durable connector-grant-revocation audit trail
(Phase 14's full spec — see that phase's own section for why only the Slack fix was tackled), a
full routing-style fault-injection "lab" and CI-wired E2E workspace flows (Phase 15's full spec —
see that phase's own section for why only one manager's chaos-style test coverage was tackled), and
Phase 16 onward are not started — each remaining phase is independently a multi-day-to-multi-week
feature (deeper provider coverage, etc.); they're being built as
real, tested, one-phase-per-batch slices rather than attempted all at once, per explicit
instruction — and every category of change that would touch live write-action execution or a live
OAuth app is being deliberately scoped down to safety-net hardening rather than rushed into a full
rewrite, per explicit instruction after each was flagged.**

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

| Provider         | Read objects                             | Write actions implemented                                                                                                                                        | Webhook: implemented | Webhook: advertised (pre-fix) | Delta sync | Live fetch | Download | Auth modes      | Known gaps                                                                                                                                                                                            | Dedicated tests     |
| ---------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------- | ---------- | ---------- | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| GitHub           | REPOSITORY, ISSUE, PULL_REQUEST, COMMENT | CREATE_ISSUE, CREATE_ISSUE_COMMENT, CREATE_PR_DESCRIPTION, COMMENT_PR, APPROVE_PR, ADD_PR_SUGGESTION                                                             | yes                  | yes                           | yes        | yes        | no       | OAuth + PAT     | none found                                                                                                                                                                                            | 3                   |
| GitLab           | REPOSITORY, ISSUE, PULL_REQUEST          | CREATE_MR_COMMENT, APPROVE_MR, CREATE_GITLAB_ISSUE, COMMENT_GITLAB_ISSUE, UPDATE_MR_DESCRIPTION, ADD_MR_SUGGESTION, ADD_MR_IMAGE_COMMENT                         | yes                  | yes                           | no         | yes        | no       | OAuth + PAT     | no delta sync; **6 of 7 write actions had no frontend label (fixed)**                                                                                                                                 | 2                   |
| Bitbucket        | REPOSITORY, PULL_REQUEST                 | CREATE_PR_COMMENT_BB, APPROVE_PR_BB, CREATE_BITBUCKET_ISSUE                                                                                                      | yes                  | yes                           | no         | yes        | no       | OAuth (no PKCE) | no delta sync; **all 3 write actions had no frontend label (fixed)**; 0 dedicated tests                                                                                                               | 0                   |
| Jira             | TICKET, PROJECT, COMMENT                 | CREATE_TICKET, CREATE_JIRA_FROM_FIGMA, **CREATE_USER_STORY_FROM_FIGMA (fixed — was a labeled dead action)**, UPDATE_JIRA_ISSUE, ADD_TICKET_COMMENT, COMMENT_JIRA | yes                  | yes                           | yes        | yes        | no       | OAuth           | see fix below                                                                                                                                                                                         | 1 (added this pass) |
| Confluence       | DOCUMENT                                 | CREATE_CONFLUENCE, EDIT_CONFLUENCE                                                                                                                               | no                   | false                         | no         | yes        | no       | OAuth           | no webhook, no delta sync; 0 dedicated tests                                                                                                                                                          | 0                   |
| Slack            | CHANNEL, MESSAGE, USER                   | SEND_SLACK, SEND_SLACK_MESSAGE, REPLY_SLACK                                                                                                                      | yes                  | yes                           | no         | **no**     | no       | OAuth           | no live-fetch, no delta sync; 0 dedicated tests                                                                                                                                                       | 0                   |
| ClickUp          | TICKET                                   | CREATE_CLICKUP_TASK, UPDATE_CLICKUP_TASK, COMMENT_CLICKUP_TASK                                                                                                   | **no**               | **true (fixed → false)**      | no         | yes        | no       | OAuth           | advertised webhooks it can't accept (fixed); **all 3 write actions had no frontend label (fixed)**; **sync aborted entirely on one malformed task — fixed in Phase 13, see that phase's own section** | 26 (Phase 13)       |
| Figma            | FILE                                     | POST_FIGMA_COMMENT (CREATE_JIRA_FROM_FIGMA / CREATE_USER_STORY_FROM_FIGMA route to the Jira adapter, not this one)                                               | yes                  | yes                           | no         | yes        | no       | OAuth           | none found beyond the Jira-side fix above                                                                                                                                                             | 1                   |
| Gmail            | EMAIL                                    | SEND_EMAIL, REPLY_EMAIL, CREATE_DRAFT                                                                                                                            | no                   | false                         | yes        | yes        | no       | OAuth           | **CREATE_DRAFT had no frontend label (fixed)**                                                                                                                                                        | 2                   |
| Google Drive     | FILE, DOCUMENT                           | UPLOAD_DRIVE, MOVE_DRIVE                                                                                                                                         | no                   | false                         | yes        | yes        | yes      | OAuth           | 0 dedicated tests                                                                                                                                                                                     | 0                   |
| Google Calendar  | MEETING                                  | **none — read-only, no `supportsWrite`/`executeWriteAction` at all**                                                                                             | no                   | false                         | yes        | yes        | no       | OAuth           | no write path exists for a provider the pack expects meeting automation on; 0 dedicated tests                                                                                                         | 0                   |
| OneDrive         | FILE                                     | UPLOAD_ONEDRIVE, MOVE_ONEDRIVE                                                                                                                                   | **no**               | **true (fixed → false)**      | yes        | yes        | yes      | OAuth           | advertised webhooks it can't accept (fixed); **both write actions had no frontend label (fixed)**; 0 dedicated tests                                                                                  | 0                   |
| Outlook Calendar | MEETING                                  | **none — read-only, no `supportsWrite`/`executeWriteAction` at all**                                                                                             | no                   | false                         | no         | yes        | no       | OAuth           | same gap as Google Calendar; also no delta sync; 0 dedicated tests                                                                                                                                    | 0                   |
| SharePoint       | DOCUMENT                                 | UPLOAD_SHAREPOINT, CREATE_SHAREPOINT_LIST_ITEM, UPDATE_SHAREPOINT_LIST_ITEM                                                                                      | **no**               | **true (fixed → false)**      | no         | yes        | yes      | OAuth           | advertised webhooks it can't accept (fixed); **all 3 write actions had no frontend label (fixed)**; 0 dedicated tests                                                                                 | 0                   |

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

## Phase 04 — Real-Time Events + Delta Reconciliation (reconciliation-only slice, done)

The full Phase 04 spec asks for provider-native push-subscription lifecycle management (create,
persist external subscription id, renewal/expiration, validation challenge, revoke, auto-repair,
telemetry) for Gmail watch, Google Drive change notifications, and Microsoft Graph change
notifications — a materially different, larger category of work than Phases 01–03 (new OAuth-app
subscription APIs per provider, renewal cron jobs, webhook-shaped validation-challenge endpoints)
and was not attempted in this pass; it's the natural next Phase 04 slice, not silently dropped.

**What this slice does instead**, matching the "Consistency path" arm of the pack's own
architecture diagram (`delta/history/change sync → reconcile normalized objects/events`): the 6
webhook-covered providers already have their fast path (Phase 03); the other 8
(Confluence/Google Drive/Gmail/Google Calendar/Outlook Calendar/ClickUp/SharePoint/OneDrive)
only had periodic delta-sync with **no bridge into the canonical WorkspaceEvent fabric at all** —
exactly the gap Phase 03's docs flagged as follow-up work.

**Added**: `WorkspaceSyncEventBridgeService`, called from `WorkspaceSyncManager.upsertIfSucceeded`
(the existing periodic-sync hot path — `WorkspaceSyncSchedulerManager` already ran sync
unconditionally for every connector, webhook-covered or not; this just adds a second effect
after the existing object upsert). Maps synced `WorkspaceObjectType` → canonical event type
(DOCUMENT→DOCUMENT_CREATED/UPDATED, FILE/SPREADSHEET→FILE_UPDATED, EMAIL→EMAIL_RECEIVED,
TICKET→TASK_CREATED/UPDATED for ClickUp specifically, COMMENT→COMMENT_CREATED) using a
`createdAt === updatedAt` heuristic for "just created upstream" — data every adapter already
reports, not a guess. **Gated on `!isWebhookSupported(provider)`** so it structurally cannot fire
for the 6 webhook-covered providers and duplicate what `WebhookIngestConsumer` already created —
directly satisfying the pack's "Do not duplicate WorkspaceEvents after reconciliation"
requirement. Idempotency key includes the object's own `externalUpdatedAt`, so re-syncing an
_unchanged_ object on the next poll tick (which happens on every cadence interval, forever) does
not spam a duplicate event — verified by a dedicated test.

**Explicitly not done in this slice**:

- No push-subscription lifecycle (the actual bulk of Phase 04's spec) — Gmail/Drive/Calendar/
  SharePoint/OneDrive/ClickUp remain poll-only, just as before. This slice makes their _existing_
  poll data flow into the event fabric; it doesn't make them faster or event-driven.
- `WorkspaceCanonicalEventType.MEETING_STARTED`/`MEETING_ENDED` remain unmapped — deliberately:
  they're time-relative lifecycle events a sync tick can't honestly detect (syncing a future
  calendar entry must not emit MEETING_STARTED). Needs a scheduled, time-aware trigger, not a
  sync-completion hook — a different mechanism than this slice builds.
- Of the pack's other named failure cases (same webhook delivered 5×, webhook before first sync,
  webhook after object deleted, provider outage, expired token, expired subscription, stale
  cursor, rate limit, network timeout, RabbitMQ unavailable, crash after persist before publish):
  Phase 03's tests already cover repeated/duplicate delivery and out-of-order delivery;
  `OrphanSyncRecoveryManager` (pre-existing) already covers "process crashes mid-sync"; rate
  limiting, network timeouts, and provider outages already have retry/backoff in
  `WorkspaceSyncManager.runWithRetry` (pre-existing, unaudited in this pass for correctness). The
  remaining cases (webhook before first sync, webhook after object deleted, crash between
  WorkspaceEvent persist and publish specifically) are real, undemonstrated gaps — no outbox
  pattern exists yet for the persist-then-publish step in either `WebhookIngestConsumer` or
  `WorkspaceSyncEventBridgeService`, so a crash in that exact window would silently lose one
  event. Worth a dedicated hardening pass, not fixed here.

## Phase 05 — Workflow Engine V2 (safety-net slice on the existing sequential executor, done)

The full Phase 05 spec asks for a genuine durable DAG engine — 19 node types (TRIGGER, BRANCH,
PARALLEL, JOIN, FOREACH, COMPENSATE, HUMAN_INPUT, etc.), crash-safe resume, max fan-out,
cancellation, workflow version pinning, dry-run simulation. That's a rearchitecture of how
`ChainExecutorManager` executes real external side-effecting write actions (creating tickets,
sending emails, posting Slack messages) — a materially higher-risk category of change than
Phases 01–04, all of which touched read paths or added a new, additive event-logging fabric. Per
explicit instruction, this pass deliberately did **not** attempt the full DAG rewrite; it added
two concrete, real durability improvements to the _existing_ sequential executor instead, using
the same reasoning `OrphanSyncRecoveryManager` already established for sync runs.

**Added**:

- `ChainOrphanRunRecoveryManager` — sweeps `WorkspaceChainRun` rows stuck at `status=RUNNING`
  past a timeout and marks them `FAILED`. Necessary because `ChainExecutorManager.run()` executes
  an entire chain synchronously within one process/request with no separate worker heartbeat — a
  process crash mid-chain previously left the run row stuck `RUNNING` forever, blocking any
  future recovery. Verbatim mirror of the pre-existing `OrphanSyncRecoveryManager` pattern
  (same cron/age-threshold shape, same `WORKSPACE_SCHEDULER_ENABLED` gate — no new config surface).
- `ChainExecutorManager.resume(userId, chainId, runId)` — real "replay from failed step," one of
  the pack's explicitly named Durability Requirements. Resumes a `FAILED` run by replaying only
  from its first non-`SUCCEEDED` step; already-`SUCCEEDED` steps are **never re-executed** — their
  stored `output` is reused directly. This is what makes it safe without needing per-provider
  idempotency keys: none of GitHub/GitLab/Jira/Slack/etc.'s write endpoints actually support an
  idempotency key, so blindly retrying a `CREATE_ISSUE`-shaped step that already succeeded (but,
  say, timed out on the response) would create a real duplicate ticket. Skipping already-succeeded
  steps sidesteps that risk entirely instead of adding an idempotency field with no real
  provider-side enforcement — exactly the kind of unenforced-metadata drift Phase 01/02 found and
  fixed elsewhere in this codebase. Uses the run's `dslSnapshot`, not the chain's possibly-since-
  edited live `dsl`, so a resume always continues the exact definition that was actually running.
- `POST /workspace/chains/:id/runs/:runId/resume` — new endpoint exposing it; no frontend chain UI
  exists yet at all (chains are currently API-only — the whole `/workspace/chains` UI is Phase 08's
  territory), so there was nothing to wire a "Resume" button into in this pass.
- 10 new tests, including the core safety proof: resuming a run with one already-succeeded step
  calls `executeWriteAction` exactly once (for the failed step only), and the reused output from
  the succeeded step correctly flows into the resumed step's resolved payload.

**Explicitly not done in this slice** (real scope, not oversight): no DAG structure (still a flat
sequential list — no BRANCH/PARALLEL/JOIN/FOREACH), no automatic retry of the write-action call
itself (see the idempotency reasoning above — only a _manual_, explicit resume exists, keeping a
human in the loop for the risky part, consistent with the pack's own "keep human approval
mandatory for high-risk/destructive actions" rule), no per-step timeout, no cancellation, no
dry-run/simulation, no cost/token usage tracking for AI steps (there are no AI steps — every
existing chain step is a direct provider write action), no version pinning beyond the pre-existing
`dslSnapshot`. The genuine DAG rewrite — the actual bulk of Phase 05 — remains the real next step,
and should get its own dedicated, carefully-tested pass given what it touches.

## Phase 06 — Saga, Retry, Compensation, Recovery (error taxonomy + repair tracking slice, done)

The full Phase 06 spec asks for compensating steps, verification steps, retry budgets with
retry-after support, dead-letter workflow state, and an idempotency-record/provider-fingerprint
store for safe duplicate detection. Several of the pack's own "Add" list items were, on
inspection, **already satisfied by Phase 05**: "manual repair/resume" is
`ChainExecutorManager.resume()`; "stuck-run sweeper" / "orphaned-step recovery" is
`ChainOrphanRunRecoveryManager`; "do not duplicate [an already-succeeded write] on retry" is
resume's already-succeeded-steps-are-never-re-executed design. This pass adds the two remaining
items that are safely buildable without a new automatic-write capability:

**Added**:

- `WorkspaceChainStepErrorClass` (`TRANSIENT` / `AUTH` / `RATE_LIMIT` / `VALIDATION` /
  `PERMISSION` / `CONFLICT` / `PERMANENT`) — the exact 7-way taxonomy the pack's "Add" list names.
  `classifyChainStepError()` reuses the same message-pattern-matching _approach_
  `WorkspaceSyncManager.classifyError` already established for sync runs (pattern reused, not
  logic duplicated — sync's own 5-way `WorkspaceSyncErrorClass` is a narrower taxonomy for a
  narrower failure surface and was left as-is). Every step failure path in `executeStep` now
  classifies and persists `errorClass` alongside the existing `error` message. This is what lets a
  human deciding whether to call `resume()` tell a worth-retrying failure (`TRANSIENT`,
  `RATE_LIMIT`) from one that won't fix itself on retry (`AUTH` needs reconnecting,
  `VALIDATION`/`PERMISSION` need the chain definition or grant fixed, `PERMANENT` never will).
- `WorkspaceChainRun.wasResumed` — set `true` the moment `resume()` is called, satisfying the
  pack's "Manually repaired" state from its run-inspector list: a completed run can now be told
  apart from one that needed a human to intervene.
- Both fields flow through to the existing `ChainRunView`/`ChainStepRunView` API response (no
  frontend chain UI exists yet — Phase 08's territory — so the API response is the only surface
  to expose them on in this pass).
- 12 new tests: classifier coverage for all 7 categories plus case-insensitivity, real
  end-to-end proof that a `429` adapter error persists `errorClass: 'RATE_LIMIT'` on the step row,
  and that `resume()` sets `wasResumed: true` before the resumed step even runs.

**Explicitly not done in this slice** (real scope, not oversight): **compensating steps** — the
pack's own worked example ("Drive upload succeeded → Jira failed → delete the uploaded file if
reversible") is a genuinely new capability: automatically executing _more_ write actions when a
run fails. That increases the exact risk surface Phase 05 was scoped to avoid — a bug in
compensation logic could itself cause an incorrect or duplicate external write — so it needs its
own dedicated, carefully-tested pass with an explicit reversibility/policy model, not to be
bolted on here. Also not done: **verification steps** (confirming a write actually landed
correctly, independent of the adapter's own success response), **retry budgets / retry-after
support** (still no automatic retry of the write-action call itself — unchanged from Phase 05's
reasoning), **dead-letter workflow state** (still just `FAILED`; no separate DLQ-style terminal
state or dedicated repair queue/inbox), and an **idempotency-record / provider-action-fingerprint
store** for safe duplicate detection beyond "don't re-run an already-succeeded step" (a
same-payload-detected-independently-of-run-history dedup layer, which none of these provider APIs
support natively and would need real design work to build safely on ClawAI's side).

## Phase 07 — Golden Automation Templates / Recipe Library (mechanical template library, done)

All 10 of the pack's named recipes ("Inbox → Work," "Ticket → Code → Done," "Daily Work Brief,"
etc.) require capabilities that don't exist in this codebase yet: AI classification/summarization/
extraction steps (the chain DSL only supports direct provider write actions — no AI_CLASSIFY/
AI_SUMMARIZE/AI_EXTRACT node types, since Phase 05 was deliberately scoped down from the full DAG
engine those need) and automatic triggering from a `WorkspaceEvent` (nothing currently subscribes
to `WORKSPACE_EVENT_INGESTED` to auto-run a chain — chains are still manual-`POST /run` only).
Shipping fake versions of these 10 recipes would mean either lying about what the "automation"
does or leaving AI/trigger steps as unenforced no-ops — exactly the kind of stub completion the
pack itself prohibits. This pass ships the real, honest, immediately-useful thing that already
exists underneath them: **a template library of purely mechanical, multi-provider write-action
sequences**, reusing 100% of the existing (now safety-netted) chain infrastructure.

**Added**:

- `WorkspaceChainTemplate` — a seeded catalog (mirrors the `PROVIDER_DEFINITION_SEEDS` /
  `ProviderRegistryService` upsert-on-boot pattern from Phase 02) of parameterized chain DSLs.
  Each step's `connectorId` holds a `$PROVIDER:<WorkspaceProvider>` placeholder instead of a real
  connector id.
- `ChainTemplateService.instantiate(userId, key, { name, connectorSelections })` — resolves each
  placeholder to the caller's own connector for that provider (validating ownership, provider
  match, and that it's actually authenticated), then calls the existing `ChainService.create()`
  to persist a real `WorkspaceChain`. Once instantiated, the chain is completely ordinary — it
  runs through the same executor and gets the exact same Phase 05 crash-recovery/resume and
  Phase 06 error-classification behavior with no new code, because it _is_ the same chain
  machinery, just pre-filled.
- `GET /workspace/chain-templates` (catalog) and `POST /workspace/chain-templates/:key/instantiate`
  (create-from-template). No frontend chain UI exists yet (Phase 08's territory), so the API
  response is the only surface in this pass.
- 3 seeded templates — the purely-mechanical sub-slices of 3 of the pack's named recipes with the
  AI/trigger layers removed: **"File a ticket and announce it"** (Jira → Slack, from "Inbox →
  Work"), **"File a GitHub issue and announce it"** (GitHub → Slack, from the "PR → Release"
  family), and **"Cross-workspace task kickoff"** (Jira → GitHub → Slack, three providers, from
  "Ticket → Code → Done" minus the coding-agent/PR/CI/merge steps). Each still needs its payload
  fields (project key, summary, channel id, etc. — left blank in the template) filled in via the
  existing `PATCH /workspace/chains/:id` before it's runnable; instantiation wires the connectors,
  not the content.
- 16 new tests: seed-sanity (every template's `requiredProviders` exactly matches the providers
  its own `dslTemplate` actually references — catching future template/registry drift the same
  way Phase 02's contract test catches provider/adapter drift — plus that every resolved template
  would pass the existing chain-creation Zod schema), and instantiate() coverage including
  rejecting a connector owned by another user, a provider mismatch, and an unauthenticated
  connector.

**Explicitly not done in this slice** (real scope, not oversight): none of the 10 recipes' AI
steps or automatic event-triggering — see above. No "fill in the payload fields for me" UX
(instantiation only wires connectors; content stays a manual edit via the existing PATCH
endpoint — there's no frontend to build a guided form into anyway). No simulation/dry-run preview
(the pack's own "simulation preview" requirement — chains have no dry-run mode at all yet, template
or otherwise). Only 3 of the pack's 10 recipes have a mechanical sub-slice template; the other 7
("Daily Work Brief," "Waiting/SLA Watcher," "Stale Work Sweeper," "Engineering Manager Brief") are
fundamentally aggregation/analysis reports, not write-action sequences — the chain DSL's model
(a linear sequence of provider writes) doesn't fit them at all, AI steps or not; they'd need a
different execution shape entirely, which is out of scope for "extend the existing chain system."

## Phase 08 — Automations Page (first frontend for the chain system, done)

The full Phase 08 spec asks for a redesigned Work OS UX across all of `/workspace/*` — a unified
inbox/dashboard, cross-provider search, a knowledge-graph view, and a dedicated automations
surface. Chains (Phase 05/06/07) had **zero** frontend before this slice — the entire feature was
API-only. This slice ships the one piece of that redesign the chain system actually needed to
become usable: a single `/workspace/automations` page. The unified inbox/dashboard,
cross-provider search, and knowledge-graph view are unrelated surfaces and were not attempted.

**What shipped:**

- `GET /workspace/automations` page (`apps/claw-frontend/src/app/(portal)/workspace/automations/page.tsx`)
  with two sections — **Templates** (the Phase 07 catalog, one card per template with its required
  providers and a "Use this template" action) and **My Automations** (the user's own chains, each
  row showing enabled/disabled, step count, last-run status, and Run / View Runs actions).
- Repository (`chain.repository.ts`), query hooks (`useChainTemplates`, `useChains`,
  `useChainRuns`), and mutation hooks (`useInstantiateChainTemplate`, `useRunChain`,
  `useResumeChainRun`) following the exact TanStack Query + repository conventions already used by
  every other Workspace module — no new patterns introduced.
- `InstantiateTemplateDialog` — a name field plus one connector picker per template-required
  provider, sourced from the user's own connectors via the existing `useWorkspaceConnectors` hook;
  disabled until every required slot is filled, surfacing the same "no connector of this type"
  guidance the template's own validation (Phase 07) enforces server-side.
- `ChainRunHistoryDialog` — lists a chain's run history with status badges, the "manually
  repaired" hint from Phase 06's `wasResumed` flag, and a Resume action wired to
  `ChainExecutorManager.resume()` (Phase 05) for any run left in `FAILED` status.
- Sidebar nav entry (`nav.workspaceAutomations`) and `ROUTES.WORKSPACE_AUTOMATIONS` route
  constant, registered the same way every other Workspace page is; no new route-permission entry
  needed since `/workspace/*` already falls under the general `WORKSPACE_VIEW` gate in
  `route-permissions.constants.ts`.
- New `WorkspaceChainRunStatus` enum and `WORKSPACE_CHAIN_RUN_STATUS_VARIANT` constant (status →
  badge variant), extracted per the repo's declaration-ownership rule instead of an inline map —
  the same pattern `WorkspaceActionStatus`/`WORKSPACE_ACTION_STATUS_VARIANT` already use.
- `workspaceChains` i18n block (28 leaf keys) added to `i18n.types.ts` and all 13 locale files
  with real, hand-written translations (not machine copies) — verified by direct browser
  inspection (see below), not just typecheck, since `t()` is not type-safe against the dictionary.
- 61 new tests: repository (7), hook (16 across queries/mutations/the page-composing hook), and
  component tests (21 across the four new components) — none of Phase 08's shipped code existed
  before this slice, so this is full net-new coverage, not incremental.
- Manual browser verification: logged in against the real dev-stack backend, navigated to
  `/workspace/automations`, and confirmed the page renders its full portal chrome, every
  `t()` call resolves to real translated text (not a raw key — the specific risk the repo's own
  docs flag), and the loading/error states render correctly when the templates/chains queries
  fail. Full login-gated interactive UAT (submitting the instantiate form, running a chain,
  resuming a failed run) was blocked by an unrelated environment limitation — the isolated worktree
  build has no nginx in front of it, and Next's `rewrites()` proxy-to-external-host workaround used
  for the equivalent check on `feat/chat-experience-revamp` did not forward requests in this
  worktree's standalone build (confirmed independently that the real backend responds correctly to
  the same login call over curl). This is a local verification-harness gap, not a defect in the
  shipped code; the automated gates (typecheck, lint, all 1905 frontend tests, production build)
  are the actual acceptance signal here.

**Explicitly not done in this slice** (real scope, not oversight): no unified cross-workspace
inbox/dashboard, no cross-provider search UI, no knowledge-graph view — those are separate,
unrelated Phase 08-spec surfaces. No dry-run/simulation preview in the instantiate dialog (chains
still have no dry-run mode at all — unchanged from Phase 07). No inline chain editor (editing a
chain's DSL — e.g. filling in the payload fields Phase 07 leaves blank — still requires the raw
`PATCH /workspace/chains/:id` API; there is no form for it). No chain creation from scratch
(only template-based instantiation has a UI; building an arbitrary chain DSL by hand has no
frontend). No step-level run detail (the run history dialog shows run-level status only, not each
step's `ChainStepRunView` output/error — the API already returns it, just not rendered).

## Phase 09 — NL Automation Studio (NL → chain draft, human reviews and saves, done)

The full Phase 09 spec asks for a natural-language studio that turns "when I get a new Jira
ticket assigned to me, post it to #eng-updates on Slack" into a running automation, including the
trigger half of that sentence. Two things this slice needed didn't exist and were investigated
honestly before scoping down (see the investigation this phase started from): chat-service has no
schema-constrained/JSON-mode generation (only prompt-and-hope), and nothing in this repo connects
`WorkspaceEvent` (Phase 03's event fabric) to chain execution — chains are still 100% manually
triggered. This slice ships the part that's genuinely real given those two constraints: **NL →
chain draft, human reviews the draft and clicks Save/Run** — the same "smart template generator,
not an autonomous agent" honesty Phase 07 established for its own AI-shaped scope-down.

**What shipped:**

- `POST /workspace/chains/draft-from-nl` (`chain.controller.ts`) — takes `{ prompt }`, returns an
  **unpersisted** `{ dsl }` draft. Never saves, never runs anything.
- `ChainNlDraftManager` — loads the caller's own authenticated connectors, resolves a default
  model via the existing `ModelCatalogResolverManager` (the same "safety net" cloud/local chain
  every other AI action in this repo uses), and calls the existing
  `callCloudGenerate`/`callOllamaGenerate` utilities from the `ai-actions` module — no new
  LLM-calling mechanism, no new cross-service call pattern. The model is told the caller's _real_
  connectorIds and the exact write actions available for each one
  (`CHAIN_ACTION_CATALOG`, a new per-provider action whitelist derived from every adapter's actual
  `executeWriteAction` dispatch); it can't reference a connector or action that doesn't exist.
- Since chat-service has no structured-output mode, the response is prompt-engineered JSON,
  parsed and validated against the **existing** `chainDslSchema` (the same schema `POST
/workspace/chains` already enforces) plus a check that every step's `connectorId` is one the
  caller actually owns. On a validation failure, one retry on the same model with the Zod error
  appended to the prompt; after exhausting the model's fallback chain too, a clean
  `CHAIN_NL_DRAFT_FAILED` error rather than a fabricated chain. A model is explicitly allowed to
  respond `{"steps":[]}` when nothing in the request maps to an available connector/action —
  treated as a valid "no match" result, not a validation failure.
- Frontend: a "Describe an automation" button on `/workspace/automations` opens `NlDraftDialog` —
  a prompt textarea, a read-only preview of the drafted steps (actionType + connectorId, the same
  level of detail Phase 07's instantiated templates show before payload fields are filled in), a
  name field, and Save. Save calls the **existing, previously frontend-unused** `POST
/workspace/chains` create endpoint via a new `useCreateChain` hook — this also closes the "no
  chain creation from scratch" gap Phase 08 flagged as not-yet-built, since the generic create
  endpoint already existed server-side and just needed a caller.
- 45 new tests: `CHAIN_ACTION_CATALOG` sanity (every action type is real, every provider has an
  entry, the Figma-composite Jira actions are deliberately excluded), the prompt-builder utility,
  `ChainNlDraftManager` (happy path, markdown-fence stripping, the empty-steps "no match" path,
  retry-with-Zod-error-then-succeed, hallucinated-connector rejection, exhausted-attempts failure,
  no-connectors / no-authenticated-connectors / no-default-model guards, falling through to a
  fallback model), the repository/hook/component layers on the frontend.
- Manual UI verification for this phase relied on the same automated-gates acceptance signal
  documented for Phase 08 (typecheck, lint, full test suite, production build) rather than another
  live-login browser pass — Phase 08 already spent significant effort establishing that the
  isolated worktree's live-browser check needs infrastructure (an nginx proxy or equivalent) this
  worktree doesn't have, and re-running that same investigation for this phase would not have
  surfaced anything the unit/hook/component coverage here doesn't already exercise directly
  (prompt building, schema validation, retry logic, and every dialog state are all covered without
  needing a live backend).

**Explicitly not done in this slice** (real scope, not oversight): **no auto-triggering.** "When I
get a new ticket" is still not a thing this system can act on — there is no consumer that connects
`WorkspaceEvent` to chain execution, and building one for real (subscription model, dedup,
backoff, an actual scheduler) is its own multi-day slice, exactly as flagged in Phase 07's and
Phase 08's own "explicitly not done" sections. When a request describes a trigger condition, the
model is instructed to still produce the write-action step(s) it implies and say nothing about the
trigger — the frontend does not currently surface any "triggers aren't supported yet" messaging
beyond that omission, which is a gap worth closing in a later UX pass. No guarantee the drafted
JSON is schema-valid on the first (or even the retried) attempt — chat-service has no
structured-output mode; this is a real, disclosed limitation, not a bug, and is why the retry +
clean-failure path exists instead of a "just trust the model" approach. No payload-field
authoring help (the draft's `payload` is whatever the model guessed, same manual-review-before-run
expectation as Phase 07's templates — there's no field-by-field editor). No reuse of the
`ai-actions` approval-queue infrastructure — its schema is single-action-shaped, not
chain-shaped, and extending it would have been undisclosed scope growth (see the investigation
this phase started from for the full reasoning).

## Phase 10 — Knowledge Graph (wiring the dormant object-link graph end to end, done)

The full Phase 10 spec (per the doc's own Pass-2 open question at the top of this file) asked
whether `WorkspaceObjectLink` — the proto knowledge-graph edge model — actually works, or is a
flat, unused table. Investigation found the honest, concrete answer: **the write path existed but
was never called in production, the resolution logic didn't exist at all, and the read path
existed on the backend but nothing on the frontend ever rendered it.** `WorkspaceObjectManager
.detectAndCreateLinks()` (regex-based reference extraction — Jira keys, GitHub PR/issue URLs,
Slack channel mentions) was fully implemented and unit-tested, but its only caller anywhere in the
codebase was its own spec file — dead code. `WorkspaceObjectLink.targetObjectId` was never once
set outside of tests, because nothing resolved a link's `externalRef` against the objects that
actually exist. `GET /workspace/objects/:id` already returned `sourceLinks`, but the frontend's
`WorkspaceObject` type didn't declare the field and the detail page never rendered it. This slice
is the mechanical "actually turn on the plumbing that was already 80% built" pass, not a new
system — the same honesty as every other phase in this doc, just applied to code instead of spec.

**What shipped:**

- `WorkspaceObjectManager.upsertBatch()` now returns `{ synced, objects }` instead of a bare count,
  and `WorkspaceSyncManager.upsertIfSucceeded()` calls `detectAndCreateLinks(objects)` on every
  sync batch — link extraction runs in production for the first time.
- New `WorkspaceObjectManager.resolveLinksForObjects()` — the resolution half that never existed:
  when an object syncs, any earlier-created unresolved link whose `externalRef` matches this
  object's `url` (GitHub PR/issue references — both store the full `html_url`) or, for Jira
  objects, matches `metadata.issueKey` (Jira references store the bare key, e.g. `PROJ-123`, not a
  URL — the two providers needed different match rules and that's now explicit and tested
  separately) gets its `targetObjectId` filled in. Only ever touches `targetObjectId: null` rows,
  so an already-resolved link is never repointed. Both extraction and resolution are wrapped in
  `.catch()` at the call site — a failure here must never fail the sync itself, matching the
  existing `syncEventBridge` best-effort pattern right next to it.
- `GET /workspace/objects/:id` now includes `targetLinks` alongside the existing `sourceLinks` —
  incoming references from other objects, not just outgoing ones this object made.
- Frontend: the object detail page (`/workspace/objects/[objectId]`) renders a "Related items"
  section for the first time — resolved links become a clickable link to the referenced object
  (`sourceLinks` → the link's `targetObjectId`; `targetLinks` → the link's `sourceObjectId`, since
  for an incoming reference the _target_ is already this object), unresolved outgoing links show
  their raw `externalRef` as plain text, and every row shows its extraction confidence. Also fixed
  a real pre-existing type bug found while touching this code: the frontend's
  `WorkspaceObjectLink.targetObjectId` was typed as non-nullable `string`, when the backend has
  always allowed `null` for an unresolved link.
- 12 new backend tests (5 for `resolveLinksForObjects`'s per-provider matching rules, plus the
  `upsertBatch`/`WorkspaceSyncManager` wiring assertions updated to cover the new
  detect-then-resolve call sequence) and 7 new frontend component tests for the "Related items"
  rendering (resolved vs. unresolved, outgoing vs. incoming, both together, confidence display).

**Explicitly not done in this slice** (real scope, not oversight): no semantic/embedding-based
relationships — that's a distinct, **already-shipped** feature (Stream 30's
`workspace-semantic-search.service.ts`, cosine similarity via memory-service's pgvector column),
not something this phase needed to add or that "knowledge graph" should be conflated with. No new
link-extraction patterns beyond the four that already existed (Jira keys, GitHub PR/issue URLs,
Slack channel mentions) — extending the regex set to more providers is a cheap, obvious follow-up
but out of scope for "wire up what's there." No graph traversal/visualization UI — the detail page
lists direct (one-hop) relationships only, not a graph view. No `PARENT_CHILD`/`URL_REFERENCE`
link-type extraction — both enum values exist in `WorkspaceObjectLinkType` but nothing produces
them; only the four regex-backed types are actually created. No "learning" — per this doc's own
table (line ~132), the AI-preference-classifier groundwork is explicitly **Phase 11**, a separate,
already-shipped-but-narrow-scope feature (`PreferenceClassifierManager`, heuristic v1, writes
preference text to memory-service — see its own module for what it does today), not something this
phase touched or extended.

## Phase 11 — Learning (feeding learned preferences back into AI-action generation, done)

Investigation for this phase corrected an assumption carried over from Phase 10's own writeup
(quoted above): the "learning" pipeline is **not** simply write-only-and-forgotten the way
`WorkspaceObjectLink` was. `GET /internal/memories/learned-preferences` already existed on
memory-service, already had a workspace-service proxy
(`GET /workspace/automation-preferences/learned`), and already had a frontend panel rendering it
(`LearnedPreferencesPanel`) — none of that needed building. The two real gaps were: (1) nothing
ever read the learned preferences back into an actual AI generation call, and (2) a genuine
data-integrity bug on the **memory-service** side of the write path (`upsertAutomationPreference`
persists every learned preference as `source: USER_MANUAL` instead of `AUTOMATION_LEARNING`, and
drops `confidence`/`evidence` entirely, so every row lands with the schema-default `confidence:
1.0` — indistinguishable from a hand-entered memory).

**This phase deliberately did not touch memory-service**, per explicit scope instruction to stay
within the workspace flagship (`claw-workspace-service` + its frontend). The data-integrity bug
above is real and disclosed, but fixing it means editing `claw-memory-service`'s
`memory-internal.controller.ts` and `memory.service.ts` — out of bounds for this slice. Bullet-list
preference injection was built anyway, using whatever `confidence` value memory-service currently
returns (always 1.0 today, so "top-N" degrades to "first N returned" until the upstream bug is
fixed) — an honestly-disclosed limitation, not a blocker, since the injected preferences are still
real, real user-derived content even without meaningful ranking yet.

**What shipped (all within `claw-workspace-service` + `claw-frontend`):**

- `AutomationPreferenceService.fetchLearned(userId, actionKind?, limit?)` — the memory-service
  fetch logic that used to live inline in `AutomationPreferenceController.getLearned` is now a
  reusable service method (better layering, and the actual point: `AiActionExecutionManager` can
  now call the exact same thing). Best-effort: any fetch failure (timeout, memory-service down)
  returns `[]` rather than throwing, logged as a warning — this is enhancement, never a new failure
  mode for AI-action generation.
- `AiActionExecutionManager.run()` now accepts an optional `userId` on `RunAiActionInput`, fetches
  that user's top-`LEARNED_PREFERENCES_PROMPT_LIMIT` (5) learned preferences for the request's
  `actionKind`, and passes them to `buildAiActionPrompt()`, which appends them as a bulleted "Known
  preferences for this user" block onto the system prompt when non-empty. `userId` threads through
  from the one real call site — `POST /workspace/ai-actions/run?execute=immediate` — since that's
  the only path that already had `AuthenticatedUser` in scope; `digest`/`auto-suggest`/
  `suggestion-factory`/`ticket-planning`, which produce AI drafts through their own code paths (not
  through `AiActionExecutionManager`), are unaffected by this phase — extending injection to them
  would mean auditing four more call sites, out of scope for "wire this one path."
- Frontend: `LearnedPreferencesPanel` gained a per-item Dismiss button, reusing the **already
  existing** `PATCH /memories/:id/toggle` endpoint via the **already existing**
  `memoryRepository.toggleMemory()` (a learned preference is a `Memory` row under the hood, so
  "dismiss" is just flipping its existing `isEnabled` flag) — a new `useDismissLearnedPreference`
  hook wraps it with the correct query-key invalidation (`useToggleMemory`'s own hook invalidates a
  different, generic memory list, not the learned-preferences one). Zero new backend endpoints on
  either service.
- 27 new tests: `buildAiActionPrompt`'s preference-injection behavior (5), `AiActionExecutionManager
.run()` — first-time coverage for this previously-untested manager, covering the happy path,
  preference fetch/injection, fallback-chain traversal, and exhausted-attempts failure (5),
  `AutomationPreferenceService.fetchLearned` — also first-time coverage (4), plus frontend hook and
  `LearnedPreferencesPanel` component tests (13) including the new dismiss button's per-item
  pending state.

**Explicitly not done in this slice** (real scope, not oversight): **no memory-service changes** —
the `source`/`confidence`/`evidence` write-path bug described above is real, disclosed, and left
for memory-service's own scope, per the explicit "workspace flagship only" instruction this phase
started from. No LLM-backed classifier (`PreferenceClassifierManager` stays heuristic v1 — its own
code comment already says the LLM version is planned separately; this phase didn't touch the
classifier at all). No preference injection for `digest`/`auto-suggest`/`suggestion-factory`/
`ticket-planning` — only the direct `AiActionExecutionManager.run()` path. No true "top-N by
confidence" ranking — mechanically wired, but not meaningful until the confidence value flowing
from memory-service is real (blocked on the same disclosed upstream bug). No UI to preview which
preferences would be injected before a run — Dismiss is the only new user-facing preference
control.

## Phase 12 — Org Installations/RBAC → Peer Connector-Sharing Completeness (done)

This phase answers the open question this doc has carried since its Pass-2 matrix (line ~130):
_"does `WorkspaceConnectorGrant` carry confidence/provenance/inferred-vs-explicit, or is it a flat
many-to-many table?"_ — with a bigger finding than the question anticipated. `WorkspaceConnectorGrant`
is flat per-user (`connectorId`, `userId`, `grantedBy`, `accessLevel` — no org/team/tenant field of
any kind), **and** `claw-auth-service` has zero organization/tenant concept anywhere in its schema,
and `AuthenticatedUser` (`packages/shared-types`) carries no `organizationId`. "Org installations"
is not a real, buildable feature today — it would require new auth-service schema, membership
tables, and token/claims changes, none of which exist and none of which are in scope for the
workspace-flagship-only constraint this phase (and Phases 08-11) operated under. Rather than fake
an unenforceable `organizationId` column with no source of truth, this phase is honestly reframed
as what `WorkspaceConnectorGrant` actually is: **peer connector-sharing** — one user granting
another specific user access to a connector they personally own.

Within that honest scope, the actual gap — matching Phase 08/10's exact "backend built, never
wired" shape at a smaller scale — was real: `ConnectorGrantRepository.listForUser(userId)`
(grants where the caller is the _grantee_, i.e. "connectors shared with me") existed and was
covered by no test, no controller, and no frontend, called from nowhere in the entire codebase.
The owner-side experience (`ConnectorGrantsCard` — list/grant/revoke grants on a connector you
own) has existed since 2026-05-13, well before this phase sequence began; only the grantee-side
"what's been shared with me" view was missing.

**What shipped:**

- `ConnectorAccessService.listSharedWithMe(userId)` — joins the caller's grant rows to their
  connectors via a new `WorkspaceConnectorRepository.findManyByIds()` batch lookup (one query, not
  N), returning only what a grantee should see (name, provider, owner id, access level, granted-by,
  granted-at) — never `encryptedTokens`/`scopes`/other owner-only fields. A grant whose connector
  was since deleted is silently skipped rather than surfaced as a broken row.
- `GET /workspace/connectors/shared-with-me` — a new, separate controller
  (`ConnectorGrantInboxController`) rather than a new method on the existing
  `ConnectorGrantController`, because that controller's base path already carries a `:connectorId`
  segment; this endpoint spans every connector the caller has a grant on, not one specific
  connector.
- Frontend: a new "Shared with me" section on the main `/workspace` hub page, below the caller's
  own connector grid — one card per shared connector with provider/access-level badges and a link
  through to the connector detail page, reusing the existing `connectorGrants.levelReadOnly/
levelAiActions/levelFull` i18n keys the owner-side card already established rather than
  duplicating them.
- 12 new tests: `ConnectorAccessService.listSharedWithMe` (empty-list short-circuit, the
  grant-to-connector join, skipping a grant for a deleted connector), plus frontend
  repository/hook/component tests for the new endpoint and section — all first-time coverage for
  code that had none.

**Explicitly not done in this slice** (real scope, not oversight): **no org/tenant model** — this
is the phase's central, disclosed finding, not an omission; building one means auth-service schema
work (an `Organization` model, membership, updated JWT claims) that is out of bounds for a
workspace-flagship-only phase and is a real, separate, future cross-service initiative. No policy
inheritance, no org-level grant defaults, no bulk/org-wide connector installation — none of these
have anywhere to attach without an org concept existing first. No change to the existing
owner-only `MANAGE_GRANTS` restriction (a `FULL`-level grantee still cannot re-share a connector
to someone else) — treated as an intentional policy decision, not re-litigated here.

## Phase 13 — Provider Capability Expansion (ClickUp test coverage + a real fault-isolation fix, done)

The full Phase 13 spec asks for depth work across every provider in the Pass-2 matrix above —
delta sync for GitLab/Bitbucket/Outlook Calendar, a Confluence webhook, dedicated tests for the
9 of 14 adapters that have zero, and more. That's not one phase; it's a whole track. This slice
picks the single smallest, most honestly-verifiable gap and closes it for real, rather than
touching a dozen providers shallowly: **ClickUp had zero dedicated tests, and writing them found
a genuine, live sync-reliability bug.**

Two other candidates were investigated and explicitly ruled out before settling on ClickUp:
Bitbucket/GitLab's "no delta sync" gap and Confluence's "no webhook" gap both require verifying
external API shapes (query-filter params, Atlassian's webhook registration model) that cannot be
confirmed from this repo's code alone — recommending an implementation without that verification
would mean guessing at an API contract, which is exactly the kind of unverified assumption this
project's phases have consistently refused to ship. Both remain open, correctly-scoped work for a
future phase with access to the actual provider API docs.

**What shipped:**

- **The bug**: `ClickUpAdapter.syncObjects()` walked teams → spaces → lists → tasks, but task
  mapping (`mapTaskToSynced`, called via `.map()` in the team/space/list loop) happened _outside_
  `safeListTasks`'s try/catch — the only "unsafe" step in an otherwise fully `safe*`-wrapped
  hierarchy. A single malformed task (e.g. one missing the `status` field the type declares as
  always-present but the live API doesn't structurally guarantee) threw an uncaught `TypeError`
  that aborted the _entire_ multi-team sync, discarding every task already collected from every
  other list — not just the bad one. Every sibling adapter with an equivalent hierarchy (GitHub's
  `safeFetchIssues`) does its item-to-`SyncedObject` mapping _inside_ the same try/catch as the
  fetch, so a failure is scoped to one fetch unit (one repo's issues, here one list's tasks), never
  the whole sync. ClickUp was the one exception to an otherwise-consistent codebase pattern.
- **The fix**: `safeListTasks` now maps tasks to `SyncedObject`s inside its own try/catch and
  returns `SyncedObject[]` directly (mirroring `safeFetchIssues`'s shape exactly), so a malformed
  task costs at most that one list's tasks — every other list, space, and team in progress still
  syncs successfully. No behavior change for the healthy path; this is a pure resilience fix.
- 26 new tests covering the full adapter: `healthCheck` (4 branches), `getCapabilities`,
  `getDefaultScopes`, `refreshTokens` (always throws — ClickUp tokens don't expire),
  `syncObjects` (happy path, empty-at-each-level, a failed-HTTP list not affecting siblings, **the
  malformed-task regression case that reproduces the bug above and proves the fix**, and the
  `CLICKUP_SYNC_TASKS_PER_LIST` cap), `fetchObjectDetails` (resolve/wrong-type/404/non-404-throws),
  all 3 write actions (create/update/comment, success and failure paths), the unsupported-action
  fallback, and the top-level try/catch in `executeWriteAction`.

**Explicitly not done in this slice** (real scope, not oversight): **no delta sync added anywhere**
(GitLab, Bitbucket, Outlook Calendar all still do full syncs every time) — not attempted without
verified API support, per above. **No Confluence webhook** — same reasoning; Atlassian's webhook
registration model for Confluence specifically was not verified from this repo. **No test
coverage added for the other 8 zero-coverage adapters** (Bitbucket, Confluence, Slack, Google
Drive, Google Calendar, OneDrive, Outlook Calendar, SharePoint) — each is real, valuable, future
work in this same shape (find the adapter's own equivalent of the ClickUp bug, if one exists, then
close it with tests), just not attempted together in one phase. **No Google/Outlook Calendar write
path** — both remain read-only, a gap the Pass-2 matrix already flagged as "the pack expects
meeting automation on a provider with no write path at all," unrelated to and not addressed by
this phase's test-coverage focus.

## Phase 14 — Observability/Security/Governance (Slack webhook replay-window fix, done)

The full Phase 14 spec covers observability, security, and governance broadly — audit logging,
secret-handling review, webhook-verifier hardening, and more. Investigation (an Explore-agent sweep
across the gap-map doc, a secret-logging audit of every `this.logger.*` call site, a
webhook-signature-verifier quality audit, and an audit-trail/governance-table check) found the
logging discipline already sound — no site logs a raw token, secret, or password; every
secret-adjacent log interpolates only an id or `error.message`. It also found one genuine,
confirmed, fixable security gap: **Slack's webhook verifier was missing the replay-window check
Slack's own docs require**, with a correct reference implementation already sitting as dead code
elsewhere in the repo.

**What shipped:**

- **The bug**: `buildSlackVerifier()` in
  `apps/claw-workspace-service/src/modules/webhooks/utilities/webhook-signature-verifiers.utility.ts`
  checked the `v0=` HMAC signature but never validated `X-Slack-Request-Timestamp` against the
  current time. Slack's HMAC alone never expires, so a captured, validly-signed webhook payload
  could be resubmitted indefinitely — a real replay vulnerability, not a theoretical one. A correct
  implementation of this exact check (`SLACK_MAX_TIMESTAMP_SKEW_MS`, a 5-minute skew window) already
  existed in `common/utilities/webhook-signature.utility.ts`, but that file is dead code — nothing
  calls it or its guard (`common/guards/webhook-signature.guard.ts`); the live verifier registry the
  webhook receiver actually calls is the one in the `webhooks` module.
- **The fix**: `buildSlackVerifier()` now parses `X-Slack-Request-Timestamp`, rejects a missing or
  non-numeric timestamp, and rejects anything more than 5 minutes (`SLACK_MAX_TIMESTAMP_SKEW_MS`)
  from now — all before the (more expensive) HMAC comparison. A new rejection code,
  `SIGNATURE_TIMESTAMP_EXPIRED`, was added to `WEBHOOK_REJECTION_CODES` (deliberately not reusing
  the existing-but-unused `REPLAY_DUPLICATE`, whose established meaning is a duplicate delivery id,
  not a stale timestamp).
- 4 new tests plus 2 existing tests rewritten (the originals hardcoded a Nov-2023 timestamp that the
  new skew check would now correctly reject): fresh-timestamp accept, fresh-timestamp-wrong-signature
  reject, stale-but-validly-signed reject (the direct regression test for the bug), non-numeric
  timestamp reject, missing timestamp reject, unconfigured-secret reject. 13/13 tests pass in the
  verifier spec; 17/17 pass across the full `webhooks` module as a regression check.

**Explicitly not done in this slice** (real scope, not oversight): **Bitbucket and Jira's webhook
verifiers remain honest no-op stubs** (`signatureValid: true` unconditionally, already commented as
such in the source) — Bitbucket Cloud doesn't send HMAC by default and this app's Jira integration is
OAuth-based, not an Atlassian Connect app with a shared signing secret, so hardening either would mean
guessing at an unverified external API contract, the same reasoning Phase 13 used to skip GitLab's
delta sync and Confluence's webhook. **No audit-logging/governance system was built** — a full
audit-trail feature (who-did-what-when across workspace actions) is its own multi-day track, not a
one-phase slice. **Connector-grant revocation still has no durable audit trail**
(`ConnectorAccessService.revoke()` hard-deletes the grant row via `grantRepo.deleteOne()`, traceable
only through ephemeral logs) — a real, narrower governance gap identified during investigation but not
pursued this phase in favor of the more concretely verifiable security fix above; left for a future
phase.

## Phase 15 — Test Labs/Chaos/E2E (webhook-receiver chaos-style test coverage, done)

The full Phase 15 spec is "test labs/chaos/E2E," described in this doc's own roadmap only as
"needs 01–14 substantially complete to be meaningful" — there was no more detailed spec text to
work from, so this phase needed real investigation (an Explore-agent sweep) before any code, the
same as Phase 14. That investigation found what "test lab" concretely means in this codebase
already: `apps/claw-routing-service/src/modules/routing/lab/` — a 30-file, multi-day
fault-plan/corpus/evidence-manifest harness — and confirmed the word "chaos" does not appear
anywhere in workspace-service today. It also found a real, CI-unwired Playwright E2E suite at
`apps/claw-frontend/tests/e2e/` with no workspace-flow spec, and confirmed
`WebhookReceiverManager` (301 lines — preflight, signature verification, dedup, persistence,
event publishing, and replay) had **zero test coverage of any kind**.

**What shipped:**

- `apps/claw-workspace-service/src/modules/webhooks/managers/__tests__/webhook-receiver.manager.spec.ts`
  (new file, 12 tests) covering `receive()`'s full branch set (body-too-large, rate-limited,
  unsupported-provider, invalid-signature, duplicate-delivery idempotent return, malformed-JSON
  rejection, and the accept happy path with the exact persisted row and published-event shape
  asserted) and `replay()` (not-found throw, success path, and a chaos case).
- Three tests are deliberately chaos-style: they inject a rejected `RabbitMQService.publish()`
  (simulating a RabbitMQ outage) on the `receive()` accept path, the `receive()` rejection path,
  and inside `replay()`, and assert what the manager actually does today — the delivery row stays
  durably persisted and the HTTP-facing result still returns normally in every case, because
  `publish()` catches and warn-logs rather than propagating. This is the manager's real,
  intentional fault-isolation contract (the webhook response to an external provider must never
  depend on RabbitMQ being reachable) — the tests lock it in as a regression guard rather than
  leaving 301 lines of security- and data-custody-critical code with no safety net.
- 12/12 new tests pass; 29/29 across the full `webhooks` module; 875/875 across the full
  `claw-workspace-service` suite (84/84 suites) as a full regression check.

**A real gap found, deliberately not fixed this slice**: `replay()` calls
`repo.markProcessed(row.id)` unconditionally, even when the republish it just attempted failed —
so an operator using `replay()` to recover a lost event during a RabbitMQ outage gets no durable,
query-able signal that the recovery attempt itself failed (only an ephemeral warn log). This is the
same shape of gap Phase 14 found and deferred for connector-grant revocation: fixing it well would
mean a real design decision (a `publishFailedAt` column and a migration, or a "needs replay" admin
query) rather than a mechanical change, so it's documented here as a follow-on candidate rather than
rushed into this test-coverage slice.

**Explicitly not done in this slice** (real scope, not oversight): **no routing-style fault-plan
"lab" was built for workspace-service** — that pattern is multi-day, purpose-built infrastructure
(fault-plan types, a corpus generator, a runner manager, a hand-written evidence manifest), not a
slice; workspace-service has no equivalent today and building one is real, separately-scoped future
work. **No CI-wired E2E workspace flow was added** — `apps/claw-frontend/tests/e2e/` has a working
Playwright harness but it isn't referenced in any `.github/workflows/*.yml` job, and a workspace
flow spec would need a live docker stack with seeded connector credentials to run meaningfully,
which isn't something this investigation-then-implement session could honestly verify end-to-end.
**No chaos coverage was added for the sync engine, chain executor, or saga/retry logic** — those
have existing tests today (the `WorkspaceSyncManager` spec already covers retry-exhaustion, for
example); `WebhookReceiverManager` was the one manager with zero coverage of any kind, which is why
it was the slice chosen. **The `replay()` observability gap above was documented, not fixed.**

## Explicitly not yet verified (next session's starting point)

- Whether `chains`/`ai-actions`/`actions` module boundaries already have the duplication the
  pack warns about ("chain vs workflow overlap... duplicate action enums... duplicate approval
  queues").
- RabbitMQ event contract inventory for workspace-service (`claw.events` topic exchange usage).
- Existing QA/E2E coverage for the modules above (the 8-of-14 adapters still with zero dedicated
  test files — ClickUp got real coverage in Phase 13 — is one concrete piece of this — but
  chains/ai-actions/digest/inbox etc. are unaudited).
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
6. **Phase 08** (Automations page) and **Phase 09** (NL → chain draft) are done — the unified
   inbox/dashboard and cross-provider search pieces of the original Work OS UX spec, and Phase
   09's auto-triggering half, remain.
7. **Phase 10** (knowledge graph — object-link wiring) and **Phase 11** (learning — preference
   injection into AI-action generation) are done. An LLM-backed preference classifier (beyond
   today's heuristic-v1) and the memory-service write-path fix remain — both belong to
   memory-service's own scope, not workspace-service's.
8. **Phase 12** (peer connector-sharing completeness) is done. True org installations/RBAC needs
   auth-service schema/claims work — should still land before Phase 13's provider expansion goes
   to production so deepened provider actions inherit the right grant model from day one, but that
   work belongs to auth-service's own scope, not workspace-service's.
9. **Phase 13** (provider capability expansion) — ClickUp's slice (test coverage + the
   fault-isolation fix it found) is done; delta sync for GitLab/Bitbucket/Outlook Calendar, a
   Confluence webhook, and test coverage for the remaining 8 zero-coverage adapters remain —
   each needs either verified external API details this repo's code can't confirm alone, or is
   simply more of the same ClickUp-shaped work not yet attempted.
10. **Phase 14** (observability/security/governance) — the Slack webhook replay-window fix is done;
    Bitbucket/Jira webhook-stub hardening (needs verified external API contracts this repo can't
    confirm alone), a full audit-logging/governance system, and a durable connector-grant-revocation
    audit trail remain, each its own future phase.
11. **Phase 15** (test labs/chaos/E2E) — `WebhookReceiverManager`'s chaos-style test coverage
    (previously zero) is done; a routing-style fault-plan "lab" for workspace-service and a
    CI-wired Playwright E2E workspace flow remain, each its own future phase.
12. **Phase 16** (migration/docs/release gate) — final phase, unchanged from the pack's ordering.

Each numbered item above should ship as its own batch: scoped, gated (typecheck/lint/test/build
in the touched workspaces only), committed, and pushed before the next starts — consistent with
this repo's existing "large flagship work ships in batches" rule. At the current pace this is
realistically many further sessions of work, not a single pass.
