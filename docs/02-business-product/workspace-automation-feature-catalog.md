# ClawAI Workspace Automation — Feature Catalog

**Status:** Canonical reference. Every implementation stream cites feature IDs from this doc.
**Companion docs:** `workspace-automation-vision.md`, `../10-uat-acceptance/workspace-automation-uat.md`
**Date:** 2026-04-26

---

## How to read this catalog

Every row has 13 fields:

| Field | Meaning |
|---|---|
| `ID` | Stable identifier; cited by stream prompts and UAT stories |
| `Name` | Short title |
| `Stream` | Which implementation stream delivers it |
| `Provider` | Which workspace integration (or "all"/"core") |
| `User Story` | One-sentence "as-a / I-want / so-that" |
| `Persona` | P1 / P2 / P3 / Admin / All |
| `Sensitivity` | Low / Med / High (PII / source / financial) |
| `Blast Radius` | Internal / Customer-facing / External |
| `MoSCoW` | Must / Should / Could / Won't (v1) |
| `Effort` | S (≤1d) / M (1-2d) / L (2-4d) / XL (≥5d) |
| `Reuse vs New` | Concretely names existing infra reused vs new built |
| `Demo Script` | ≤30s walkthrough |
| `Notes / Depends on` | Dependencies + edge cases |

Personas: P1 = IC engineer, P2 = Tech PM, P3 = Founder/Exec. Defined in `workspace-automation-vision.md`.

---

## A. Suggestion-engine features

### A.1 Reply drafts

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo (≤30s) | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-001 | Inbox reply suggestion | 12 | Gmail | "As an exec, I want one-click reply drafts" | P3 | High | Customer | Must | M | Reuse AiAction + new scheduler | Connect Gmail → wait ≤6h → see ≥1 reply suggestion in queue → approve | Default domain allowlist; depends on F-100 (policy engine) |
| F-002 | Slack DM reply suggestion | 12 | Slack | "As an IC, I want reply drafts for my DMs" | P1 | Med | Internal | Must | M | Reuse | DM arrives → ≤30s suggestion in queue | Webhook-driven (stream 11) |
| F-003 | Slack channel @mention reply | 12 | Slack | "As anyone, I want auto-reply suggestion when @mentioned" | All | Med | Internal | Should | M | Reuse | @mention → suggestion appears | |

### A.2 Ticket / issue summaries

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-010 | Jira ticket auto-summary | 12 | Jira | "As a PM, I want every >10-comment ticket summarised" | P2, P1 | Med | Internal | Must | S | Reuse AiAction | Open ticket with 12 comments → see AI-summary in approval queue | Nightly cron + webhook trigger |
| F-011 | GitHub Issue summary | 12 | GitHub | "As an IC, I want long GitHub Issues summarised" | P1 | Med | Internal | Must | S | Reuse | Open issue with 15 comments → summary appears | |
| F-012 | GitLab Issue summary | 12 | GitLab | "As an IC on GitLab, I want issue summaries" | P1 | Med | Internal | Must | S | Reuse | Same as F-011 on GitLab | |
| F-013 | Bitbucket Issue summary | 12 | Bitbucket | "As an IC on Bitbucket, I want issue summaries" | P1 | Med | Internal | Should | S | Reuse | Same on Bitbucket | |
| F-014 | ClickUp task summary | 12 | ClickUp | "As a PM on ClickUp, I want task summaries" | P2 | Med | Internal | Should | S | Reuse | Same on ClickUp | |
| F-015 | Confluence page summary | 12 | Confluence | "As a PM, long pages summarised" | P2 | Med | Internal | Could | S | Reuse | Page >2000 words → summary | |

### A.3 Status update drafts

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-020 | Slack status update draft | 12 | Slack | "As a PM, I want a draft 'this week' update" | P2 | Med | Internal | Must | M | Reuse | Friday 9am → status-update suggestion in queue | Cadence configurable |
| F-021 | Confluence status page draft | 12 | Confluence | "As a TPM, weekly status page draft" | P2 | Med | Internal | Should | M | Reuse | | Stream 32 cadence config |

