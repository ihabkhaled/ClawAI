# Workspace Automation — Architecture Overview

**Status:** Wave 1 (Streams 10–13) + Wave 2 partial (Streams 20–21) + Stream 32 backend + Stream 40 backend landed. Frontend, Streams 22/23/30/31, Stream 41, and stream-specific QA evidence pending.

## What workspace automation does

Workspace automation closes the loop "external event → AI-drafted action → human approval → external write". A user receives a suggestion ("draft a reply to this Slack DM"), reviews it in the approval queue, and either approves (with optional edits) or rejects. Approved actions execute against the connected workspace provider; rejections feed a learning loop that tunes future suggestions to that user's voice.

## Stream map

| Wave | Stream | What | Where |
|---|---|---|---|
| 1 | 10 | Approval policy engine | `ai-actions/` module |
| 1 | 11 | Universal webhook receiver | `webhooks/` module |
| 1 | 12 | Auto-suggest scheduler | `auto-suggest/` module |
| 1 | 13 | Suggestion factory (single entry-point) | `suggestion-factory/` module |
| 2 | 20 | GitLab + Bitbucket writes | `workspace/adapters/gitlab.adapter.ts`, `bitbucket.adapter.ts` |
| 2 | 21 | OneDrive + SharePoint + ClickUp writes | corresponding adapters |
| 3 | 22 | Gmail HTML rendering + attachments | _deferred_ |
| 3 | 23 | Calendar adapters + meeting notes | _deferred_ |
| 3 | 30 | Unified inbox + pgvector semantic search | _deferred_ |
| 3 | 31 | Daily/weekly digest dashboard | _deferred_ |
| 3 | 32 | Auto-action settings (per-user opt-in) | `ai-actions/automation-preference.*` |
| 4 | 40 | Memory learning loop | `learning/` module |
| 4 | 41 | Ticket planning + coding bridge | _deferred_ |

## End-to-end flow

```
Provider event (webhook OR cron tick)
        │
        ▼
[Stream 11] WebhookReceiverManager / [Stream 12] AutoSuggestSchedulerManager
        │  publishes WORKSPACE_WEBHOOK_RECEIVED or directly invokes factory
        ▼
[Stream 13] SuggestionFactoryManager.process(event)
        │  matches active SuggestionTriggerRule rows
        │  builds draft payload via rule's actionKind + prompt template
        ▼
[Stream 10] AiActionApprovalManager.enqueueSuggestion(input)
        │  ├─ AiActionRiskScorerManager.assess(payload)        — PII regex + heuristics
        │  ├─ AiActionPolicyMatcherManager.match()             — DENY > AUTO_APPROVE > ALLOW
        │  └─ [Stream 32] applyUserPreference()                — most-restrictive-wins
        ▼
AiActionApprovalQueue row (PENDING_APPROVAL | AUTO_APPROVED | DENIED)
        │  publishes ai_action.suggestion_created + ai_action.{pending|auto_approved|denied}
        ▼
User approves/edits/rejects (or cron auto-approves)
        ▼
[Stream 10] AiActionApprovalQueueService.{approve,reject,edit,bulkApprove}
        │  publishes ai_action.{approved,rejected,edited,auto_approved}
        ▼
[Stream 20/21] WorkspaceAdapter.executeWriteAction()           — provider-specific HTTP call
        │  publishes ai_action.executed | ai_action.failed
        ▼
External system (PR comment landed, OneDrive file uploaded, …)

[Stream 40] AiActionDecisionConsumer subscribes to .approved/.rejected/.edited/.auto_approved
        │  PreferenceClassifierManager → ProposedPreference[]
        │  PreferenceUpsertService → memory-service POST /internal/memories/automation-preference
        ▼
[Audit] AiActionAuditConsumer (claw-audit-service) writes audit_logs row for every event
```

## Key invariants

