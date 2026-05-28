# Workspace Automation — UAT & Acceptance Criteria

**Status:** Canonical reference. Every implementation stream cites story IDs from this doc.
**Companion docs:** `../02-business-product/workspace-automation-vision.md`, `../02-business-product/workspace-automation-feature-catalog.md`
**Date:** 2026-04-26

---

## How to use this doc

Each story has:

- **Feature-ID link** — cross-reference to catalog
- **Persona** — P1 (IC engineer), P2 (Tech PM), P3 (Founder/Exec), Admin
- **Story sentence** — As-a / I-want / so-that
- **Gherkin scenarios** — happy path + at least one error path
- **Demo script** (≤30 s) — what UAT walks through with a real client
- **Fixtures** — what test data is required
- **DB-change expectations** — exactly which tables/rows change

During UAT, walk through each demo script with a non-technical client. Every regression run (stream 50) re-executes every Gherkin scenario.

---

## Test fixtures (shared)

Fixtures live in `apps/claw-workspace-service/src/__tests__/fixtures/` and are seeded via `prisma/seed-uat-fixtures.ts`:

- `sample-emails.json` — 20 sample Gmail messages (5 with attachments, 5 HTML-only, 5 text-only, 5 long-thread, 2 XSS-attempt, 2 tracking-pixel)
- `sample-jira.json` — 10 tickets (5 with >10 comments, 5 with <3 comments, distributed across statuses; 1 EPIC for stream 41)
- `sample-slack.json` — 5 channels each with 50 messages (1 deep-thread, 1 with code snippets, 1 noisy)
- `sample-github.json` — 5 PRs (2 stale, 2 active, 1 merged), 3 issues
- `sample-gitlab.json` — same shape on GitLab
- `sample-bitbucket.json` — same on Bitbucket
- `sample-clickup.json` — 8 tasks
- `sample-policies.json` — 13 default `AiActionPolicy` rows (used by all auto-approve scenarios)
- `sample-trigger-rules.json` — 5 default `SuggestionTriggerRule` rows (stream 13)
- `sample-calendar.json` — 4 Google Calendar + 4 Outlook Calendar events
- `sample-attachments/` — small PDF, PNG, .vtt transcript, .docx, polyglot SVG-with-script, .exe.pdf double-extension

---

## Stories — grouped by stream

### Stream 10 — Approval Policy Engine (F-APPROVE-02..05, F-SAFE-01, F-SAFE-02, F-SAFE-06, F-SAFE-07, F-OBS-01, F-OBS-02)

#### Story 10.1 — Default-strict policies (F-SAFE-06)

- **As a** new ClawAI customer
- **I want** every AI suggestion to require explicit approval by default
- **So that** I can trust the system before relaxing controls

**Gherkin happy path**

```
Given a freshly seeded ClawAI install with the 13 default AiActionPolicies
When the auto-suggest scheduler produces a SUMMARIZE suggestion for a Jira ticket
Then the suggestion is created with status=PENDING_APPROVAL
And no execution event fires until a user clicks Approve
```

**Gherkin error path**

```
Given a suggestion is PENDING_APPROVAL and 25 hours have passed
When the expiry sweeper runs
Then the suggestion transitions to EXPIRED
And no execution event fires
And an audit log row records action=SUGGESTION_EXPIRED
```

**Demo (≤30 s)**

1. (5s) Open `/workspace/approvals`
2. (5s) See suggestion card with `riskLabel=LOW`, `matchedPolicy="default-strict-summarize"`
3. (10s) Click Approve → green check + execution event in audit log
4. (5s) Wait 25h on a different suggestion → see EXPIRED badge
5. (5s) Open audit log → row `action=SUGGESTION_EXPIRED`

**Fixtures:** `sample-jira.json` (5 stale tickets), `sample-policies.json`
**DB changes:**

- INSERT into `AiActionApprovalQueue` (status=PENDING_APPROVAL → APPROVED → EXECUTED)
- INSERT into `AuditLog` (3 rows)

---

#### Story 10.2 — Auto-approval under matched policy (F-APPROVE-02)

- **As an** admin
- **I want** suggestions matched by an `AUTO_APPROVE` policy + risk LOW to bypass human review
- **So that** trusted automation runs without manual touch