### A.4 Stale-PR / stale-MR nudges

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-030 | GitHub stale-PR nudge | 12, 20 | GitHub | "As an IC, nudge for PRs >7d idle" | P1 | Low | Internal | Must | S | Reuse + extend GitHub adapter | Open PR aged 9d → nudge suggestion | |
| F-031 | GitLab stale-MR nudge | 12, 20 | GitLab | Same on GitLab | P1 | Low | Internal | Must | S | Stream 20 adds write op | Same | |
| F-032 | Bitbucket stale-PR nudge | 12, 20 | Bitbucket | Same on Bitbucket | P1 | Low | Internal | Should | S | Stream 20 | Same | |

### A.5 Meeting note summaries

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-040 | Calendar event → post-meeting summary | 23 | Calendar | "After my meeting ends, draft a summary" | P3, P2 | High | Internal | Must | L | Stream 23 new adapter + pipeline | End meeting → 5min later see summary draft | |
| F-041 | Drive meeting-notes detector | 23 | Drive | "Detect Drive doc as meeting notes, summarise" | P2 | High | Internal | Must | M | Stream 23 | Upload "meeting-notes.md" to watched folder → summary | |
| F-042 | Gmail attachment as meeting transcript | 22, 23 | Gmail | "Email contains transcript .vtt → summarise" | P3 | High | Customer | Should | M | Stream 22 attachments + 23 detector | | |
| F-043 | Slack huddle recording → summary | 12, 23 | Slack | "Slack huddle recording link → summarise" | P1 | Med | Internal | Could | M | | | Slack API limitation in v1 |

### A.6 Digests

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-050 | Cross-provider daily digest | 31 | All | "As an exec, give me my morning brief" | P3, P2 | High | Internal | Must | L | Stream 31 new | 9am → dashboard shows 4 sections + action items | |
| F-051 | Weekly Friday recap | 31 | All | "Friday 4pm summary of my week" | P2, P3 | High | Internal | Must | L | Stream 31 | | |
| F-052 | Per-channel Slack digest | 12 | Slack | "Daily summary for noisy channels" | P1, P2 | Med | Internal | Should | M | Reuse | | |
| F-053 | Email digest (folder/thread) | 12 | Gmail | "Daily summary of new emails" | P3 | High | Customer | Should | M | Reuse | | |

---

## B. Write-action features

Existing write actions (for context, not delivered by this initiative):

| ID | Name | Provider | Status |
|---|---|---|---|
| F-DONE-01 | GitHub: create issue | GitHub | DONE |
| F-DONE-02 | GitHub: comment issue | GitHub | DONE |
| F-DONE-03 | GitHub: comment PR | GitHub | DONE |
| F-DONE-04 | GitHub: approve PR | GitHub | DONE |
| F-DONE-05 | GitHub: update PR description | GitHub | DONE |
| F-DONE-06 | GitHub: close issue | GitHub | DONE |
| F-DONE-07 | Slack: send message | Slack | DONE |
| F-DONE-08 | Slack: add reaction | Slack | DONE |
| F-DONE-09 | Jira: create issue | Jira | DONE |
| F-DONE-10 | Jira: comment | Jira | DONE |
| F-DONE-11 | Jira: transition status | Jira | DONE |
| F-DONE-12 | Jira: assign | Jira | DONE |
| F-DONE-13 | Confluence: create page | Confluence | DONE |
| F-DONE-14 | Confluence: append section | Confluence | DONE |
| F-DONE-15 | Gmail: send email | Gmail | DONE |
| F-DONE-16 | Gmail: reply | Gmail | DONE |
| F-DONE-17 | Drive: upload | Drive | DONE |
| F-DONE-18 | Drive: comment | Drive | DONE |
| F-DONE-19 | Figma: comment | Figma | DONE |
| F-DONE-20 | Figma: copy frame to library | Figma | DONE |
| F-DONE-21 | Figma: create component | Figma | DONE |

