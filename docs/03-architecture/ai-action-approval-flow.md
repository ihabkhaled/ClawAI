# AI Action Approval Flow

**Stream:** 10 (Workspace Automation initiative)
**Service:** `claw-workspace-service`
**Status:** Implemented (2026-05-01)
**Tables:** `ai_action_policies`, `ai_action_approval_queue`
**ADR:** [ADR-018](../13-adr/adr-018-027-workspace-automation-reservations.md) (slot reserved)

---

## Why this exists

Workspace AI actions (SUMMARIZE, DRAFT, REWRITE, etc.) can produce drafts that, if executed without review, would touch external systems on the user's behalf — emails sent, tickets created, comments posted. Stream 10 introduces a default-strict approval queue + risk-policy engine so every drafted action either:

- enters a human-reviewable queue (`PENDING_APPROVAL`), OR
- auto-approves only when an admin-defined `AUTO_APPROVE` policy explicitly permits AND the risk score is below the policy's threshold, OR
- is denied at draft time (`DENIED`) when a `DENY` policy matches (e.g., a draft containing a credit card or AWS key).

The pattern mirrors `claw-agent-service`'s existing terminal-command approval engine ([`CommandRiskService`](../../apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts)) but is purpose-built for AI suggestions instead of shell commands.

---

## High-level flow

```
Caller (workspace-sync, scheduler, factory)
        │ enqueueSuggestion(input)
        ▼
┌────────────────────────────────────┐
│  AiActionApprovalManager           │
│   1. Risk-score draftPayload        │
│   2. Match policies (DENY > AA > AL)│
│   3. Compute status + expiresAt     │
│   4. Persist queue row              │
│   5. Publish ai_action.* events     │
└────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│  ai_action_approval_queue (DB)     │
│  status ∈ { PENDING_APPROVAL,      │
│             AUTO_APPROVED, DENIED }│
└────────────────────────────────────┘
        │
        ▼
   Frontend approval UI / webhooks
```

---

## Risk scorer ([`ai-action-risk-scorer.manager.ts`](../../apps/claw-workspace-service/src/modules/ai-actions/managers/ai-action-risk-scorer.manager.ts))

Heuristic-based, deterministic, no LLM call:

| Signal | Score added |
|---|---|
| AWS access key (`AKIA…`) | +100 |
| GitHub PAT (`ghp_…`) | +100 |
| Slack token (`xox[baprs]-…`) | +100 |
| JWT pattern | +90 |
| `Bearer …` / `secret=…` / `password=…` | +80 |
| Credit-card-like digit run | +60 |
| SSN pattern | +60 |
| External recipient (non-`@claw.local`) | +25 |
| Body length > 5000 chars | +10 |
| HTML tag detected | +5 |
| Base | +5 |
| Cap | 100 |

Score → label thresholds: `LOW < 30 ≤ MEDIUM < 60 ≤ HIGH < 85 ≤ CRITICAL`.

PII patterns are kept in [`ai-action-policy.constants.ts`](../../apps/claw-workspace-service/src/modules/ai-actions/constants/ai-action-policy.constants.ts) and validated through the same safe-regex utility used for admin policies (R4 risk mitigation: catastrophic backtracking).

---

## Policy matcher ([`ai-action-policy-matcher.manager.ts`](../../apps/claw-workspace-service/src/modules/ai-actions/managers/ai-action-policy-matcher.manager.ts))

Iterates active policies in `priority DESC` order. Decision rules:

1. **DENY beats everything.** Any matching `DENY` policy short-circuits to `decision='DENIED'` regardless of subsequent matches or priorities.
2. **AUTO_APPROVE beats ALLOW.** Among non-DENY matches, the first matching `AUTO_APPROVE` whose risk-cap fits the draft wins — the row enters status `AUTO_APPROVED` (no human required).
3. **ALLOW is the fallback.** If no AUTO_APPROVE matches (or risk too high for any), the first matching `ALLOW` policy is recorded as `matchedPolicy`; the row enters `PENDING_APPROVAL`.
4. **No match.** If zero policies match, status defaults to `PENDING_APPROVAL` with `matchedPolicy = null`.

A policy "matches" when both `providerRegex` and `actionKindRegex` test true and the candidate's risk does not exceed the policy's `riskMaxLabel` AND `riskMaxScore`.

---

## Default policies (13 seeded on bootstrap)

Seeded by [`AiActionDefaultPolicySeederManager`](../../apps/claw-workspace-service/src/modules/ai-actions/managers/ai-action-default-policy-seeder.manager.ts) on every service start, idempotent via `name` upsert. System defaults cannot be deleted via the admin REST API (HTTP 409).

| Priority | Name | Kind | Notes |
|---:|---|---|---|
| 1000 | `deny-pii-leakage` | DENY | catches PII regex matches at draft time |
| 999 | `deny-impl-prompt-auto-approve` | DENY | hard guard for stream 41 — IMPL_PROMPT never auto |
| 600 | `allow-customer-facing-default` | ALLOW | Gmail/Slack drafts always require review |
| 550 | `allow-write-action-default` | ALLOW | external write actions always require review |
| 500 | `allow-high-risk-require-reason` | ALLOW | rejection of HIGH/CRITICAL needs typed reason |
| 400 | `auto-approve-summarize-internal-jira` | AUTO_APPROVE | LOW-risk Jira summaries |
| 400 | `auto-approve-summarize-internal-confluence` | AUTO_APPROVE | LOW-risk Confluence summaries |
| 400 | `auto-approve-summarize-github-issue` | AUTO_APPROVE | LOW-risk GitHub Issue summaries |
| 400 | `auto-approve-extract-action-items` | AUTO_APPROVE | LOW-risk EXTRACT on internal docs |
| 400 | `auto-approve-estimate-low-risk` | AUTO_APPROVE | stream 41 ESTIMATE auto-approves at LOW |
| 350 | `auto-approve-judge-low-risk` | AUTO_APPROVE | LOW-risk JUDGE actions |
| 350 | `auto-approve-compare-low-risk` | AUTO_APPROVE | LOW-risk COMPARE actions |
| 100 | `allow-default-strict` | ALLOW | catch-all fallback — explicit approval required |

