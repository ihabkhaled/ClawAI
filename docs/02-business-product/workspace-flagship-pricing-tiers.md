# Workspace Flagship — Pricing Tier Plan

> Status: PROPOSAL (2026-05-11). Owner: Product/Founders. This doc closes the v3
> Prompt 13 gap. Numbers below are draft starting points — adjust against cost
> model + competitor benchmarks before launch.

## Goals of this plan

1. Capture **clear value buckets** so a non-technical user can self-select the
   right tier in under 30 seconds.
2. Keep the **Free** tier genuinely useful (no friction trial), not a 14-day
   countdown.
3. Drive **Pro → Team** upgrade on collaboration features, not on basic limits.
4. Drive **Team → Enterprise** upgrade on governance + SAML + audit, not on
   raw seat count alone.
5. Every paid tier carries margin even at the **worst-case AI usage** in its
   limits (token + model unit-cost is bounded by per-tier connector caps).

---

## Tier ladder

| | **Free** | **Pro** | **Team** | **Enterprise** |
|---|---|---|---|---|
| **Price** | $0 | $19 / user / mo | $39 / user / mo | Custom (≥ 50 seats) |
| **Best for** | Solo evaluator | Indie / solo professional | Small / mid team (5-50) | Org with compliance bar |
| **Connectors** | 2 active | 8 active | unlimited active | unlimited + custom |
| **Workspace objects synced** | 5,000 | 100,000 | 1,000,000 | unlimited |
| **AI actions / month** | 50 | 1,500 | 10,000 / user pooled | unlimited |
| **Approval queue** | manual only | manual + auto (risk-policy) | manual + auto + bulk + edit-then-approve | + custom policies |
| **Recipes / chains** | — | 5 personal | 20 shared per team | unlimited + governance |
| **Auto-suggestions** | — | scheduled (per provider) | + cross-provider + cron tuning | + custom cadence |
| **Models routed** | Free local (Ollama) | + 1 cloud connector | + multi-cloud + parallel multi-model | + private Bedrock / Vertex |
| **Local Frontier (Kimi K2 / GLM-5.1 / DeepSeek)** | install only | — | full | full |
| **Webhook ingest** | — | inbound only | inbound + outbound to chains | + multi-region |
| **Digest dashboard** | weekly only | daily + weekly | + per-team digest | + custom drill-downs |
| **Workspace inbox + semantic search** | within 5k objects | full | full | + retention controls |
| **Multi-model PR review / judge** | — | 1 reviewer model | up to 3 reviewers + judge | unlimited + custom |
| **Memory-driven learning** | basic preferences | full | full + team memory | + tenant memory |
| **Audit log** | 30 days | 90 days | 1 year | unlimited / SIEM export |
| **RBAC** | single owner | single owner | role-based (Admin/Operator/Viewer) | + per-connector RBAC + IP allowlist |
| **SSO** | — | — | Google / Microsoft | + SAML 2.0, SCIM provisioning |
| **Data residency** | US default | US default | US / EU choice | + custom region + BYO-key (HSM) |
| **Support** | community | email (48h) | email (24h) + chat | dedicated CSM + 99.9% SLA |
| **DPA / GDPR / SOC 2** | self-serve | self-serve | + DPA | + SOC 2 Type II report |

---

## Concrete limits, per tier (the numbers the gateway will enforce)

These are the values the rate-limiter and quota services should read at runtime.
They live in `packages/shared-constants/src/pricing-tiers.constants.ts` once shipped.