### B.1 New write actions — GitLab + Bitbucket (stream 20)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-GITLAB-01 | GitLab: create MR comment | 20 | GitLab | | P1 | Low | Internal | Must | S | Extend gitlab.adapter.ts | Approve nudge → comment appears | |
| F-GITLAB-02 | GitLab: approve MR | 20 | GitLab | | P1 | Med | Internal | Must | S | Same | | |
| F-GITLAB-03 | GitLab: create issue | 20 | GitLab | | P1 | Low | Internal | Must | S | Same | | |
| F-GITLAB-04 | GitLab: comment issue | 20 | GitLab | | P1 | Low | Internal | Must | S | Same | | |
| F-GITLAB-05 | GitLab: update MR description | 20 | GitLab | | P1 | Med | Internal | Should | S | Same | | |
| F-BITBUCKET-01 | Bitbucket: create PR comment | 20 | Bitbucket | | P1 | Low | Internal | Must | S | Extend bitbucket.adapter.ts | | |
| F-BITBUCKET-02 | Bitbucket: approve PR | 20 | Bitbucket | | P1 | Med | Internal | Must | S | Same | | |
| F-BITBUCKET-03 | Bitbucket: create issue | 20 | Bitbucket | | P1 | Low | Internal | Should | S | Same | | |

### B.2 New write actions — OneDrive + SharePoint + ClickUp (stream 21)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-OD-01 | OneDrive: upload file | 21 | OneDrive | | P3, P2 | High | Customer | Must | M | Extend onedrive.adapter.ts | | <4MB only in v1 |
| F-OD-02 | OneDrive: move file | 21 | OneDrive | | P3 | Med | Internal | Should | S | Same | | |
| F-SP-01 | SharePoint: upload | 21 | SharePoint | | P2 | Med | Internal | Must | M | Extend sharepoint.adapter.ts | | <4MB only |
| F-SP-02 | SharePoint: create list item | 21 | SharePoint | | P2 | Med | Internal | Must | M | Same | | |
| F-SP-03 | SharePoint: update list item | 21 | SharePoint | | P2 | Med | Internal | Should | M | Same | | |
| F-CU-01 | ClickUp: create task | 21 | ClickUp | | P2 | Low | Internal | Must | S | Extend clickup.adapter.ts | | |
| F-CU-02 | ClickUp: update task | 21 | ClickUp | | P2 | Low | Internal | Must | S | Same | | |
| F-CU-03 | ClickUp: comment task | 21 | ClickUp | | P2 | Low | Internal | Should | S | Same | | |

### B.3 New write actions — Calendar (stream 23)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-CAL-W-01 | Calendar: create event | 23 | Calendar | | P3, P2 | High | Customer | Must | M | New adapter | | Both Google + Outlook |
| F-CAL-W-02 | Calendar: update event | 23 | Calendar | | P3 | Med | Customer | Should | M | Same | | |
| F-CAL-W-03 | Calendar: send invite | 23 | Calendar | | P3 | High | Customer | Must | M | Same | | |
| F-CAL-W-04 | Calendar: respond to invite | 23 | Calendar | | P3 | Low | Internal | Should | S | Same | | |

---

## C. Webhook ingest features (stream 11)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-WH-01 | GitHub webhook ingest | 11 | GitHub | "Real-time PR/issue events" | P1 | Med | Internal | Must | M | New universal endpoint | Push commit → 5s suggestion | HMAC verify |
| F-WH-02 | GitLab webhook ingest | 11 | GitLab | Same | P1 | Med | Internal | Must | M | Same | | |
| F-WH-03 | Bitbucket webhook ingest | 11 | Bitbucket | Same | P1 | Med | Internal | Should | M | Same | | |
| F-WH-04 | Slack events ingest | 11 | Slack | Real-time DMs/mentions | All | Med | Internal | Must | M | Same | | |
| F-WH-05 | Jira webhook ingest | 11 | Jira | Real-time tickets | P1, P2 | Med | Internal | Must | M | Same | | |
| F-WH-06 | Figma webhook ingest | 11 | Figma | Real-time comments | P2 | Low | Internal | Should | M | Same | | |
| F-WH-07 | OneDrive subscription | 11 | OneDrive | MS Graph subscription | P3 | High | Customer | Should | L | New: subscription model | | Manual refresh in v1 |
| F-WH-08 | SharePoint subscription | 11 | SharePoint | MS Graph subscription | P2 | Med | Internal | Should | L | Same | | |
| F-WH-09 | Universal webhook replay | 11 | All | "Admin replays a delivery" | Admin | Low | Internal | Must | S | Same endpoint | | |
| F-WH-10 | Webhook delivery log UI | 11 | All | "Admin sees deliveries + signature status" | Admin | Low | Internal | Must | M | New page | | |

