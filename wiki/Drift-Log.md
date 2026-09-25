> **Wiki source:** [`docs/02-business-product/drift-log.md`](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/drift-log.md) on the current `main` branch. This page mirrors the repository documentation so the Wiki stays grounded in the codebase.

# Drift Log

Every intended change of direction in the product, the business, the scope or the
market: what was true, what is true now, why, who decided, and what it touched.
Append-only — a reversal is a new entry that references the old one.

The decision behind an entry lives in its ADR; the current state lives in the
page the entry names. This log is the history between them.

| Field          | Meaning                                                   |
| -------------- | --------------------------------------------------------- |
| Area           | product · business · market · scope · architecture · UX   |
| Before / After | The direction before and after, in one line each          |
| Why            | The evidence or reason                                    |
| Decided by     | A named owner, or the gap marker when unknown             |
| Impact         | Users, revenue, cost, schedule, risk                      |
| Touched        | The requirements and documents updated in the same change |

---

## DRIFT-001 — From "one subscription" to "Every AI, one workspace" (2026-09-26)

- **Area:** product, business, market.
- **Before:** "Every Frontier AI Model, One Subscription." ClawAI described as a
  local-first AI orchestration platform; the story was model access and routing
  on a subscription.
- **After:** "Every AI, one workspace." A full AI workspace that sees, hears,
  researches and builds — pay-as-you-go first, teams and business customers,
  local-first and privacy as the differentiator.
- **Why:** the product shipped well past chat between 2026-08-25 and 2026-09-26
  (see the [flagship catalog](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/flagship-features.md)), and the business is moving
  towards pay-as-you-go credit ([ADR-078](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-078-payg-connector-credit.md)),
  which "one subscription" contradicts.
- **Decided by:** the owner, 2026-09-26.
- **Impact:** public copy, the README, the wiki and every agent router change.
  No price, plan limit or entitlement changes. Risk: the teams pillar
  over-promises if copy names features that are not built — bounded by
  [REQ-POS-005](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/requirements-register.md#req-pos-005).
- **Touched:** [ADR-126](https://github.com/ihabkhaled/ClawAI/blob/main/docs/13-adr/adr-126-every-ai-one-workspace-positioning.md),
  [product vision](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/product-vision.md),
  [business overview](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/business-overview.md),
  [competitive analysis](https://github.com/ihabkhaled/ClawAI/blob/main/docs/01-executive-context/competitive-analysis.md),
  [requirements register](https://github.com/ihabkhaled/ClawAI/blob/main/docs/02-business-product/requirements-register.md) REQ-POS-001…006,
  root `README.md`, `wiki/`, `CLAUDE.md` and every agent router.
  Frontend marketing copy is changed in a separate, parallel batch.