**Gherkin happy path**

```
Given an AiActionPolicy named "draft-summary-only" with kind=AUTO_APPROVE, riskMaxLabel=LOW, actionKindRegex="^SUMMARIZE$"
And a Jira ticket with 12 comments arrives via webhook
When SuggestionFactory produces a SUMMARIZE suggestion with riskScore=20 (LOW)
Then status transitions PENDING_APPROVAL → APPROVED → EXECUTING → EXECUTED in ≤2 s
And no human action is required
And audit log records action=AUTO_APPROVED with policyId
```

**Gherkin error path**

```
Given the same policy
And a SUMMARIZE suggestion with riskScore=70 (HIGH)
When evaluated
Then policy match fails (risk above max)
And status stays PENDING_APPROVAL
```

**Demo (≤30 s)**

1. (5s) Admin opens `/workspace/automation-settings`
2. (5s) Toggle "Auto-approve SUMMARIZE for internal-only" ON
3. (10s) Trigger a sample Jira summary → returns AUTO_APPROVED in audit log
4. (5s) Trigger a HIGH-risk one → still PENDING_APPROVAL
5. (5s) Verify both audit rows

**Fixtures:** `sample-policies.json` (with `draft-summary-only`), `sample-jira.json`
**DB changes:** `AiActionApprovalQueue` row through 4 statuses; 2 audit rows

---

#### Story 10.3 — CRITICAL-risk denial (F-SAFE-01)

- **As a** customer
- **I want** dangerous suggestions rejected at draft time
- **So that** customer-facing communication is never AI-generated without review

**Gherkin happy path**

```
Given a Gmail message arrives whose draft would target an external domain not in the allowlist
When SuggestionFactory drafts a REPLY action
And the draft contains a credit card pattern detected by PII regex
Then status transitions to DENIED at creation time
And audit log records action=DENIED with reasonCode=PII_DETECTED
And no row exists in execution events
```

**Demo (≤30 s)**

1. (5s) Admin connects test Gmail account with planted external-domain email containing CC#
2. (5s) Trigger inbox scheduler manually
3. (10s) Open audit log → see `DENIED reason=PII_DETECTED`
4. (5s) Approval queue shows nothing for this message
5. (5s) Verify no Gmail draft was created externally

**Fixtures:** `sample-emails.json` (2 with planted PII)
**DB changes:** `AiActionApprovalQueue` (DENIED row); 1 audit row; NO `WorkspaceAction` row

---

#### Story 10.4 — Edit-and-approve (F-APPROVE-03)

- **As a** user
- **I want** to edit an AI draft before approving
- **So that** I correct tone/details without rejecting

**Gherkin happy path**

```
Given a PENDING_APPROVAL Slack reply suggestion with body "Got it, will follow up tomorrow"
When the user clicks Edit, changes body to "Got it. I'll get back to you Monday with details.", and Approves
Then `AiActionApprovalQueue.editedPayload` is set
And `AiActionApprovalQueue.status=APPROVED`
And execution uses the edited body
And audit log records action=EDITED_AND_APPROVED with diff
```

**Demo (≤30 s)**

1. (5s) Open approval card
2. (5s) Click Edit → dialog opens with original draft
3. (10s) Modify text → click Approve
4. (5s) See diff badge "Edited from draft"
5. (5s) Verify Slack message contains the edited text

**Fixtures:** `sample-slack.json`, `sample-policies.json`
**DB changes:** Update queue row (set `editedPayload`, status); audit row with diff

---

#### Story 10.5 — Bulk approve (F-APPROVE-04)

- **As a** PM
- **I want** to select multiple suggestions and approve all at once
- **So that** I can clear my queue in seconds during morning triage

**Gherkin happy path**

```
Given 8 PENDING_APPROVAL suggestions of mixed action kinds
When the user selects 5 (excluding 1 with riskLabel=HIGH and 1 with riskLabel=CRITICAL)
And clicks Bulk Approve
Then each is processed independently through risk gate
And 5 transition APPROVED → EXECUTED
And the unselected 3 remain PENDING_APPROVAL
```

**Gherkin error path**