---

## D. UX features

### D.1 Approval inbox extensions (stream 10)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-APPROVE-01 | Approval queue page | n/a | All | "I see pending suggestions" | All | Low | Internal | DONE | n/a | Existing | | |
| F-APPROVE-02 | Show riskLabel + matchedPolicy | 10 | All | | All | Low | Internal | Must | S | Extend approval-card.tsx | Card shows "LOW + draft-summary-only" | |
| F-APPROVE-03 | Edit-and-approve dialog | 10 | All | "Edit text before approving" | All | Med | Customer | Must | M | Extend | | |
| F-APPROVE-04 | Bulk approve selection | 10 | All | "Approve N at once" | P2 | Med | Internal | Must | M | Extend | Select 5 → "Approve all" | Each still goes through risk gate |
| F-APPROVE-05 | Reject with required reason | 10 | All | "Reject + explain" | All | Low | Internal | Must | S | Extend | Required text on HIGH+ | |
| F-APPROVE-06 | Per-suggestion "why this?" | 10 | All | "Why was this drafted?" | All | Low | Internal | Should | S | Extend | Click → see source object link + trigger rule | v1 = 1-line; v2 = full lineage |
| F-APPROVE-07 | Filter queue by provider/kind/risk/age | 10 | All | "Filter the queue" | All | Low | Internal | Must | S | Extend | | |
| F-APPROVE-08 | Keyboard shortcuts in queue | 10 | All | "j/k to navigate, a/r to approve/reject" | P1 | Low | Internal | Should | S | Extend | | |
| F-APPROVE-09 | Diff view for edit-and-approve audit | 10 | All | "What did I change vs draft" | All | Low | Internal | Should | M | Extend | | |
| F-APPROVE-10 | Expired badge (24h auto-expire) | 10 | All | | All | Low | Internal | Must | S | Cron sweep | | |

### D.2 Unified inbox + search (stream 30)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-INBOX-01 | Cross-provider unified inbox | 30 | All | "One screen for everything that needs my attention" | All | Med | Internal | Must | L | New page; reuses WorkspaceObject | Open inbox → see Gmail/Jira/Slack mixed | Server-paginated |
| F-INBOX-02 | Filter "needs-attention / has-suggestion" | 30 | All | | All | Low | Internal | Must | S | New | | |
| F-INBOX-03 | Filter by provider / time / unread | 30 | All | | All | Low | Internal | Must | S | New | | |
| F-INBOX-04 | Cross-provider semantic search | 30 | All | "Search 'budget Q2' across apps" | All | Med | Internal | Must | L | New + memory-service pgvector | Type query → ranked results | |
| F-INBOX-05 | Natural-language → filter (Ollama-rewrite) | 30 | All | "'emails about budget last week'" | P3 | Low | Internal | Should | M | New + local Ollama | | Privacy-tagged → never cloud |

### D.3 Digest dashboard (stream 31)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-DIGEST-01 | Daily morning brief dashboard | 31 | All | "8am brief w/ coffee" | P3, P2 | High | Internal | Must | L | New | | |
| F-DIGEST-02 | Weekly Friday recap | 31 | All | "Week recap" | P2, P3 | High | Internal | Must | M | New | | |
| F-DIGEST-03 | Action items become approval suggestions | 31 | All | "Action items I can approve" | All | Med | Internal | Must | M | Reuse approval queue | | |
| F-DIGEST-04 | Per-section drill-down to source | 31 | All | "Click bullet → source object" | All | Low | Internal | Should | S | New | | |

### D.4 Settings (stream 32)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-SETTINGS-01 | Admin policy CRUD UI | 32 | All | "Edit AiActionPolicies" | Admin | Low | Internal | Must | M | New + reuse stream 10 endpoints | | |
| F-SETTINGS-02 | Per-user automation toggle | 32 | All | "Disable auto-suggest for SUMMARIZE" | All | Low | Internal | Must | M | New | | |
| F-SETTINGS-03 | Per-class auto-approve threshold | 32 | All | "AUTO_APPROVE only for LOW" | Admin | Med | Internal | Must | M | New | | |
| F-SETTINGS-04 | Cadence config per job | 32 | All | "Inbox scan = every 2h" | All | Low | Internal | Should | S | New | | |
| F-SETTINGS-05 | Trigger rule editor | 32 | All | "Add a rule for >500 LOC PRs" | Admin | Med | Internal | Should | L | New + reuse stream 13 endpoints | | |