1. **Default-strict policy** — admin defaults DENY before they ALLOW; the seeded 13 system policies bias toward "queue for human review", auto-approval is opt-in per kind.
2. **Single approval queue** — every suggestion across every provider lands in `AiActionApprovalQueue`. No provider has its own approval table.
3. **HMAC at the edge** — webhook receiver enforces signature verification before the body is parsed (raw-body middleware path-scoped to `/api/v1/workspace/webhooks/.+`).
4. **Idempotency on delivery id** — `WebhookDelivery (provider, externalDeliveryId)` unique constraint; replays are no-ops.
5. **Most-restrictive-wins** — user prefs (Stream 32) can tighten policy decisions, never loosen them.
6. **Adapter writes never throw** — `executeWriteAction` returns `{ success, errorMessage? }`. The execution-manager records that on the queue row.
7. **Dynamic model resolution** — no hardcoded `AI_ACTION_LOCAL_MODEL` env var; the resolver picks from installed Ollama models + connected cloud providers per request, scored by capability hints.
8. **Audit ledger ledgers everything** — claw-audit-service subscribes to all 9 `ai_action.*` events and persists to MongoDB `audit_logs` (TTL 30 days).

## Tables added

| Table | Stream | Purpose |
|---|---|---|
| `AiActionPolicy` | 10 | Admin-curated approval rules |
| `AiActionApprovalQueue` | 10 | Every queued suggestion (PENDING/AUTO_APPROVED/APPROVED/REJECTED/DENIED/EXECUTED/EXPIRED) |
| `WebhookDelivery` | 11 | One row per inbound webhook (idempotency + replay) |
| `AutoSuggestRun` | 12 | Per-tick run record with candidate counts |
| `SuggestionDeduplication` | 12 | Prevents re-enqueuing same suggestion across ticks |
| `SuggestionTriggerRule` | 13 | Admin-curated event → action-kind mapping |
| `UserAutomationPreference` | 32 | Per-user (userId, actionKind) opt-in / threshold |

## Events published

Listed in root `CLAUDE.md` event-bus table. New patterns added (16): all 9 `ai_action.*`, 3 `workspace.webhook.*`, 3 `workspace.auto_suggest.tick.*`, `workspace.suggestion.factory_processed`, `memory.preference.upserted`.

## Configuration

All knobs are `AI_ACTION_*` / `WEBHOOK_*` / `AUTO_SUGGEST_*` env vars. See `.env.example` for the full list. Notable defaults:

- `AI_ACTION_QUEUE_EXPIRY_HOURS=24` — pending suggestions expire after 24h
- `AI_ACTION_RISK_AUTO_APPROVE_MAX=30` — global ceiling under which AUTO_APPROVE policies can fire
- `WEBHOOK_BODY_MAX_BYTES=1048576` — 1 MiB cap
- `AUTO_SUGGEST_DEDUP_TTL_DAYS=7` — dedup horizon

## Verification

- Unit tests: 30+ across the new modules; coverage stays above the 92% gate.
- Integration tests:
  - `qa/test-stream-10-approval-engine.sh` — 18 PASS
  - `qa/test-stream-11-webhook-receiver.sh` — webhook accept/reject/replay/admin-list
  - `qa/test-stream-12-auto-suggest.sh` — manual trigger + run row + bad jobType
  - `qa/test-stream-13-suggestion-factory.sh` — CRUD + bad-regex + disable
  - `qa/test-stream-20-gitlab-bitbucket-writes.sh` — enum presence + run-endpoint
  - `qa/test-stream-21-onedrive-sharepoint-clickup.sh` — same pattern
  - `qa/test-workspace-automation-full.sh` — master harness, exit 0 required for release-readiness
- Live: webhook ACCEPTED+REJECTED+IDEMPOTENT round-trip; scheduler 23 candidates → 23 enqueued in 123 ms; bad regex → HTTP 400 `TRIGGER_REGEX_UNSAFE`.

## Related ADRs

- ADR-018 — webhook receiver
- ADR-019 — auto-suggest scheduler
- ADR-020 — suggestion factory single-entry
- ADR-021 — write-action adapter pattern
- ADR-026 — user-automation-preferences intersection
- ADR-027 — memory learning loop

## What still needs work

- Frontend: dedicated approval-card with risk badges, edit/reject dialogs, bulk-approve UI, admin policy editor (Stream 32 frontend), trigger-rule editor, automation-preferences page, "what we've learned" panel (Stream 40 frontend)
- Streams 22, 23, 30, 31, 41 — see stream prompts in `plan-prompts/wokrspaces-flagship/`
- Per-stream UAT evidence in `.claude/Integrations/<stream>__QA_output.md`
- All 8 i18n locales for new user-facing strings (~70 new strings expected from approval card + admin pages)