```
Given the user accidentally includes a CRITICAL suggestion in the selection
When Bulk Approve is clicked
Then the CRITICAL one is rejected from the bulk path with a UI error
And the remaining 4 still process
```

**Demo (≤30 s)**

1. (5s) Open queue with 8 suggestions
2. (5s) Select-all then unselect 2 reds
3. (10s) Click Bulk Approve → progress indicator
4. (5s) See 6 turn green, audit rows
5. (5s) Verify 2 still PENDING

**Fixtures:** mixed sample
**DB changes:** 6 rows updated, 6 audit rows

---

#### Story 10.6 — Reject with required reason (F-APPROVE-05)

- **As a** user rejecting a HIGH-risk suggestion
- **I want** to be required to type a reason
- **So that** the system learns why we rejected it

**Gherkin happy path**

```
Given a HIGH-risk REPLY suggestion
When the user clicks Reject
Then a dialog requires a reason ≥10 chars
And submitting empty/short reason is blocked
And submitting a valid reason transitions to REJECTED with the text saved
And audit log includes the reason
And memory-service receives an event for stream 40 learning
```

**Demo (≤30 s)**

1. (5s) Click Reject on HIGH card
2. (5s) Dialog appears with required text
3. (10s) Try blank → blocked. Type "Wrong customer context" → enabled
4. (5s) Submit → REJECTED badge
5. (5s) Verify audit row + memory event published

**DB changes:** queue row REJECTED + reason; audit row; rabbitmq `ai_action.rejected`

---

#### Story 10.7 — Admin policy CRUD with safe-regex (F-SAFE-07)

- **As an** admin
- **I want** to create AiActionPolicies via REST
- **So that** I customise auto-approval per action class

**Gherkin happy path**

```
Given an admin
When POST /workspace/ai-actions/policies with valid body { name, kind=AUTO_APPROVE, providerRegex="^github$", actionKindRegex="^COMMENT_PR$", riskMaxLabel=LOW }
Then 201 with the policy persisted
And future COMMENT_PR suggestions for github with risk≤LOW auto-approve
```

**Gherkin error path**

```
Given a non-admin user
When POST /workspace/ai-actions/policies
Then 403

Given an admin
When POST with providerRegex containing catastrophic backtracking, e.g., "(a+)+$"
Then 400 with messageKey=POLICY_REGEX_UNSAFE
```

**DB changes:** INSERT into `AiActionPolicy`; reject path → no row

---

#### Story 10.8 — Audit lineage per state transition (F-OBS-01)

- **As an** admin
- **I want** every queue state transition recorded
- **So that** I can audit decisions

**Gherkin happy path**

```
Given any suggestion lifecycle (PENDING → APPROVED → EXECUTING → EXECUTED) or (PENDING → REJECTED)
Then each transition produces exactly one audit log row with userId/policyId/risk fields
```

**DB changes:** Mongo audit DB, `audits` collection, multiple rows per queue id

---

### Stream 11 — Webhook receiver (F-WH-01..09, F-OBS-03)

#### Story 11.1 — GitHub webhook signature verification

- **As a** security operator
- **I want** every webhook validated by HMAC
- **So that** spoofed events are rejected

**Gherkin happy path**

```
Given a connected GitHub connector with secret X
When POST /api/v1/workspace/webhooks/github/<connectorId> with valid X-Hub-Signature-256
Then 200
And `WebhookDelivery` row stored with `signatureValid=true`
And RabbitMQ event `workspace.webhook.received` published
```

**Gherkin error path**

```
When POST with wrong signature
Then 401
And row stored with `signatureValid=false`
And event `workspace.webhook.rejected` published
```

**Demo (≤30 s)**

1. (5s) Connect test GitHub repo with webhook URL
2. (5s) Push a commit
3. (10s) See `WebhookDelivery` row in `/workspace/webhook-deliveries` admin page
4. (5s) Manually replay → second row
5. (5s) Send curl with bad signature → 401, audit row

**DB changes:** INSERT WebhookDelivery; UPDATE WebhookDelivery on replay; audit row

---

#### Story 11.2 — Replay protection

- **As a** security operator
- **I want** duplicate delivery IDs ignored
- **So that** retries don't double-fire

**Gherkin happy path**