### D.5 Email viewer (stream 22)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-GMAIL-01 | HTML email rendering (sandboxed iframe) | 22 | Gmail | "See email as designed" | P3 | High | Customer | Must | L | New + DOMPurify wrapper | | sandbox=allow-same-origin only |
| F-GMAIL-02 | Remote-image hide-by-default | 22 | Gmail | "No tracking pixels" | P3 | High | Customer | Must | M | New | | v2 = full proxy |
| F-GMAIL-03 | Attachment list view | 22 | Gmail | "See attachments" | P3 | High | Customer | Must | M | New + file-service internal upload | | |
| F-GMAIL-04 | Attachment download | 22 | Gmail | "Download" | P3 | High | Customer | Must | M | Same | | ClamAV scan + magic-byte gate |
| F-GMAIL-05 | Attachment text into search index | 22 | Gmail | "Search inside attachments" | P2, P3 | Med | Internal | Should | M | Same + file-service text extract | | |
| F-GMAIL-06 | Inline-attachment preview | 22 | Gmail | "Preview PDF/image without download" | P3 | High | Customer | Should | M | New | | |

### D.6 Calendar UI (stream 23)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-CAL-UI-01 | Upcoming meetings list | 23 | Calendar | "See today's meetings" | P3, P2 | Med | Internal | Must | M | New | | |
| F-CAL-UI-02 | Meeting prep panel (related objects) | 23 | Calendar | "Pre-meeting context" | P2, P3 | Med | Internal | Should | M | New + cross-provider link | | |
| F-CAL-UI-03 | Post-meeting summary card in inbox | 23 | Calendar | | P2, P3 | Med | Internal | Must | M | New | | |

---

## E. Intelligence features

### E.1 Memory learning (stream 40)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-LEARN-01 | Approve/edit feeds PREFERENCE | 40 | All | "System learns my style" | All | High | Internal | Must | L | New consumer + memory-service | Edit 3 drafts shorter → 4th draft is shorter | per-user only |
| F-LEARN-02 | Reject feeds NEGATIVE-PREFERENCE | 40 | All | "System learns to skip VIPs" | All | High | Internal | Must | M | Same | | |
| F-LEARN-03 | Suggestion factory uses top-N memories | 40 | All | "Personalised prompts" | All | Med | Internal | Must | M | Reuse memory + factory | | |
| F-LEARN-04 | "What we've learned about you" UI | 40 | All | "See accumulated PREFERENCEs" | All | High | Internal | Should | M | New page | | |
| F-LEARN-05 | Auto-promote AUTO_APPROVE on >95% history | 40 | All | "Stable approvals → auto" | Admin | Med | Internal | Could | M | New | | Admin opt-in only |