```ts
export const PRICING_TIER_LIMITS = {
  FREE: {
    activeConnectors: 2,
    workspaceObjects: 5_000,
    aiActionsPerMonth: 50,
    recipesOwned: 0,
    parallelModels: 1,
    inboxSearchObjects: 5_000,
    auditLogDays: 30,
    autoSuggest: false,
    bulkApproval: false,
  },
  PRO: {
    activeConnectors: 8,
    workspaceObjects: 100_000,
    aiActionsPerMonth: 1_500,
    recipesOwned: 5,
    parallelModels: 1,
    inboxSearchObjects: 100_000,
    auditLogDays: 90,
    autoSuggest: true,
    bulkApproval: false,
  },
  TEAM: {
    activeConnectors: Number.POSITIVE_INFINITY,
    workspaceObjects: 1_000_000,
    aiActionsPerMonth: 10_000, // pooled across team
    recipesOwned: 20,           // shared across team
    parallelModels: 3,
    inboxSearchObjects: 1_000_000,
    auditLogDays: 365,
    autoSuggest: true,
    bulkApproval: true,
  },
  ENTERPRISE: {
    activeConnectors: Number.POSITIVE_INFINITY,
    workspaceObjects: Number.POSITIVE_INFINITY,
    aiActionsPerMonth: Number.POSITIVE_INFINITY,
    recipesOwned: Number.POSITIVE_INFINITY,
    parallelModels: Number.POSITIVE_INFINITY,
    inboxSearchObjects: Number.POSITIVE_INFINITY,
    auditLogDays: Number.POSITIVE_INFINITY,
    autoSuggest: true,
    bulkApproval: true,
  },
} as const;
```

---

## Upgrade triggers (what nudges a user to upgrade)

| From | To | Trigger seen by user |
|---|---|---|
| Free | Pro | Hit 50 AI actions / month OR tried a 3rd connector |
| Pro | Team | Wanted to share a recipe OR enabled SSO OR added 5+ teammates |
| Team | Enterprise | Compliance review request OR SAML/SCIM ask OR > 50 seats OR per-connector RBAC ask |

Each trigger surfaces a non-blocking banner with one CTA ("Upgrade to Pro for
unlimited connectors") plus the next-tier diff. **Never** hard-block in-flight
work — the AI action that pushed the user over the cap **still completes** and
the next one is queued with a "Quota reached, upgrade or wait until <date>"
message.

---

## Per-tier feature flags

Backed by a `pricingTier` column on `User` / `Workspace` / `Organization`. Read
once at request entry, cached per request. Enforcement happens at:

- **API gateway (nginx + claw-auth)** — rejects connector creation past `activeConnectors`
- **Workspace service** — rejects auto-suggest enable past tier limit
- **AI actions service** — counts monthly tokens against `aiActionsPerMonth`
- **Recipe runner** — rejects start past `recipesOwned`
- **Inbox / digest** — silently caps results past `inboxSearchObjects`
- **Audit service** — TTL on Mongo collection per tier (`auditLogDays`)

---

## What is NOT a paid feature (deliberately Free forever)

- Local Ollama routing — privacy is a user right, not a paywall
- Manual approval queue — basic governance must be Free
- Workspace inbox **within the Free sync cap** — discovery > revenue
- Audit log **basic view** — 30-day retention is enough to debug; longer is paid
- Sharing a recipe **as a public marketplace listing** — community growth is upside

---

## Things we will revisit at launch + 90 days

1. The `aiActionsPerMonth` ceiling — too tight kills value; too loose kills margin.
   Plan: ship Pro at 1,500 and watch p90 actual usage. If p90 < 700, tighten Free
   from 50 → 100 to widen the funnel.
2. Whether **parallel multi-model** at Team tier should drop to 2 reviewers
   (cost vs. quality trade-off).
3. Whether **Local Frontier** install belongs in Free or Pro.
4. Whether **Enterprise** needs a separate "Government" SKU with FedRAMP /
   in-region requirements.

---

## What this doc is **NOT**

- Not a public marketing page. The customer-facing comparison table needs UX
  polish, screenshots, FAQs.
- Not a billing integration spec. Stripe / Paddle wiring is its own next-session
  workstream (will read this doc as the source of truth for product codes).
- Not a discount / promo strategy. Annual prepay discount, design-partner program,
  startup credits, education tier — TBD.
- Not legal copy. DPA / SOC 2 references in the matrix are aspirational until the
  audit completes.

---

## Cross-reference

- Product vision: `docs/02-business-product/workspace-automation-vision.md`
- Feature catalog (what each tier ships): `docs/02-business-product/workspace-automation-feature-catalog.md`
- Personas: `docs/02-business-product/user-personas.md` — Pro suits the "Solo
  Founder Dev"; Team suits the "Five-Person SaaS Startup"; Enterprise suits the
  "Regulated Industries Tech Lead"
- Capability framework (technical foundation that powers the per-tier features):
  `docs/03-architecture/ai-action-approval-flow.md`
