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
  (see the [flagship catalog](flagship-features.md)), and the business is moving
  towards pay-as-you-go credit ([ADR-078](../13-adr/adr-078-payg-connector-credit.md)),
  which "one subscription" contradicts.
- **Decided by:** the owner, 2026-09-26.
- **Impact:** public copy, the README, the wiki and every agent router change.
  No price, plan limit or entitlement changes. Risk: the teams pillar
  over-promises if copy names features that are not built — bounded by
  [REQ-POS-005](requirements-register.md#req-pos-005).
- **Touched:** [ADR-126](../13-adr/adr-126-every-ai-one-workspace-positioning.md),
  [product vision](../01-executive-context/product-vision.md),
  [business overview](../01-executive-context/business-overview.md),
  [competitive analysis](../01-executive-context/competitive-analysis.md),
  [requirements register](requirements-register.md) REQ-POS-001…006,
  root `README.md`, `wiki/`, `CLAUDE.md` and every agent router.
  Frontend marketing copy is changed in a separate, parallel batch.

---

## DRIFT-002 — "One subscription" copy removed from public pages, Team plan stops promising pooling (2026-09-29)

- **Area:** product, market.
- **Before:** DRIFT-001 changed the slogan, but 30-odd marketing, comparison, FAQ
  and SEO strings in all 13 locales still said "one subscription", and the Team
  plan's seeded description promised "shared workspaces and a large pooled
  allowance" (pooling is not built, REQ-POS-005).
- **Now:** those strings say "one workspace" (competitor and plan-specific uses of
  "subscription" are untouched); the Team description reads "A large monthly
  allowance for heavy daily use." Existing installs are updated by a migration
  guarded on the old text, so an operator's own wording survives.
- **Why:** "one subscription" contradicts pay-as-you-go credit and the
  "Every AI, one workspace" slogan; the Team text overclaimed an unbuilt feature.
- **Decided by:** the owner, 2026-09-29 ("do them and finish").
- **Impact:** public copy only. No price, quota or entitlement changes.
- **Touched:** `apps/claw-frontend` locale files, comparison, coding-agent and SEO
  constants (13 locales); `apps/claw-auth-service` plan-catalog seed and
  migration; [REQ-POS-005](requirements-register.md#req-pos-005);
  [flagship catalog](flagship-features.md).
- **Guarded by:** `repositioning-slogan-keys.test.ts` (English copy) and
  `plan-catalog-pricing.seeder.spec.ts` (no plan promises pooling).