### E.2 Ticket-planning + coding bridge (stream 41)

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-PLAN-01 | PLAN action — structured plan | 41 | Jira/GH/GL/CU | "PLAN this ticket" | P2, P1 | Med | Internal | Must | M | New action kind | Click → plan with goal + risks | |
| F-PLAN-02 | DECOMPOSE — subtasks ordered, max 12 | 41 | Same | "Break this EPIC down" | P2 | Med | Internal | Must | L | New action kind | | t-shirt sizes + deps |
| F-PLAN-03 | ESTIMATE — t-shirt + hours + confidence | 41 | Same | "Estimate this ticket" | P2 | Low | Internal | Must | M | New action kind | | LOW-risk auto-approves |
| F-PLAN-04 | IMPL_PROMPT — coding brief | 41 | Same | "Make this dev-ready" | P1 | Med | Internal | Must | L | New action kind | | NEVER auto-approves |
| F-PLAN-05 | Bulk "Approve all subtasks" | 41 | Same | "Approve in bulk" | P2 | Med | Internal | Must | M | Reuse F-APPROVE-04 | Approved subtasks → CREATE_TICKET queue | |
| F-PLAN-06 | Auto-decompose on EPIC/Story creation | 41 | Same | "Webhook → auto-decompose" | P2 | Med | Internal | Should | M | Webhook + factory | | Stream 11 dependency |
| F-PLAN-07 | Suggest IMPL_PROMPT for ready tickets | 41 | Same | "Approved subtasks → impl prompt" | P1 | Low | Internal | Should | M | Scheduler + factory | | |
| F-PLAN-08 | Handoff CHAT — seed chat thread | 41 | Same | "Send to chat" | P1 | Med | Internal | Must | M | Reuse chat-service POST /chat-threads | Click → chat thread opens with brief loaded | |
| F-PLAN-09 | Handoff AGENT — seed agent terminal | 41 | Same | "Send to agent" | P1 | High | Internal | Must | L | Reuse agent-service TerminalCommand | Double-gated: queue approve + agent approve | |
| F-PLAN-10 | Handoff CLIPBOARD — copy brief | 41 | Same | "Copy to use elsewhere" | P1 | Low | Internal | Should | S | New | | DELIVERED only on client confirm |
| F-PLAN-11 | Handoff history page | 41 | Same | "What I've sent where" | P1 | Low | Internal | Must | M | New | | |
| F-PLAN-12 | Handoff failure auto-fallback | 41 | Same | "Agent down → fall back to chat" | P1 | Low | Internal | Should | M | New | | |
| F-PLAN-13 | Secret-pattern detection on IMPL_PROMPT body | 41 | Same | "No leaking secrets to agent" | All | High | Customer | Must | M | Reuse detection | | DENIED if leaked |

---

## F. Compliance / safety features

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-SAFE-01 | PII detector on suggestions (block at draft) | 10 | All | "No suggestions with leaking PII" | All | High | Customer | Must | M | New regex set | Draft contains email of customer → DENIED | Independent of policy |
| F-SAFE-02 | Domain allowlist for auto-reply | 10, 32 | Gmail | "Only auto-reply to internal domains" | Admin | High | Customer | Must | M | New + policy | | |
| F-SAFE-03 | Per-user per-action-class rate limit | 13 | All | "Cap suggestions per day per kind" | All | Low | Internal | Must | S | New | | |
| F-SAFE-04 | Per-provider kill switch | 32 | All | "Disable all automation for Gmail right now" | Admin | Low | Internal | Must | S | New | | |
| F-SAFE-05 | Per-user automation budget | 13 | All | "Max 50 suggestions per day total" | All | Low | Internal | Must | S | New | | |
| F-SAFE-06 | Default-strict 13 policies seeded | 10 | All | "Safe defaults on first install" | Admin | Low | Internal | Must | S | New | | Idempotent |
| F-SAFE-07 | Safe-regex validation on policy/rule create | 10, 13 | All | "No catastrophic backtracking" | Admin | Low | Internal | Must | S | New util | | |

---

## G. Observability features

| ID | Name | Stream | Provider | User Story | Persona | Sensitivity | Blast | MoSCoW | Effort | Reuse vs New | Demo | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| F-OBS-01 | Per-suggestion audit lineage | 10 | All | "Every state transition audited" | Admin | Low | Internal | Must | M | Reuse audit-service | | |
| F-OBS-02 | Per-policy decision log | 10 | All | "Which policy hit / missed" | Admin | Low | Internal | Must | M | Reuse | | |
| F-OBS-03 | Webhook delivery log | 11 | All | "Past deliveries + signature status" | Admin | Low | Internal | Must | M | Reuse | | |
| F-OBS-04 | Approval funnel metrics | 50 | All | "Drafted → reviewed → approved → executed → success" | Admin | Low | Internal | Should | M | New dashboard | | |
| F-OBS-05 | AI cost dashboard (high-level) | 60 | All | "Daily cost roll-up" | Admin | Low | Internal | Should | M | Reuse usage-ledger | | Per-action drill v2 |

---

## H. Cross-cutting features

