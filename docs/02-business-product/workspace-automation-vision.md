# ClawAI Workspace Automation — Vision

**Status:** Canonical reference. Every implementation stream cites this doc.
**Authors:** CEO / Principal BA / Product Owner / Client-Feedback Lead (synthesised)
**Date:** 2026-04-26

---

## Executive Summary

ClawAI's workspace product today **synchronises** content from 12 connected tools (GitHub, GitLab, Bitbucket, Slack, Jira, Confluence, Gmail, Drive, OneDrive, SharePoint, Figma, ClickUp) and lets users invoke AI actions on demand. That puts us at parity with most "AI workspace search" tools.

This initiative turns ClawAI into a **vital, automated, approval-gated assistant**: it watches every connected tool, drafts AI suggestions on schedule and from real-time webhooks, queues each suggestion for human approval (or auto-approves when policy allows and risk score is low enough), and learns from every approve/edit/reject decision via the memory service.

The wedge: **closing the loop**. Every email, every PR, every Jira ticket, every Slack thread becomes an actionable AI suggestion that the user simply approves. Daily admin time shrinks from hours to minutes — without ever ceding irreversible actions to the AI without user confirmation.

The **single failure mode that kills the product**: shipping an auto-action that touches an external system (sends an email, creates a ticket, replies on a customer's behalf) without bulletproof approval. The first design constraint of the entire initiative is therefore: **default-strict. Nothing irreversible without an approval gate.** Admins can relax policies action-by-action, with full audit.

---

## Market Position — Why this is the wedge

### Competitive landscape

| Competitor archetype | Strength | Why we beat them |
|---|---|---|
| **Workspace search tools** (Glean, Coveo, AI search) | Cross-app retrieval | They retrieve; they don't act. We act, with approval. |
| **Email AI assistants** (Superhuman, Shortwave) | Inbox-only deep integration | Single-app silos. We span 12 providers. |
| **Generic AI agents** (open-source agent frameworks) | Power | No safety rails. We're the safety rails. |
| **Per-vendor AI features** (GitHub Copilot, Notion AI, Jira AI) | Native integration | Per-tool islands; can't compose across providers. |

### What's truly defensible

1. **Cross-provider intelligence** — a digest that summarises Gmail + Jira + Slack + GitHub for one user, in one screen, in one breath.
2. **Local-first routing** — privacy-tagged content never reaches cloud LLMs (already ClawAI core).
3. **Default-strict approval gate** — the auto-action safety wall that competitors haven't built.
4. **Memory-personalised suggestions** — the system gets better at *your* style every week (stream 40).
5. **Plan→Decompose→Estimate→IMPL_PROMPT→Hand-off** — we bridge ticket grooming to coding execution (stream 41). Nobody else does this end-to-end.

### Pricing implication

Bundling automation + safety + cross-provider memory under existing ClawAI license — without per-action LLM markup — is a hard differentiator. Cloud-only competitors can't match this pricing structure because they'd lose money on heavy users.

---

## Personas

Three personas drive everything below. Every feature row in the catalog tags one of these.

### P1 — IC engineer "Devon"

**Lives in:** GitHub, Jira, Slack
**Day:** 6 unread Slack DMs, 3 PRs awaiting review, 12 stale Jira sub-tasks, 1 incident channel exploding.
**Attention budget:** zero. Cannot triage 50+ items between morning standup and lunch.
**Tolerance for false positives:** low — 1 wrong "summary" makes them stop trusting the tool forever.
**Wins from automation:** stale-PR nudges, ticket-summary auto-drafts, `IMPL_PROMPT` handoff to chat-thread or agent.

### P2 — Technical PM "Priya"

**Lives in:** Jira, Slack, Gmail, Confluence
**Day:** 5 status meetings, 30 emails to triage, weekly status to write, 200 Jira tickets in 4 epics.
**Attention budget:** medium — 30-second cards work; 5-minute reports don't.
**Tolerance:** medium — ok with 2-3 misses out of 10 if the rest save real time.
**Wins from automation:** Jira EPIC decompose, weekly digest, meeting-notes summary, draft-status-update.

### P3 — Founder/exec "Sam"

**Lives in:** Gmail, Slack, Drive
**Day:** Customer emails, board prep, vendor management, 4 calendars.
**Attention budget:** very low. Everything must fit on a phone screen.
**Tolerance:** very low for mistakes that touch customers; high for slightly-off summaries.
**Wins from automation:** inbox reply drafts (with iron-clad domain allowlist), morning brief, attachment auto-summary, calendar-prep digest.

---

## Top 12 Use Cases

Each maps to a persona and a stream that delivers it.

| # | Use case | Persona | Streams |
|---|---|---|---|
| U1 | "Reply to this customer email" — drafted by AI, I approve | P3 | 12, 13, 22 |
| U2 | "Summarise this 47-comment Jira ticket" | P2, P1 | 12, 13 |
| U3 | "Decompose this EPIC into 8 ordered subtasks with estimates" | P2 | 41 |
| U4 | "Send this Jira ticket to my coding agent as a brief" | P1 | 41 |
| U5 | "What did my team do this week, in 5 bullets" | P2, P3 | 31 |
| U6 | "Show me this morning's brief across Gmail/Jira/Slack" | P3 | 31 |
| U7 | "PRs older than 7 days — nudge them" | P1 | 12, 20 |
| U8 | "Notes from my last meeting + action items" | P2, P3 | 23 |
| U9 | "View this email's attachments without leaving ClawAI" | P3 | 22 |
| U10 | "Search 'budget Q2' across all my apps" | All | 30 |
| U11 | "Auto-approve summaries from internal-domain emails only" | Admin | 10, 32 |
| U12 | "After 3 of my edits to Slack drafts, learn my preferred tone" | All | 40 |

---

## Out-of-scope (explicit non-goals for v1)

These are **deliberately deferred**. Don't add them to the catalog without explicit roadmap promotion.

- Native mobile app for approval queue (web-mobile responsive only — 375×812 viewport)
- A/B testing framework for suggestion prompts
- Per-action AI cost dashboard (high-level cost only; per-action drill-down deferred)
- Approve-via-email reply
- Slack slash commands for approval (`/claw approve <id>`)
- Multi-tenant ClickUp custom-field schema
- Calendar push notifications (Microsoft) — polling only in v1
- Microsoft Graph subscription auto-renewal at scale (manual refresh in v1)
- OneDrive/SharePoint upload-session for files >4 MB
- Gmail image proxy through file-service (hide-by-default in v1; full proxy in v2)
- Per-suggestion "why this?" deep explainer (1-line reason in v1; full lineage view in v2)

Tracked in `docs/14-risk-debt/technical-debt.md` after v1 lands.

---

## Success Metrics

### Leading indicators (move within 7 days of activation)

| Metric | Target | Source |
|---|---|---|
| % of new connectors that produce ≥1 approved suggestion in 7 days | ≥ 70% | `AiActionApprovalQueue` join `WorkspaceConnector` |
| Median time-from-connection-to-first-suggestion | < 4h | event audit log |
| Median time-to-approval per suggestion | < 2h | `AiActionApprovalQueue.statusChangedAt` deltas |

### Lagging indicators (30-day rolling)

| Metric | Target | Source |
|---|---|---|
| Suggestion approval rate (approved + edited / total) | ≥ 70% | `AiActionApprovalQueue` |
| Suggestions per active user per day | 5–15 (sweet spot) | per-user aggregation |
| Approval-queue median age (open suggestions) | < 8h | derived from queue |
| Auto-approval rate (auto-approved / total) | 20–40% (post-soak) | queue status distribution |
| 30-day retention of users who approved ≥10 suggestions | ≥ 80% | usage ledger |
| Dangerous-action incidents | **0** (always) | audit log + manual incident log |

### Anti-metrics (must trend DOWN, not up)

- "Suggestion fatigue" → unsubscribe rate from per-class automation toggles
- "Wrong-recipient" incidents → 0 always, page on-call if 1
- Cloud LLM cost per active user per day → flat as DAU grows (local-first routing must absorb growth)

---

## User-visible states (every state must have a UI treatment)

The user sees all of these at various points. None can be silent.

| State | UI treatment |
|---|---|
| `suggestion-pending-approval` | Badge "Pending" + age timer; in approvals queue |
| `suggestion-auto-approved` | Badge "Auto-approved by policy <name>"; collapsed by default |
| `suggestion-executing` | Spinner + "Executing now..." |
| `suggestion-executed` | Green check + provider link to result |
| `suggestion-execution-failed` | Red X + error message + Retry button |
| `suggestion-rejected` | Strikethrough + reject reason |
| `suggestion-edited-and-approved` | Diff view showing original draft vs edited |
| `suggestion-expired` | Greyed out + "Expired (24h unattended)" |
| `suggestion-denied-by-policy` | Yellow banner + "Policy <name> denied this — admin can override" |
| `policy-locked` | Lock icon on a class user cannot relax (global default-strict) |
| `webhook-disconnected` | Red banner on connector card + "Reconnect" button |
| `webhook-rate-limited` | Yellow banner + auto-retry timer |
| `quota-burned` | Per-user budget banner + days-until-reset |
| `learning-paused` | "Learning is paused — re-enable in Settings" |

Each state has at least 1 Gherkin scenario in `workspace-automation-uat.md`.

---

## Failure-state matrix

For every failure mode, classify acceptable (graceful degradation — show banner) vs unacceptable (page on-call).

| Failure | Acceptable degradation | Unacceptable (page on-call) |
|---|---|---|
| Webhook signature invalid | reject + audit | n/a |
| Webhook signature missing | reject + audit | n/a |
| Provider API unreachable | retry with backoff; banner after 3 fails | sustained > 30 min on critical providers |
| LLM quota exceeded | local-first fallback; user banner | both local + cloud unhealthy |
| Auto-approval matched but execution failed | retry + show error | execution succeeded externally but DB says failed (data drift) |
| Policy regex catastrophic backtracking | reject at create time (safe-regex) | shipped policy causes service hang |
| Same suggestion duplicated across job runs | de-dup table catches; optional banner | duplicates reach external system |
| Memory PREFERENCE leakage across users | n/a | any cross-user data |
| RabbitMQ DLQ overflow | DLQ alarm | suggestion factory unable to consume for >30 min |
| Audit log gap (event published, audit row missing) | n/a | any gap |

---

## UAT seed (5 client-grade scenarios)

These are the demo scripts the UAT lead walks through with a real client before sign-off:

1. **First-time setup → first approved suggestion in <30 min** (P3 exec, never seen ClawAI before, no docs)
2. **Privacy enforcement** — connect Gmail, send a privacy-keyword-tagged prompt, verify NEVER reaches cloud (P2)
3. **Auto-approval policy** — admin enables auto-approve on SUMMARIZE for internal domains, verify low-risk Jira summaries auto-execute (Admin)
4. **Wrong-recipient guard** — generate an auto-reply suggestion that contains an external-domain target, verify it requires explicit approval even with auto-approval policy on (P3)
5. **Coding handoff** — Approve an EPIC decomposition → click "Send to coding agent" → verify a chat thread or agent terminal opens pre-loaded with the brief (P1)

Full Gherkin in `docs/10-uat-acceptance/workspace-automation-uat.md`.

---

## Roadmap

### v1 (this initiative — 18 streams, 3-4 weeks team-effort)

- All 4 foundation streams (10-13)
- All 4 provider streams (20-23)
- All 3 UX streams (30-32)
- Both intelligence streams (40-41)
- QA + docs continuous

### v1.x (post-launch follow-ups, deferred from v1)

- Approve-via-email reply
- Slack slash command `/claw approve <id>`
- Mobile native app extension
- AI cost dashboard with per-action-class breakdown
- A/B prompt testing framework

### v2 (next major)

- Distributed multi-tenant deployment
- Per-organisation policy hierarchy
- SSO + SAML for the approval admin surface
- Full agentic mode (with approval) — agent acts across providers in a single workflow
- Native iOS/Android approval inbox

### v3 (opportunistic)

- Marketplace of community-published trigger rules + policies
- Per-customer LLM fine-tuning on accumulated PREFERENCEs
- "ClawAI for teams" — shared approval queues, role-based escalation

---

## Risk register (top 10)

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Auto-action sends wrong content to wrong customer | LOW | CRITICAL | Default-strict; domain allowlist; PII detector; admin reviews before relaxing | Security + Product |
| R2 | Webhook signature spoofing | MED | HIGH | HMAC verify per provider; per-connector secret rotation; IP allowlist where supported | Security |
| R3 | LLM quota burn from runaway scheduler | MED | MED | Per-user daily budget + per-event-type sub-cap + local-first routing | Backend |
| R4 | Auto-approval policy regex DoS | LOW | HIGH | `safe-regex` validation at policy create | Security |
| R5 | RabbitMQ event flood crashes consumer | MED | MED | `prefetch=10` back-pressure; DLQ + 3 retries with backoff (already in `shared-rabbitmq`) | Backend |
| R6 | Memory PREFERENCE cross-user leakage | LOW | CRITICAL | Per-user scope at query time; integration test verifies isolation | Backend |
| R7 | Cloud LLM call when privacyClass=PRIVATE | LOW | CRITICAL | Routing service tested with every privacy keyword class; audit log includes routing decision tree | Routing + Backend |
| R8 | Same suggestion duplicated by 2 schedulers (race) | MED | LOW | Advisory lock pattern from `workspace-sync-scheduler` (already proven) | Backend |
| R9 | Frontend infinite-poll on background error | MED | MED | Error message stored in DB + `meta.error=true` so polling sees the error and stops | Frontend |
| R10 | Schema migration breaks existing approvals | LOW | HIGH | Additive-only migrations; backwards-compat shim on `/run` endpoint | Backend |

Full per-stream risk register in each Phase 0 PLAN doc.

---

## "Done" definition (product-side)

Engineering's "all tests pass" is necessary but not sufficient. v1 is **product-done** only when:

- [ ] 100 internal users have approved 10+ suggestions each over 14 days
- [ ] **Zero** dangerous-action incidents in those 14 days
- [ ] Median time-to-approval < 2h across all internal users
- [ ] Suggestion approval rate ≥ 70% across all action kinds
- [ ] All 12 use cases above demo'd to a non-technical client without docs
- [ ] All 5 UAT seed scenarios pass with a real client (not internal QA)
- [ ] Stream 50 regression matrix is 100% green for 7 consecutive days
- [ ] On-call runbook (`docs/11-runbooks/workspace-automation-oncall.md`) exists and has been walked through by an on-call rotation

Until these are met, the feature ships **behind a feature flag** for internal users only.

---

## Glossary

- **Stream** — one prompt = one workstream = one PR (sometimes two)
- **Wave** — group of streams that must complete before the next starts in parallel
- **Suggestion** — AI-drafted action awaiting approval
- **Auto-approval** — bypasses human review per policy + risk score
- **AiActionPolicy** — approval-policy table (introduced by stream 10)
- **AiActionApprovalQueue** — pending-suggestion table (stream 10)
- **SuggestionFactoryManager** — single entry point for all events (stream 13)
- **AutoSuggestSchedulerManager** — cron driver (stream 12)
- **WorkspaceObjectEmbedding** — pgvector embedding for semantic search (stream 30)
- **DigestSnapshot** — daily/weekly per-user digest row (stream 31)
- **UserAutomationPreference** — per-user opt-in row (stream 32)
- **PLAN/DECOMPOSE/ESTIMATE/IMPL_PROMPT** — four new ticket-planning action kinds (stream 41)

---

End of vision. See `workspace-automation-feature-catalog.md` for the comprehensive feature inventory.