---

## API surface

| Method | Path | Role |
|---|---|---|
| GET | `/api/v1/workspace/ai-actions/policies` | ADMIN, OPERATOR |
| GET | `/api/v1/workspace/ai-actions/policies/:id` | ADMIN, OPERATOR |
| POST | `/api/v1/workspace/ai-actions/policies` | ADMIN |
| PATCH | `/api/v1/workspace/ai-actions/policies/:id` | ADMIN |
| DELETE | `/api/v1/workspace/ai-actions/policies/:id` | ADMIN |
| GET | `/api/v1/workspace/ai-actions/queue` | authenticated user (own scope) |
| GET | `/api/v1/workspace/ai-actions/queue/:id` | authenticated user (own scope) |
| POST | `/api/v1/workspace/ai-actions/queue/:id/approve` | authenticated user |
| POST | `/api/v1/workspace/ai-actions/queue/:id/reject` | authenticated user (HIGH+ requires reason ≥10 chars) |
| POST | `/api/v1/workspace/ai-actions/queue/:id/edit-and-approve` | authenticated user |
| POST | `/api/v1/workspace/ai-actions/queue/bulk-approve` | authenticated user (CRITICAL excluded by guard) |

All policy-write paths run admin-supplied regexes through [`compilePolicyPattern`](../../apps/claw-workspace-service/src/common/utilities/policy-regex.utility.ts) — rejects with `400 messageKey=POLICY_REGEX_UNSAFE` if the pattern exceeds 256 chars or contains nested-quantifier shapes prone to catastrophic backtracking.

---

## Events published (RabbitMQ)

All consumed by `claw-audit-service`:

- `ai_action.suggestion_created` — every enqueue
- `ai_action.pending_approval` — when status = PENDING_APPROVAL
- `ai_action.auto_approved` — when status = AUTO_APPROVED at enqueue time
- `ai_action.approved` — manual approve OR edit-and-approve OR bulk-approve
- `ai_action.rejected` — manual reject (with reason in payload)
- `ai_action.edited` — edit-and-approve emits both `edited` and `approved`
- `ai_action.executed` — published by execution layer (post-stream-13)
- `ai_action.denied` — DENY policy hit at draft time
- `ai_action.expired` — published by `AiActionQueueExpirySweeperManager` cron

---

## Concurrency & expiry

- **Mutex on transitions:** the queue service uses repository-level row-existence + status assertion (`assertActionable`) before each transition. Two concurrent approves of the same row → second sees `STATUS_NOT_PENDING_APPROVED` and rejects.
- **24-hour TTL on PENDING:** enqueue sets `expiresAt = now + 24h`. The cron sweeper [`AiActionQueueExpirySweeperManager`](../../apps/claw-workspace-service/src/modules/ai-actions/managers/ai-action-queue-expiry-sweeper.manager.ts) runs every 15 minutes, holds a Postgres advisory lock so only one workspace-service replica fires, batches up to 100 expired rows per tick, and publishes `ai_action.expired` per row.

---

## Test coverage (this stream)

- **Unit:** 41 specs across `policy-regex.utility`, `ai-action-risk-scorer.manager`, `ai-action-policy-matcher.manager`, `ai-action-approval.manager`, `ai-action-approval-queue.service`. Coverage on new files ≥ 95%.
- **Live API:** [`qa/test-stream-10-approval-engine.sh`](../../qa/test-stream-10-approval-engine.sh) exercises 18 scenarios end-to-end against the running stack — all pass on the dev environment.
- **DB verification:** every state transition asserted via `psql` queries inside the QA script.
- **Docker logs:** scan confirms 0 critical errors after 18 live API operations.

---

## What's intentionally NOT in this stream

- Suggestion drafting itself (today only the existing `AiActionExecutionManager` produces content; future streams 12 + 13 wire scheduling + factory ingestion to call `enqueueSuggestion` automatically).
- The frontend approval UI — extending [`approval-card.tsx`](../../apps/claw-frontend/src/components/workspace/) with risk + matchedPolicy badges happens with stream 10's frontend chunk (deferred to a future session in this multi-session execution plan).
- Per-suggestion edit history (out of scope; tracked in stream 32).
- Memory learning loop (stream 40 consumes the events published here).

---

## References

- Source PLAN: [`.claude/Integrations/stream-10-approval-engine__PLAN.md`](../../.claude/Integrations/stream-10-approval-engine__PLAN.md)
- Pattern source: [`apps/claw-agent-service/src/common/constants/policy.constants.ts`](../../apps/claw-agent-service/src/common/constants/policy.constants.ts)
- UAT stories 10.1–10.8: [`docs/10-uat-acceptance/workspace-automation-uat.md`](../10-uat-acceptance/workspace-automation-uat.md)
- Migration: [`prisma/migrations/20260427000000_ai_action_approval_engine/`](../../apps/claw-workspace-service/prisma/migrations/20260427000000_ai_action_approval_engine/migration.sql)