```
Given GitHub webhook with deliveryId="abc-123"
When the same delivery arrives twice within REPLAY_WINDOW_MINUTES
Then second response is 200 (idempotent)
But only one `workspace.webhook.received` event fires
```

**DB changes:** 1 row WebhookDelivery; second insert is skipped

---

#### Story 11.3 — Body size cap

```
When body > WEBHOOK_BODY_MAX_BYTES (1MB default)
Then 413 with messageKey=WEBHOOK_BODY_TOO_LARGE
And no row stored
```

---

#### Story 11.4 — Per-connector rate limit

```
When >60 webhooks/min for the same (provider, connectorId)
Then HTTP 429
And no event published
```

---

#### Story 11.5 — Admin replay UI

```
When admin clicks Replay on a stored delivery
Then a fresh `workspace.webhook.replayed` event fires
And new `WebhookDelivery.processedAt` is set
```

---

### Stream 12 — Auto-suggest scheduler (F-001, F-002, F-010..F-014, F-020, F-030..F-032, F-052, F-053)

#### Story 12.1 — Cron tick + advisory lock

- **As an** admin
- **I want** scheduler ticks deduped across replicas
- **So that** running 2 workspace-service containers doesn't double-fire

**Gherkin happy path**

```
Given two workspace-service containers
When AUTO_SUGGEST_INBOX_CRON fires at 00:00
Then exactly one container acquires the advisory lock
And exactly one set of `workspace.auto_suggest.tick.*` events publishes
```

**DB changes:** AutoSuggestRun rows distinct; advisory lock contended

---

#### Story 12.2 — Inbox reply suggestion (F-001)

- **As an** exec
- **I want** Gmail messages I haven't replied to in 24h to get reply drafts

**Gherkin happy path**

```
Given a Gmail message older than 24h with no draft sent
When the inbox cron runs
Then a SUMMARIZE-or-DRAFT_REPLY suggestion enters the queue
And queue includes link to source message
And risk-classifier marks as MED if external domain
```

**Demo (≤30 s)**

1. (5s) Connect test Gmail
2. (5s) Wait/trigger scheduler
3. (10s) See queue card for unanswered email
4. (5s) "Why this?" panel shows source message + reason "no reply >24h"
5. (5s) Approve → see Gmail draft saved (or sent per policy)

---

#### Story 12.3 — Jira ticket auto-summary (F-010)

```
Given a Jira ticket with >10 comments and no AI summary in last 7 days
When jira-summary cron runs
Then a SUMMARIZE suggestion enters queue
And SuggestionDeduplication prevents re-suggestion within 7 days
```

---

#### Story 12.4 — Stale-PR nudge (F-030)

```
Given a GitHub PR with no activity for 7+ days
When github-stale-pr cron runs
Then an ADD_PR_COMMENT suggestion is drafted with body "<polite nudge>"
And risk=LOW (informational nudge)
And user can Approve to post the comment
```

---

#### Story 12.5 — Manual scheduler trigger (admin)

```
Given an admin
When POST /workspace/auto-suggest/jobs/INBOX/trigger-now
Then job runs immediately (independent of cron)
And admin sees AutoSuggestRun row with status=COMPLETED
```

---

#### Story 12.6 — Per-user budget enforcement

```
Given user has SUGGESTION_FACTORY_PER_EVENT_TYPE_BUDGET=10/day
And 10 suggestions already created today for action-class SUMMARIZE
When the 11th would draft
Then it is suppressed
And audit row records BUDGET_EXCEEDED
And user banner appears
```

---

### Stream 13 — Event automation engine / SuggestionFactory

#### Story 13.1 — Single entry-point pipeline

```
Given a webhook event `workspace.webhook.received` for GitHub PR opened with >500 LOC
When SuggestionFactory.process is called (via consumer)
Then a SUMMARIZE_PR suggestion enters queue
And the matched SuggestionTriggerRule.id is recorded on the queue row
```

---

#### Story 13.2 — Trigger-rule disabled = no suggestion

```
Given the trigger rule for "PR with >500 LOC opens" is set isActive=false
When the same webhook arrives
Then no suggestion enters queue
And SuggestionFactory log shows skip reason
```

---

#### Story 13.3 — Per-event-type budget

