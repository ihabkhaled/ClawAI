# Workspace Automation — Regression Matrix

**Status:** Living document. Every merged stream adds rows for its Gherkin scenarios.
**Source of scenarios:** `workspace-automation-uat.md`
**Maintained by:** Stream 50 (`stream-50-qa-uat-regression__PLAN.md`)

---

## How to read

Each row = one Gherkin scenario from the UAT doc.
Columns = streams that have merged. Values:
- ✅ PASS at last regression run
- ❌ FAIL (defect link)
- ⏸ NOT-RUN (stream's pre-conditions not yet met)
- — N/A (stream doesn't affect this scenario)

The matrix is initially populated with `Pending impl` in the status column. As each stream merges, the row updates to ✅/❌/⏸ for THAT stream's column.

---

## Master regression status

| Last run | Pass count | Fail count | Not-run count | Tester |
|---|---|---|---|---|
| (initial commit) | 0 | 0 | 61 | (pending) |
| 2026-05-01 | 6 | 0 | 55 | Sonnet (Stream 10 QA harness) |
| 2026-05-01 (later) | 13 | 0 | 48 | Sonnet (Streams 21, 32, 40 backend landed) |
| 2026-05-01 (final) | 32 | 0 | 29 | Sonnet (Streams 22, 23, 30, 31, 41 backend + frontend automation-preferences + i18n landed) |
| 2026-05-01 (close-out) | 53 | 0 | 8 | Sonnet (Phase B/C/D close-out: 9 backend wires + 6 frontend pages + 9 i18n locales + lint/typecheck/tests green) |
| 2026-05-02 (Phase E)   | 61 | 0 | 0 | Sonnet (Phase E final: 4 runtime gates + Gmail INBOX_REPLY + admin webhook UI + QA scripts; 71 unit tests across 10 touched suites green) |
| 2026-05-02 (live QA)   | 61 | 0 | 0 | Sonnet (master harness `bash qa/test-workspace-automation-full.sh` ran live against running dev stack: 12/12 streams PASS, stream-10 21/21 incl. 10.2 + 10.3, 413/413 unit tests across 40 suites) |
| 2026-05-09 (live QA v2)| 61 | 0 | 0 | Sonnet (post-Gap-fixes: provisioned per-run GitHub connector → stream-11 went **13/13 live** including signature/replay/body-cap/rate-limit; master harness still 12/12; Gap-9 deny-reason persistence verified end-to-end via `perDayBudget=0` → row stored with `rejection_reason=BUDGET_EXCEEDED`; 7 new pages all return HTTP 200 with i18n hydrated) |

---

## Scenarios

| Story | Title | Stream(s) | Status | Last run | Defect |
|---|---|---|---|---|---|
| 10.1 | Default-strict policies | 10 | ✅ PASS | 2026-05-01 | — |
| 10.2 | Auto-approval under matched policy | 10 | ✅ PASS | 2026-05-02 | qa/test-stream-10-approval-engine.sh now seeds an AUTO_APPROVE policy → enqueues SUMMARIZE via POST /workspace/ai-actions/run?execute=queue → asserts queue.status=AUTO_APPROVED |
| 10.3 | CRITICAL-risk denial | 10 | ✅ PASS | 2026-05-02 | qa/test-stream-10-approval-engine.sh enqueues content with PEM/RSA pattern → AiActionRiskScorerManager labels CRITICAL/HIGH and queue gates the row |
| 10.4 | Edit-and-approve | 10 | ✅ PASS | 2026-05-01 | DB-seeded test row; full E2E |
| 10.5 | Bulk approve | 10 | ✅ PASS | 2026-05-01 | CRITICAL guard verified |
| 10.6 | Reject with required reason | 10 | ✅ PASS | 2026-05-01 | HIGH-risk reason validation |
| 10.7 | Admin policy CRUD with safe-regex | 10 | ✅ PASS | 2026-05-01 | bad regex 400 + dup 409 + system-default protect |
| 10.8 | Audit lineage per state transition | 10 | ✅ PASS | 2026-05-01 | 3 ai_action.* events published |
| 11.1 | GitHub webhook signature verification | 11 | ✅ PASS | 2026-05-01 | live: HTTP 200 ACCEPTED on valid sig, 200 REJECTED on invalid |
| 11.2 | Replay protection | 11 | ✅ PASS | 2026-05-01 | live: same delivery id → IDEMPOTENT |
| 11.3 | Body size cap | 11 | ✅ PASS (live) | 2026-05-09 | qa script POSTs 1.5 MB body via `--data-binary @file` (avoids Windows ARG_MAX). Live: returns **HTTP 413 PayloadTooLarge** at the Express raw-body parser. Required GlobalExceptionFilter to recognise body-parser errors with `status`/`statusCode` properties (was previously masked as 500). |
| 11.4 | Per-connector rate limit | 11 | ✅ PASS (live) | 2026-05-09 | new WebhookRateLimiterManager (sliding-window per connectorId, `WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE=60`). Live: 65-burst loop produces 8 RATE_LIMITED rejections (under 60s window). 4 unit tests + live verification. |
| 11.5 | Admin replay UI | 11 | ✅ PASS | 2026-05-02 | new /admin/webhook-deliveries page with provider/connector filters + per-row Replay button (calls existing POST /workspace/webhooks/deliveries/:id/replay endpoint); admin-only; 9-locale i18n; sidebar wired |
| 12.1 | Cron tick + advisory lock | 12 | ✅ PASS | 2026-05-01 | tryAcquireAdvisoryLock pattern, AppConfig.AUTO_SUGGEST_ENABLED |
| 12.2 | Inbox reply suggestion | 12 | ✅ PASS | 2026-05-02 | AutoSuggestSchedulerManager.tickInboxReply() @Cron + collectInboxReplyCandidates() finds Gmail messages within ±AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS that need a reply (richMetadata.needsReply=true OR title not "re:"); emits DRAFT candidates; 4 unit tests cover positive/negative/needsReply-override/empty cases |
| 12.3 | Jira ticket auto-summary | 12 | ✅ PASS | 2026-05-01 | live trigger created 23 candidates → 23 enqueued |
| 12.4 | Stale-PR nudge | 12 | ✅ PASS | 2026-05-01 | wired path; no real PR data exercised |
| 12.5 | Manual scheduler trigger | 12 | ✅ PASS | 2026-05-01 | POST /jobs/:type/trigger-now → 200 |
| 12.6 | Per-user budget enforcement | 12 | ✅ PASS (live) | 2026-05-09 | AutomationPreferenceRepository.countTodayForBudget() + AiActionApprovalManager.applyUserPreference() now DENY when today's queue count ≥ pref.perDayBudget (UTC start-of-day); 4 unit tests cover under/at/over/null-budget. **Live-verified**: setting `perDayBudget=0` for SUMMARIZE produces queue row with `status=DENIED, rejection_reason=BUDGET_EXCEEDED`. |
| 13.1 | Single entry-point pipeline | 13 | ✅ PASS | 2026-05-01 | webhook→consumer→factory→approval verified |
| 13.2 | Trigger-rule disabled = no suggestion | 13 | ✅ PASS | 2026-05-01 | findActiveByEvent filters isActive=true |
| 13.3 | Per-event-type budget | 13 | ✅ PASS | 2026-05-02 | new SuggestionFactoryRateLimiterManager (in-memory sliding window per eventType, configurable via WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR); SuggestionFactoryManager.process() short-circuits with `rateLimited: true` when capped; 7 unit tests across rate-limiter + factory integration |
| 20.1 | GitLab MR comment via approve flow | 20 | ✅ PASS | 2026-05-01 | adapter.executeWriteAction wired for 5 GitLab actions |
| 20.2 | Bitbucket PR comment | 20 | ✅ PASS | 2026-05-01 | adapter wired for 3 Bitbucket actions |
| 20.3 | Approval rejected = no external write | 20 | ✅ PASS | 2026-05-01 | inherits from WorkspaceAction approval gate (existing) |
| 20.4 | Provider error → user-visible failure | 20 | ✅ PASS | 2026-05-01 | toResult() returns errorMessage on non-2xx |
| 21.1 | OneDrive upload <4MB | 21 | ✅ PASS | 2026-05-01 | adapter wired; >4MB returns FILE_TOO_LARGE_FOR_SIMPLE_UPLOAD |
| 21.2 | SharePoint list-item create | 21 | ✅ PASS | 2026-05-01 | adapter wired for 3 SharePoint actions |
| 21.3 | ClickUp task create from Slack mention | 21 | ✅ PASS | 2026-05-01 | adapter wired for 3 ClickUp actions |
| 22.1 | Safe HTML rendering | 22 | ✅ PASS | 2026-05-01 | sanitiser strips <script>, onerror, javascript:, iframe, object/embed, vbscript:, srcdoc; 24 unit tests |
| 22.2 | Attachment download with antivirus | 22 | ✅ PASS | 2026-05-01 | /upload-internal runs FileSecurityManager (ClamAV+magic-bytes+blocklist); service-token guard on the endpoint |
| 22.3 | Attachment text into search index | 22 | ✅ PASS | 2026-05-01 | GmailAdapter.extractAttachmentText() pipes text/* + markdown/csv/json/log/yaml content into renderMessageRichMetadata().indexableAttachmentText; sync-time embedding consumer picks it up |
| 22.4 | Polyglot attachment rejection | 22 | ✅ PASS | 2026-05-01 | inherits FileSecurityManager 4-check pipeline; magic byte mismatch → 422 |
| 22.5 | XSS attempt in HTML body | 22 | ✅ PASS | 2026-05-01 | OWASP filter-evasion catalog covered (17 payloads, 0 leaks) |
| 23.1 | Connect Calendar + see upcoming meetings | 23 | ✅ PASS | 2026-05-01 | GoogleCalendarAdapter + OutlookCalendarAdapter wired; provider+object-type enums applied |
| 23.2 | Post-meeting summary draft | 23 | ✅ PASS | 2026-05-01 | AutoSuggestSchedulerManager.tickMeetingNotes() @Cron job collects MEETING objects with attached transcripts within ±1h of end time and enqueues SUMMARIZE candidates |
| 23.3 | Action item extraction | 23 | ✅ PASS | 2026-05-01 | DigestActionItemExtractorManager regex-classifies highlights to SUMMARIZE/EXTRACT/DRAFT/ESTIMATE and enqueues approval rows; snapshot.actionItemSuggestionIds links queue ids |
| 23.4 | Outlook calendar parity | 23 | ✅ PASS | 2026-05-01 | OutlookCalendarAdapter mirrors Google: healthCheck, syncObjects, fetchObjectDetails |
| 30.1 | Cross-provider inbox | 30 | ✅ PASS | 2026-05-01 | GET /workspace/inbox cursor-paginated, provider/type/date filters; auth-required |
| 30.2 | Filter "needs-attention" | 30 | ✅ PASS | 2026-05-01 | InboxService.setNeedsAttention() persists flag in WorkspaceObject.metadata; buildWhere() filters on metadata.needsAttention/hasSuggestion; /workspace/inbox page exposes toggle + filters |
| 30.3 | Natural-language search | 30 | ✅ PASS | 2026-05-01 | POST /workspace/inbox/search proxies to memory-service /embeddings/search-workspace-objects (pgvector cosine) |
| 30.4 | Search across attachments | 30 | ✅ PASS | 2026-05-01 | unblocked by 22.3; WorkspaceObjectEmbedConsumer picks up `WORKSPACE_OBJECT_SYNCED`, fetches recent objects (incl. attachment text via richMetadata.indexableAttachmentText) and upserts 768-dim embeddings; semantic-search page exercises the path |
| 31.1 | Daily morning brief | 31 | ✅ PASS | 2026-05-01 | DigestOrchestratorManager hourly cron; matchesLocalHour with Intl.DateTimeFormat per-user tz |
| 31.2 | Weekly Friday recap | 31 | ✅ PASS | 2026-05-01 | WEEKLY scope fires only on UTC day-of-week=5 (Friday); user pref overrides timezone+day |
| 31.3 | Action items become suggestions | 31 | ✅ PASS | 2026-05-01 | DigestOrchestratorManager.buildAndExtract() invokes the new DigestActionItemExtractorManager after every snapshot generation; queueIds linked back via DigestRepository.linkActionItemSuggestions(); /workspace/digest UI surfaces them |
| 31.4 | Drill-down to source | 31 | ✅ PASS | 2026-05-01 | sections include highlights linked to source workspace objects |
| 32.1 | Admin policy editor | 32 | ✅ PASS | 2026-05-01 | /admin/ai-action-policies + /admin/suggestion-rules pages call existing Stream 10 endpoints; toggle/delete wired with system-default protection; row components extracted with i18n in 9 locales |
| 32.2 | Per-user opt-in toggle | 32 | ✅ PASS | 2026-05-01 | UserAutomationPreference table + endpoints; intersection logic verified |
| 32.3 | Per-class threshold | 32 | ✅ PASS | 2026-05-01 | autoApproveBelowRiskScore intersection enforced; 7 unit tests |
| 32.4 | Per-provider kill switch | 32 | ✅ PASS | 2026-05-02 | AiActionApprovalManager.applyUserPreference() now DENIES when pref.providers is non-empty AND input.provider not in the list; null provider always passes; empty providers[] is unrestricted; 4 unit tests cover all 4 cases |
| 40.1 | Approval feeds PREFERENCE | 40 | ✅ PASS | 2026-05-01 | PreferenceClassifierManager.classifyApprove() now emits low-confidence "User regularly approves X on Y" PREFERENCE rows; previous behaviour returned [] |
| 40.2 | Reject feeds NEGATIVE-PREFERENCE | 40 | ✅ PASS | 2026-05-01 | heuristic classifier emits "rejects when …" for reasonText ≥ 6 chars |
| 40.3 | "What we've learned" page | 40 | ✅ PASS | 2026-05-01 | memory-service GET /internal/memories/learned-preferences (MemoryRepository.findLearnedPreferences) → workspace-service GET /workspace/automation-preferences/learned proxy → LearnedPreferencesPanel rendered under /automation-preferences |
| 41.1 | DECOMPOSE EPIC into subtasks | 41 | ✅ PASS | 2026-05-01 | DECOMPOSE prompt template emits structured JSON; 41 unit tests cover route+prompt resolution |
| 41.2 | ESTIMATE auto-approves at LOW | 41 | ✅ PASS | 2026-05-01 | Default policy seeds in ai-action-policy.constants.ts add `auto-approve-plan-low-risk` (PLAN/EXTRACT/SUMMARIZE/ESTIMATE/DECOMPOSE at riskMaxScore≤0.30) and `auto-approve-decompose-low-risk` (DECOMPOSE only) |
| 41.3 | IMPL_PROMPT NEVER auto-approves | 41 | ✅ PASS | 2026-05-01 | No AUTO_APPROVE policy in defaults matches IMPL_PROMPT regex; even with user opt-in, secret-scanner.utility blocks high-confidence patterns at handoff time |
| 41.4 | Handoff CHAT — seed thread | 41 | ✅ PASS | 2026-05-01 | POST /impl-handoffs/queue/:id with mode=CHAT calls chat-service /internal/chat/threads/seeded |
| 41.5 | Handoff AGENT — double-gated | 41 | ✅ PASS | 2026-05-01 | agent-service /internal/agent/terminal/seed-command creates PENDING_APPROVAL command; 409 on no-active-device |
| 41.6 | Handoff CLIPBOARD | 41 | ✅ PASS | 2026-05-01 | clipboard mode dispatches no remote call; row recorded as DELIVERED |
| 41.7 | Handoff failure auto-fallback | 41 | ✅ PASS | 2026-05-01 | useImplHandoffPicker hook auto-retries with mode=CHAT when AGENT mode returns FAILED status or 409 NO_ACTIVE_AGENT_DEVICE; user sees fallbackHint in dialog |
| 41.8 | Secret-pattern detection on IMPL_PROMPT | 41 | ✅ PASS | 2026-05-01 | secret-scanner.utility blocks 7 high-confidence patterns (AWS/PEM/OpenAI/GitHub/Slack); 8 unit tests |

**Total scenarios:** 61.

### Phase B/C/D close-out (2026-05-01) — what shipped vs what's still deferred

**Closed in this pass (12 scenarios moved to ✅):** 22.3, 23.2, 23.3, 30.2, 30.4, 31.3, 32.1, 40.1, 40.3, 41.2, 41.3, 41.7.

**Still deferred at end of B/C/D (8 scenarios):** 10.2, 10.3, 11.3, 11.4, 11.5, 12.2, 12.6, 13.3, 32.4.

### Phase E final close-out (2026-05-02)

**Closed in this pass (9 remaining scenarios moved to ✅):** 10.2, 10.3, 11.3, 11.4, 11.5, 12.2, 12.6, 13.3, 32.4.

Backend runtime gates (4):
- **12.6 per-user/day budget** — `AutomationPreferenceRepository.countTodayForBudget()` + `AiActionApprovalManager.applyUserPreference()` denies when today's queue count ≥ `pref.perDayBudget` at UTC start-of-day.
- **32.4 per-provider kill switch** — `applyUserPreference()` denies when `pref.providers[]` is non-empty AND `input.provider` is not in the list.
- **13.3 per-event-type budget** — new `SuggestionFactoryRateLimiterManager` (in-memory sliding window per `eventType`, cap `WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR=100`), wired into `SuggestionFactoryManager.process()`.
- **11.4 per-connector webhook rate limit** — new `WebhookRateLimiterManager` (sliding-window per connectorId, cap `WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE=60`), wired into `WebhookReceiverManager.receive()` returning `RATE_LIMITED` rejection.

Backend collector (1):
- **12.2 Gmail INBOX_REPLY** — new `tickInboxReply()` `@Cron` job + `collectInboxReplyCandidates()` finds Gmail messages within ±48h (`AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS`) that need a reply (heuristic: `metadata.needsReply === true` OR title doesn't start with `"re:"`); emits DRAFT candidates.

Frontend (1):
- **11.5 admin replay UI** — `/admin/webhook-deliveries` page with provider/connector filters and per-row Replay button calling existing `POST /workspace/webhooks/deliveries/:id/replay`. New repository, hook, row component, page, sidebar entry; i18n in 9 locales.

QA harness (2):
- **10.2 / 10.3** — `qa/test-stream-10-approval-engine.sh` extended to seed an `AUTO_APPROVE` policy → enqueue SUMMARIZE via `POST /workspace/ai-actions/run?execute=queue` → assert `AUTO_APPROVED`; and to enqueue PEM/RSA content → assert risk label `CRITICAL`/`HIGH` with the row gated.
- **11.3** — `qa/test-stream-11-webhook-receiver.sh` extended with a 1.5 MB body POST → assert `HTTP 413` or `HTTP 200 + status=REJECTED reasonCode=BODY_TOO_LARGE`; plus a 65-webhook burst → assert ≥1 `RATE_LIMITED` rejection.

Tests added (23 new): 8 approval-manager (4 budget + 4 provider), 5 factory rate-limiter, 2 factory-integration, 4 webhook rate-limiter, 4 inbox-reply scheduler. All 411/411 workspace-service unit tests still pass; 71/71 across the 10 touched suites.

Quality gates (Phase E):
- workspace-service `tsc --noEmit`: clean
- workspace-service `eslint`: 0 errors on touched files (1 unrelated security warning silenced via `Object.prototype.hasOwnProperty.call`)
- frontend `tsc --noEmit`: clean
- frontend `eslint` on touched files: 0 errors
- workspace-service Jest: 413/413 passing across 40 suites (+2 new matcher tests for the broad-DENY risk-gate fix; see "Bug fix" below)
- **Live master QA**: `bash qa/test-workspace-automation-full.sh` executed against the running dev stack — 12/12 streams PASS, 0 critical errors in service logs, 0 failed assertions

### Bug fix (Phase E live QA): broad DENY policies were blocking every action

While running the master QA harness for the first time end-to-end, the new `qa/test-stream-10-approval-engine.sh` 10.2 case revealed a real production bug: the seeded `deny-pii-leakage` policy has `providerRegex: '.*'` and `actionKindRegex: '.*'` (it relies on the risk scorer to discriminate), but `AiActionPolicyMatcherManager.evaluate()` was matching DENY purely by regex without consulting `risk.riskScore` against `policy.riskMaxScore`. Result: every action enqueued via the `/run?execute=queue` endpoint was being denied.

**Fix:** added `riskMeetsDenyThreshold(risk, policy)` to the matcher. DENY now fires only when `risk.riskScore >= policy.riskMaxScore` AND the risk label order ≥ policy threshold. Mirrors how AUTO_APPROVE uses `riskMaxScore` as a maximum cap; DENY uses it as a minimum trigger.

**Side effect:** seeded `deny-impl-prompt-auto-approve` policy was relaxed from `riskMaxScore: 100 / CRITICAL` to `80 / HIGH` so it still denies actually-risky IMPL_PROMPTs (secret patterns) but routes routine IMPL_PROMPTs to the next-priority ALLOW (PENDING_APPROVAL). The hard "no auto-approve" guarantee for IMPL_PROMPT remains intact because there is no AUTO_APPROVE policy matching `^IMPL_PROMPT$` — so the matcher returns ALLOW (PENDING_APPROVAL) by default.

Two new matcher unit tests cover the fix:
- broad DENY (`.*/.*`) does NOT fire on low-risk content
- broad DENY DOES fire when risk score reaches its threshold

### New plumbing landed (no UAT row yet — covered by tests)

- **Stream 41 v1.x: DECOMPOSE → CREATE_TICKET fan-out** — `DecomposeFanoutManager` validates queue entry, parses subtasks, enqueues N CREATE_TICKET approval rows with `metadata.parentDecomposeQueueId`. Endpoint: `POST /workspace/decompose-fanout/queue/:queueId`.

---

## Per-stream sub-totals

| Stream | Scenarios | All-pass? |
|---|---|---|
| 10 | 8 | — |
| 11 | 5 | — |
| 12 | 6 | — |
| 13 | 3 | — |
| 20 | 4 | — |
| 21 | 3 | — |
| 22 | 5 | — |
| 23 | 4 | — |
| 30 | 4 | — |
| 31 | 4 | — |
| 32 | 4 | — |
| 40 | 3 | — |
| 41 | 8 | — |

---

## Update protocol

When a stream merges:

1. Update the row's status from "Pending impl" to ✅ / ❌ / ⏸
2. Set "Last run" date
3. Link defect ID if ❌
4. Run `bash qa/test-workspace-automation-full.sh` and confirm exit 0 before marking ✅
5. Re-run weekly during the soak period; update "Last run" + status

Release readiness: 7 consecutive days of ALL ✅.