| ID | Name | Stream | Provider | Persona | Effort | Notes |
|---|---|---|---|---|---|---|
| F-CUT-01 | All new UI in 8 i18n locales (en/ar/de/es/fr/it/pt/ru) | All | n/a | All | (each stream) | Hard rule from CLAUDE.md |
| F-CUT-02 | Dark mode parity for all new UI | All | n/a | All | (each stream) | CSS variables; no `dark:` |
| F-CUT-03 | RTL (Arabic) layout parity | All | n/a | All | (each stream) | |
| F-CUT-04 | Mobile-responsive 375×812 | All | n/a | All | (each stream) | |
| F-CUT-05 | Accessibility (kbd nav, aria labels) | All | n/a | All | (each stream) | |
| F-CUT-06 | Per-stream QA harness (`qa/test-stream-NN-*.sh`) | 50 | n/a | QA | per stream | |
| F-CUT-07 | Master regression matrix | 50 | n/a | QA | continuous | |
| F-CUT-08 | Per-stream architecture doc + ADR + runbook | 60 | n/a | Tech writer | per stream | |
| F-CUT-09 | Feature flag `WORKSPACE_AUTOMATION_ENABLED` | All | n/a | Admin | central | Default false; per-stream gate |

---

## Stream-to-feature index (cross-reference)

| Stream | MUST features | Total features (incl. SHOULD/COULD) |
|---|---|---|
| 10 — Approval policy engine | F-APPROVE-02..05, F-APPROVE-07, F-APPROVE-10, F-SAFE-01, F-SAFE-02, F-SAFE-06, F-SAFE-07, F-OBS-01, F-OBS-02 | 12 |
| 11 — Webhook receiver | F-WH-01..05, F-WH-09, F-WH-10, F-OBS-03 | 10 |
| 12 — Auto-suggest scheduler | F-001, F-002, F-010..F-014, F-020, F-030..F-032, F-052, F-053 | 14 |
| 13 — Event automation engine | F-SAFE-03, F-SAFE-05, plus refactoring drivers | 4 (low feature count; high architectural impact) |
| 20 — GitLab/Bitbucket writes | F-GITLAB-01..05, F-BITBUCKET-01..03, F-031, F-032 | 10 |
| 21 — OneDrive/SharePoint/ClickUp writes | F-OD-01, F-OD-02, F-SP-01..03, F-CU-01..03 | 8 |
| 22 — Gmail attachments + HTML | F-GMAIL-01..06 | 6 |
| 23 — Calendar + meetings | F-040..F-043, F-CAL-W-01..04, F-CAL-UI-01..03 | 11 |
| 30 — Unified inbox + search | F-INBOX-01..05 | 5 |
| 31 — Digest dashboard | F-050, F-051, F-DIGEST-01..04 | 6 |
| 32 — Auto-action settings | F-SETTINGS-01..05, F-SAFE-04 | 6 |
| 40 — Memory learning | F-LEARN-01..05 | 5 |
| 41 — Ticket planning + coding bridge | F-PLAN-01..13 | 13 |
| 50 — QA continuous | F-OBS-04, F-CUT-06, F-CUT-07 | 3 |
| 60 — Docs continuous | F-OBS-05, F-CUT-08 | 2 |

**Total catalogued features:** 90+ (excluding existing `F-DONE-*` rows). Hits the prompt's 80–120 target.

---

## MoSCoW summary

- **Must:** 70 features
- **Should:** 18 features
- **Could:** 4 features
- **Won't (v1):** documented in vision doc "Out-of-scope" section

---

## Effort summary

| Effort | Count | Total estimated calendar weeks (parallel team of 3) |
|---|---|---|
| S (≤1d) | ~25 | 1 wk |
| M (1-2d) | ~45 | 2 wk |
| L (2-4d) | ~18 | 1.5 wk |
| XL (≥5d) | ~2 | 0.5 wk |

Aligns with the `99-execution-checklist.md` estimate of 3-4 calendar weeks for a parallel team.

---

## Dependency graph (Mermaid-ish)

```
01,02 (docs)  -->  10  -->  12,13,32,40
                   |  -->  11  -->  13
                   |  -->  20,21,22,23 (parallel after 13)
                   |
22 -->  30  -->  31  (digest needs unified-inbox)
20-23 --> 31

40, 41 (parallel; 41 prefers 40 for personalized planning)

50, 60 continuous
```

---

End of catalog. Reference UAT scenarios in `../10-uat-acceptance/workspace-automation-uat.md`.