```
Given an event type has its sub-cap (e.g., 5 suggestions per user per day from "stale-pr" job)
When 5 already produced today for user
Then 6th is suppressed even if user-wide budget allows
```

---

### Stream 20 — GitLab + Bitbucket writes

#### Story 20.1 — GitLab MR comment via approve flow

```
Given a GitLab stale-MR nudge in PENDING_APPROVAL
When user approves
Then `gitlab.adapter.executeWriteAction("CREATE_MR_COMMENT", payload)` runs
And `WorkspaceAction.status=EXECUTED`
And the comment appears on GitLab MR (verified via API GET)
```

---

#### Story 20.2 — Bitbucket PR comment

Same shape on Bitbucket.

---

#### Story 20.3 — Approval rejected = no external write

```
Given a write action in PENDING_APPROVAL
When user Rejects
Then no GitLab/Bitbucket API call fires
And queue row REJECTED
```

---

#### Story 20.4 — Provider error → user-visible failure state

```
Given GitLab returns 500 during executeWriteAction
When the queue row was approved
Then status=FAILED with errorMessage
And UI shows red X with Retry button
And no infinite spinner
```

---

### Stream 21 — OneDrive + SharePoint + ClickUp writes

#### Story 21.1 — OneDrive upload <4MB

```
Given an approved UPLOAD_ONEDRIVE suggestion with file <4MB
When executed
Then file appears in OneDrive folder via Microsoft Graph
```

---

#### Story 21.2 — SharePoint list-item create

```
Given approved CREATE_SHAREPOINT_LIST_ITEM
When executed
Then row inserted in target list
```

---

#### Story 21.3 — ClickUp task create from Slack mention

```
Given a Slack message webhook with @-mention "create-task"
When SuggestionFactory matches the trigger rule
And user approves the resulting CREATE_CLICKUP_TASK
Then ClickUp task created with body referencing source Slack thread
```

---

### Stream 22 — Gmail attachments + HTML

#### Story 22.1 — Safe HTML rendering

```
Given Gmail message with HTML body containing <script> and tracking pixel
When user opens the message
Then iframe sandbox renders sanitised HTML
And no <script> executes (verify via test)
And remote images are hidden behind a "Load images" toggle
```

---

#### Story 22.2 — Attachment download with antivirus

```
Given Gmail attachment of size 1.2MB (PDF)
When user clicks Download
Then file scanned by ClamAV, magic-byte verified
And file streamed to user
And audit row records DOWNLOAD
```

**Gherkin error path**

```
Given a planted EICAR test virus attachment
When download requested
Then 422 with messageKey=ATTACHMENT_INFECTED
```

---

#### Story 22.3 — Attachment text into search index

```
Given a PDF attachment
When ingested
Then text extracted (file-service text-extract)
And searchable via stream 30's semantic search
```

---

#### Story 22.4 — Polyglot attachment rejection

```
Given an .exe.pdf double-extension attachment
When user attempts download
Then 422 with messageKey=ATTACHMENT_FORBIDDEN
```

---

#### Story 22.5 — XSS attempt in HTML body

```
Given an email with `<img src=x onerror=alert(1)>`
When rendered
Then onerror is stripped server-side via DOMPurify
And iframe sandbox prevents any execution
```

---

### Stream 23 — Calendar + meeting notes

#### Story 23.1 — Connect Calendar + see upcoming meetings

```
Given user OAuths Google Calendar
When connector syncs
Then upcoming meetings list page shows ≥1 meeting
And `WorkspaceObjectType=MEETING` rows exist
```

---

#### Story 23.2 — Post-meeting summary draft

```
Given a meeting that ended 5 minutes ago
When MEETING_NOTES_SCAN cron runs
Then a SUMMARIZE suggestion enters queue with attendees + topic
And privacyClass=INTERNAL by default
And routes to local-only LLM unless explicit cloud policy
```

---

#### Story 23.3 — Action item extraction

```
Given a meeting with a transcript file linked
When EXTRACT_ACTION_ITEMS runs
Then suggestions in queue are CREATE_TICKET / CREATE_CLICKUP_TASK candidates
And each links to the transcript line that proposed it
```

---

#### Story 23.4 — Outlook calendar parity

Same as 23.1-23.3 on Outlook Calendar.

