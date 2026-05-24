# Stream 02 — R.1/R.3 Promote v2 Evaluator (Canary)

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/02_R1_R3_promote_v2_evaluator_canary.md`

## Mission

Take the existing route-evaluator-v2 from shadow-only to canary primary for a small percentage of traffic, with guardrails, comparison telemetry, and instant rollback.

## Current state (from audit)

- `route-evaluator.controller.ts` (`/routing/evaluate-v2`) exists with full `RoutingDecisionV2` schema.
- `evaluate-shadow.controller.ts` runs v2 alongside v1 — zero impact on response.
- chat-service still consumes `/routing/evaluate` (v1).

## Files to add (scaffold included)

```
apps/claw-routing-service/src/modules/route-evaluator/
├── managers/
│   └── canary-bucket.manager.ts                      (NEW)
├── utilities/
│   ├── canary-hash.utility.ts                        (NEW — stable per-user/org bucketing)
│   └── decision-comparator.utility.ts                (NEW)
├── types/
│   └── canary.types.ts                               (NEW)
└── constants/
    └── canary.constants.ts                           (NEW)
```

## Files to modify (NOT scaffolded)

```
apps/claw-chat-service/src/modules/chat/managers/chat-execution.manager.ts
  → call /routing/evaluate-v2 when CanaryBucketManager.isV2Bucket(userId, threadId) returns true

apps/claw-routing-service/src/modules/route-evaluator/controllers/route-evaluator.controller.ts
  → primary mode: POST /evaluate-v2 returns the v2 decision; on safety/regression breach, fall back to v1

apps/claw-routing-service/src/app/config/app.config.ts
  → ROUTING_V2_PRIMARY_ENABLED, ROUTING_V2_CANARY_PERCENT, ROUTING_V2_ROLLBACK_SWITCH, threshold envs
```

## Canary bucketing

```typescript
// SHA-256(userId + orgId + "routing-v2-canary") % 100 < ROUTING_V2_CANARY_PERCENT
// Stable: same user always lands in same bucket across requests.
// Org-scoped: all users in an org can be canaried together.
// Override: ROUTING_V2_CANARY_USER_ALLOWLIST=u1,u2,u3  (force-in for testing)
//           ROUTING_V2_CANARY_USER_DENYLIST=u4,u5      (force-out, e.g. CEO)
```

## Guardrails

Comparator runs on every canary decision:

| Metric                     | Threshold env                                      | Default | Action if breached       |
|----------------------------|----------------------------------------------------|---------|--------------------------|
| regression %               | `ROUTING_V2_REGRESSION_THRESHOLD_PERCENT`          | 1       | Auto-disable canary      |
| cost increase %            | `ROUTING_V2_COST_INCREASE_THRESHOLD_PERCENT`       | 10      | Auto-disable canary      |
| confidence drop            | `ROUTING_V2_CONFIDENCE_DROP_THRESHOLD`             | 0.1     | Warn, log audit          |
| failure rate %             | `ROUTING_V2_FAILURE_RATE_THRESHOLD_PERCENT`        | 2       | Auto-disable canary      |

Rolling window: 100 requests OR 5 minutes (whichever first).

## Acceptance criteria

| # | Test                                                                                       | Expected                                                                |
|---|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| 1 | `ROUTING_V2_CANARY_PERCENT=5` + 1000 requests                                              | ~50 requests hit v2; same userId always same bucket                    |
| 2 | v2 returns invalid `RoutingDecisionV2` (schema fail)                                       | Fall back to v1 silently; log warn; counter incremented                |
| 3 | v2 disagrees with v1 + post-execution outcome is `BAD_REGRESSION`                          | Comparator increments regression count; if rolling rate > threshold, canary disabled automatically |
| 4 | `ROUTING_V2_ROLLBACK_SWITCH=true` set                                                      | All canary traffic routes through v1; canary effectively disabled       |
| 5 | Comparison dashboard at `/routing/canary-comparison`                                       | Side-by-side: v1 picked X (cost $0.001), v2 picked Y (cost $0.0008), outcome= QUALITY_WIN |
| 6 | Promote suspicious case from canary → regression fixture                                   | Same flow as existing replay-lab promotion                              |
| 7 | Feature flag fully off (`ROUTING_V2_PRIMARY_ENABLED=false`)                                | v2 stays in shadow mode (old behavior); zero impact                    |

## Tests

```
apps/claw-routing-service/src/modules/route-evaluator/managers/__tests__/canary-bucket.manager.spec.ts
  - bucket hash is stable per user
  - bucket respects canary percent
  - allowlist forces inclusion
  - denylist forces exclusion
  - org-bucket includes all org members

apps/claw-routing-service/src/modules/route-evaluator/utilities/__tests__/decision-comparator.utility.spec.ts
  - detects regression when v1 was correct + v2 picked worse model
  - detects cost increase
  - detects confidence drop
  - detects rolling-window breach

apps/claw-chat-service/src/modules/chat/managers/__tests__/chat-execution.manager.canary.spec.ts
  - chat falls back to v1 when v2 invalid
  - chat respects canary flag

qa/test-routing-r2-v2-canary.sh
  - enable canary at 100% in a test env
  - fire 10 routing requests, assert all go to v2
  - inject a fake "v2 returns invalid decision" → assert v1 fallback
  - set ROUTING_V2_ROLLBACK_SWITCH=true → assert all subsequent requests bypass v2
```

## Observability

```
routing.canary.bucketed       userId=X bucket=v2|v1 percent=5
routing.canary.v2_succeeded   userId=X v1Provider=A v2Provider=B sameDecision=false
routing.canary.v2_fellback    userId=X reason=invalid_schema|safety|breach
routing.canary.guardrail_tripped metric=regression|cost|confidence|failure rate=X threshold=Y → AUTO-DISABLE
```

RabbitMQ:

```
routing.v2.canary_started     { userId, bucket }
routing.v2.canary_succeeded   { userId, v1Decision, v2Decision }
routing.v2.canary_fellback    { userId, reason }
routing.v2.canary_disabled    { metric, rate, threshold }
```

## Dashboard (admin)

New page `/routing/canary-comparison`:
- Live counter: canary % active, request count, regression %, cost delta %, failure %
- Recent disagreements table: v1 chose X / v2 chose Y / outcome / cost delta
- "Disable canary" big red button (sets `ROUTING_V2_ROLLBACK_SWITCH=true` via admin API)

## Rollback

Two layers:
1. Flip `ROUTING_V2_ROLLBACK_SWITCH=true` — single request bypass v2 in milliseconds.
2. Set `ROUTING_V2_CANARY_PERCENT=0` — canary disabled for new requests.

Automatic rollback when guardrail trips. Manual rollback via admin UI button.

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | v2 returns subtly worse decisions that aren't caught by guardrails | Run shadow comparison for 7 days BEFORE enabling primary canary; require ≤0.5% disagreement |
| 2 | Bucketing leaks state (same user gets different bucket on retry) | Hash is pure stateless function of (userId, orgId); test asserts stability |
| 3 | Guardrail false-positive trips canary on benign traffic | Rolling-window minimum 100 requests; warmup grace period of 50 requests after enable |
| 4 | Comparator latency drags hot path | Comparator runs async on `message.completed` event, not inline |
