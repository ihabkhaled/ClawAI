# Stream 07 — R.6 Multi-Tenant Fleet Routing

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/07_R6_multi_tenant_fleet_routing.md`

## Mission

Add org-scoped routing policies, allowed-provider rules, org budgets, org rate limits, and policy propagation. Today policies are global; this stream lets fleet admins manage routing for their org.

**BLOCKER B4:** Requires `User.orgId` end-to-end in auth-service. `Organization` + `OrganizationMember` already exist in agent-service but are isolated there. Must be lifted into auth-service OR cross-service-shared first.

## Schema changes (see PRISMA_FUTURE_MODELS.md)

- `RoutingPolicy`: add nullable `orgId` column + index `(orgId, isActive, priority)`
- New `OrgProviderRule` table (ALLOW/DENY per provider per org)
- New `OrgRateLimit` table (req/min per org)
- (Stream 05) `UserCostBudget.scope='ORG'` already supports org budgets

## Policy resolution order (most-restrictive wins)

```
1. Explicit user override (per-thread settings)         → wins immediately
2. Privacy hard constraints (PRIVACY_KEYWORDS)          → wins (never cloud)
3. Org DENY rules (org banned this provider)            → block + fallback
4. Org policy (orgId-scoped, highest priority)          → may override AUTO
5. Org ALLOW list (if set, restricts choices)           → filter candidates
6. Global policy (orgId=null, priority-ordered)         → may override AUTO
7. Safe defaults (existing v1 behavior)
```

## Files to add / modify

```
apps/claw-routing-service/src/modules/routing/
├── managers/
│   └── policy-resolution.manager.ts                       (NEW — replaces inline applyPolicies)
├── repositories/
│   └── org-provider-rule.repository.ts                    (NEW)
│   └── org-rate-limit.repository.ts                       (NEW)
├── dto/
│   ├── create-org-policy.dto.ts                           (NEW — extends create-policy.dto)
│   ├── create-org-provider-rule.dto.ts                    (NEW)
│   └── update-org-rate-limit.dto.ts                       (NEW)
└── types/
    └── policy-resolution.types.ts                         (NEW)
```

## Acceptance criteria

| # | Test | Expected |
|---|------|----------|
| 1 | Org admin creates policy `forceClaude` for orgX | All orgX users see Anthropic on next request; non-orgX users unaffected |
| 2 | Org admin adds DENY rule for OpenAI on orgX | All orgX users get fallback away from OpenAI; reasonTag `org_provider_denied` |
| 3 | Existing global policies still apply | When user has no org, global behavior unchanged |
| 4 | Org rate limit 60/min exceeded | Routing returns 429 with messageKey `ORG_RATE_LIMIT_EXCEEDED` |
| 5 | Privacy keyword + org ALLOW=[OpenAI] | Privacy wins → local route; org rule ignored |
| 6 | Org has both allow and deny | DENY wins; ALLOW further restricts remaining |
| 7 | User in 2 orgs (future) | Org with most-restrictive policy applies |
| 8 | Org policy CRUD via UI | Admin UI allows org-admin role to create/edit policies for their org only |
| 9 | Cross-org isolation | Org admin from orgA cannot see/edit orgB policies |
| 10 | Policy propagation latency | Within 60s of admin save, all org devices see new policy |
| 11 | Audit on org policy change | RabbitMQ `routing.org_policy.changed` published |

## Endpoint contract

```http
POST   /api/v1/routing/policies                  (existing — now accepts orgId in body)
GET    /api/v1/routing/policies?orgId=X          (existing — filter)
POST   /api/v1/routing/orgs/:orgId/provider-rules
GET    /api/v1/routing/orgs/:orgId/provider-rules
DELETE /api/v1/routing/orgs/:orgId/provider-rules/:id
PUT    /api/v1/routing/orgs/:orgId/rate-limit
GET    /api/v1/routing/orgs/:orgId/rate-limit
```

## Tests

```
apps/claw-routing-service/src/modules/routing/managers/__tests__/policy-resolution.manager.spec.ts
  - org policy overrides global when both match
  - org DENY blocks despite ALLOW
  - privacy keyword beats all
  - org rate limit returns 429
  - user with no org uses global only
  - cross-org isolation in queries

qa/test-routing-r6-multi-tenant.sh
  - 2 orgs, each with different policies
  - assert orgA user gets orgA policy, orgB user gets orgB policy
  - assert rate limit blocks 61st request in 1 minute
```

## Rollback

`ROUTING_R6_MULTI_TENANT_ENABLED=false` → policy-resolution falls back to existing global-only behavior. Org-tagged policies are still in DB but ignored.

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Blocker B4: User.orgId not in auth-service | Build this stream after auth-service org work |
| 2 | Policy resolution complexity creates O(N²) scan | Index `(orgId, isActive, priority)`; cache org policies in Redis 30s |
| 3 | Org admin in orgA accidentally affects orgB | Strict orgId filter in repository layer; integration test |
| 4 | Rate limit storage | In-memory sliding window per orgId + Redis backup for distributed |