---

### Stream 30 — Unified inbox + semantic search

#### Story 30.1 — Cross-provider inbox

```
Given user has Gmail + Jira + Slack connected
When opening /workspace/inbox
Then ≥1 item from each provider visible
And items sortable by lastActivityAt
And paginated (cursor-based)
```

---

#### Story 30.2 — Filter "needs-attention"

```
When filter "has-suggestion" applied
Then only items with a PENDING_APPROVAL suggestion reference appear
```

---

#### Story 30.3 — Natural-language search

```
Given user types "budget Q2 last week"
When local Ollama rewrites to filter+semantic terms
And memory-service /embed-search returns top-K
Then ranked results render
And full search query NEVER appears in service logs (pino redact)
```

---

#### Story 30.4 — Search across attachments

```
Given attachments indexed (story 22.3)
When searching for content known to be in PDF
Then PDF appears in results
```

---

### Stream 31 — Digest dashboard

#### Story 31.1 — Daily morning brief

```
Given a user with delivery time 9am UTC
When daily cron runs at 9am for that user
Then DigestSnapshot row stored
And dashboard shows 4 sections (Email/Jira/Slack/GitHub) each with 3-bullet summary
And each section has clickable action items
```

---

#### Story 31.2 — Weekly Friday recap

```
Given user has weekly delivery preference Friday 4pm
When weekly cron runs Friday 4pm
Then weekly DigestSnapshot inserted with rolled-up content
```

---

#### Story 31.3 — Action items become suggestions

```
Given digest produces 3 action items
When user clicks "Convert to suggestions"
Then 3 PENDING_APPROVAL queue rows created
```

---

#### Story 31.4 — Drill-down to source

```
Given a digest bullet referencing a Jira ticket
When user clicks the bullet
Then the source Jira ticket opens in a panel
```

---

### Stream 32 — Auto-action settings

#### Story 32.1 — Admin policy editor

```
Given admin user
When opening /workspace/automation-settings/policies
Then list of policies renders with edit/delete buttons
And edit dialog uses Zod-validated form
```

---

#### Story 32.2 — Per-user opt-in toggle

```
Given a non-admin user
When toggling "auto-suggest SUMMARIZE = off"
Then UserAutomationPreference row updated
And future cron skips this user for SUMMARIZE
```

---

#### Story 32.3 — Per-class threshold

```
Given a user setting auto-approve threshold = LOW for SUMMARIZE
When suggestion produced with risk=MED
Then it stays PENDING_APPROVAL even if global policy says AUTO_APPROVE up to MED
And UI shows "Your settings are stricter than global"
```

---

#### Story 32.4 — Per-provider kill switch

```
Given an admin
When clicking "Disable all automation for Gmail"
Then ALL Gmail-related auto-suggest jobs paused
And admin sees confirmation
And user banner shows "Gmail automation paused"
```

---

### Stream 40 — Memory learning loop

#### Story 40.1 — Approval feeds PREFERENCE

```
Given user edits 3 Slack drafts to be shorter
When 4th similar draft is produced
Then prompt construction includes the top PREFERENCE memory
And resulting draft is shorter than baseline (verified by length test)
```

---

#### Story 40.2 — Reject feeds NEGATIVE-PREFERENCE

```
Given user rejects 2 auto-replies to a specific external domain
When subsequent auto-reply targets the same domain
Then it is suppressed (or downgraded to PENDING_APPROVAL even if policy says AUTO_APPROVE)
```

---

#### Story 40.3 — "What we've learned" page

```
When user opens /workspace/learning
Then accumulated PREFERENCEs render with category, count, "forget" buttons
And user can Forget any memory
And forgotten memories are removed from prompt construction
```

---

### Stream 41 — Ticket planning + coding bridge

#### Story 41.1 — DECOMPOSE EPIC into subtasks

```
Given a Jira EPIC ticket
When user clicks "Plan & Decompose"
Then DECOMPOSE produces ≤12 ordered subtasks with t-shirt sizes + dependencies
And queue shows the parent + children grouped
```

---

#### Story 41.2 — ESTIMATE auto-approves at LOW

```
Given an ESTIMATE action with risk=LOW
And policy "auto-approve estimates" enabled
Then it auto-approves without human action
And the ticket is updated externally with the estimate
```

