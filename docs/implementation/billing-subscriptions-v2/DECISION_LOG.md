# Decision log — Billing & Subscription Hardening v2

Append-only. Each entry records the decision, why, and what it costs.

---

## D-001 — Isolated worktree, one branch name in both repositories

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Applied

Work happens in `D:/Freelance/Claw/.worktrees/billing-subscription-hardening-v2` on
`feat/billing-subscription-hardening-v2`, with the same branch name in the
`apps/claw-coding-agent` submodule.

**Why:** The main worktree carries unrelated in-flight work and five other feature
worktrees already exist — this is the established pattern here. A worktree keeps the
program isolated without touching anyone's uncommitted state.

**Cost:** Every extension change needs two commits (submodule + superproject pointer).

---

## D-002 — Extend, never duplicate

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Standing

ClawAI already has outbox/inbox, webhook dedupe, idempotency records, refund
reservation with a database over-refund barrier, immutable price versions, server-owned
expiring quotes, reconciliation runs, AES-256-GCM gateway-secret encryption, and an
atomic multi-window quota Lua script.

**Decision:** Phases 02, 03, 07, 08 and 13 **extend these**. No parallel billing
subsystem, no second idempotency store, no second usage ledger.

**Why:** Pack execution rule 3 and `rules/09-refactor-rules.md` both prohibit it, and a
second financial write path is how double-charges happen.

---

## D-003 — `RESET_CYCLE_WITH_UNUSED_CREDIT` is a new mode, not a fix

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Accepted, pending implementation

Shipped `calculateProration` charges `target×ratio − current×ratio` and preserves the
period end. For $5→$10 at 10/30 days that is **334¢**. The pack requires **667¢**
(`target_full − unusedCredit`) plus a fresh full period.

**Decision:** Add `RESET_CYCLE_WITH_UNUSED_CREDIT` as a *typed, selectable* proration
mode. Keep the existing behaviour as a named mode. Default per plan policy revision.
Ship behind a flag with shadow comparison (pack phase 16).

**Why:** The existing calculator is not wrong — it is a different, defensible policy
(the customer pays only for what they will use in the current period). Silently
replacing it would change what every existing subscriber is charged on upgrade, with no
audit trail explaining why. Two modes make the change explicit, reversible and testable.

**Cost:** Two calculators to test and keep correct; a migration to stamp existing quotes
with their mode.

**Escalation:** Which mode becomes the default for existing plans is a **commercial
decision** and is deliberately left to the product owner.

---

## D-004 — Cooling-off eligibility is decided from `PaymentTransaction.capturedAt`

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Accepted, pending implementation

**Why:** It already exists, it is written from provider confirmation, and it is the only
capture timestamp not derivable from a client. Checkout creation time, invoice issue
time and request time are all rejected as inputs.

**Boundary:** `now <= capturedAt + 48h` — inclusive at exactly 48:00:00.000.

**Open:** Rows whose `capturedAt` is null (legacy/unreconciled) must be marked for
reconciliation, never treated as eligible or ineligible by default. Resolved in Phase 03.

---

## D-005 — Self-service refund is a new surface; the admin surface keeps its override

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Accepted, pending implementation

Today the only refund entry point is `POST /admin/billing/refunds` with a client-supplied
`amountMinor`, gated by `ADMIN_PLANS_MANAGE`.

**Decision:** Add a customer surface where the amount is **derived server-side** from
policy and never accepted from the client. Keep the admin surface's explicit amount as
an audited operator override, but move it behind a dedicated `billing.refund.*`
permission with dual control above a threshold.

**Why:** A customer must not be able to name their own refund amount. An operator
sometimes legitimately must — that is a different, audited action, and conflating them
is what makes the current permission (`ADMIN_PLANS_MANAGE`, also used for display order)
inappropriate.

---

## D-006 — Refund state machine expands from 3 states to 8

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Accepted, pending implementation

`RefundStatus { PENDING, SUCCEEDED, FAILED }` collapses request, eligibility, approval,
provider submission and provider confirmation into one call.

**Decision:** Expand per `reference/STATE_MACHINES.md`. Expand-then-backfill: new enum
values are additive, existing rows map `PENDING → provider_submitted`,
`SUCCEEDED → succeeded`, `FAILED → failed`.

**Why:** Dual control and eligibility preview are impossible without separating request
from execution. Additive enum expansion keeps old code readable against the new schema.

---

## D-007 — "Tenant" maps to user + workspace; organizations are design-only

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Standing assumption

ClawAI has users, workspaces and roles — no organization/seat entity. The pack assumes
tenants throughout.

**Decision:** Authorization invariants are enforced against the authenticated **user**
(and workspace where scoped). Organization roles, seats and per-org budgets are
documented as designed-but-not-built rather than half-implemented.

**Why:** Pack rule: "designed but awaiting product decision" is a legitimate completion
state; inventing an organization model to satisfy a checklist is not.

---

## D-008 — No production actions

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Standing

No real charges, refunds, provider mutations, production migrations, secret rotation,
deployment, publish, or **push**. Sandbox/test-mode adapters, fixtures and migration
dry-runs only. Commits stay local until the human authorizes a push.

---

## D-009 — Documentation-only phase does not run the code gates

**Date:** 2026-08-07 · **Phase:** 01 · **Status:** Applied

Phase 01 changed no `.ts`, schema, or config file. The per-workspace
`tsgo --noEmit && lint && test && build` lane is therefore not run for it, and no test
result is claimed. That lane begins with Phase 02 and runs in every touched workspace
only — never all 18.

**Why:** Honest evidence. Reporting a green gate that was never executed, or executing
an all-workspace run the project explicitly prohibits as prohibitively expensive, are
both worse than saying "no code changed".