---

#### Story 41.3 — IMPL_PROMPT NEVER auto-approves

```
Given any IMPL_PROMPT action regardless of risk
Then it ALWAYS stays PENDING_APPROVAL
And policy AUTO_APPROVE is ignored for this kind
And test-fixture verifies the gate
```

---

#### Story 41.4 — Handoff CHAT — seed thread

```
Given an approved IMPL_PROMPT
When user clicks "Send to Chat"
Then chat-service POST /chat-threads called
And new thread shows up in /chat with initial system + user messages pre-seeded
And handoff history page records DELIVERED
```

---

#### Story 41.5 — Handoff AGENT — double-gated

```
Given an approved IMPL_PROMPT with paired Device
When user clicks "Send to Agent"
Then agent-service TerminalCommand created in PENDING_APPROVAL
And agent's own approval queue holds it
And only AFTER agent reviewer approves does the terminal session start
```

**Gherkin error path**

```
Given no paired Device
When user clicks "Send to Agent"
Then 409 NO_ACTIVE_AGENT_DEVICE
And UI shows "Pair an agent device first"
```

---

#### Story 41.6 — Handoff CLIPBOARD

```
When user clicks "Copy brief"
Then brief copied to clipboard
And handoff row only marked DELIVERED upon client-side confirmation
```

---

#### Story 41.7 — Handoff failure auto-fallback

```
Given Handoff AGENT mode selected
And agent-service is unhealthy
When handoff attempted
Then auto-fallback to CHAT mode
And UI banner explains fallback
```

---

#### Story 41.8 — Secret-pattern detection on IMPL_PROMPT

```
Given an IMPL_PROMPT body contains "AKIA1234567890ABCDEF" (AWS key pattern)
When handoff initiated
Then the action is DENIED with messageKey=SECRET_DETECTED
And no thread/terminal/clipboard receives it
```

---

## Stream-by-stream story count

| Stream    | Stories produced | Target (per prompt 02) | Met? |
| --------- | ---------------- | ---------------------- | ---- |
| 10        | 8                | 6-8                    | ✅   |
| 11        | 5                | 4-5                    | ✅   |
| 12        | 6                | 5-6                    | ✅   |
| 13        | 3                | 3-4                    | ✅   |
| 20        | 4                | 4                      | ✅   |
| 21        | 3                | 3                      | ✅   |
| 22        | 5                | 5                      | ✅   |
| 23        | 4                | 4                      | ✅   |
| 30        | 4                | 4                      | ✅   |
| 31        | 4                | 4                      | ✅   |
| 32        | 4                | 4                      | ✅   |
| 40        | 3                | 3                      | ✅   |
| 41        | 8                | (added)                | ✅   |
| **Total** | **61**           | **40-60**              | ✅   |

---

## Cross-cutting acceptance (every stream)

Beyond per-story Gherkin, every stream MUST also satisfy:

- All new UI text exists in 9 i18n locales (en, ar, de, es, fr, hi, it, pt, ru)
- Dark mode visually correct (no white flashes, contrast OK)
- RTL Arabic mirrors layout correctly
- Mobile 375×812 responsive
- Keyboard navigable
- Screen-reader labels on icon-only buttons
- 0 console errors in browser DevTools
- 0 `UnhandledPromiseRejection|FATAL|Cannot read properties of undefined` in `docker compose logs`

---

## Demo script template (used by UAT lead with real client)

Every story above conforms to this 30-second template:

```
1. (5s)  Open <URL>
2. (5s)  Click <element> → expect <visual change>
3. (10s) Walk through happy-path action
4. (5s)  Verify observable outcome (UI badge, audit row, external system change)
5. (5s)  Open log/db dashboard → verify audit trail
```

If demo > 30 s, story is too big — split it.

---

## UAT execution rounds

Stream 50 maintains `docs/10-uat-acceptance/workspace-automation-uat-execution-log.md` with:

- Date of each round
- Tester (UAT Lead + 1 non-technical reviewer)
- Per-story result: PASS / FAIL / NOT-RUN
- Defects opened
- Notes

Release readiness requires 7 consecutive days of all-PASS execution rounds.
