# Stream 10 — R.9 Quality + Reliability Hardening

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/10_R9_quality_reliability_hardening.md`

## Mission

Make the routing service production-grade with real test coverage, regression suites, load tests, drift detection, and release gates.

## Test coverage targets

| Component | Current (est) | Target initial | Target final |
|-----------|--------------:|---------------:|-------------:|
| `routing.manager.ts` (1635 LOC) | ~10% | 80% | 92% |
| `route-evaluator/` v2 | ~30% | 80% | 92% |
| `scoring/scoring-engine.manager.ts` | ~20% | 80% | 92% |
| `workflows/workflow-orchestrator.manager.ts` | 0% (scaffold) | 80% (after R.3) | 92% |
| `classifier/classifier.manager.ts` | ~40% | 85% | 92% |
| `learning-loop/learning-loop.manager.ts` | ~30% | 80% | 92% |
| `reliability/circuit-breaker.manager.ts` | ~50% | 85% | 92% |
| `sync/router-sync.manager.ts` | ~40% | 80% | 92% |
| `observability/observability.service.ts` | ~30% | 75% | 90% |

## Test artifacts to ship

```
apps/claw-routing-service/test/
├── fixtures/
│   ├── routing-500-prompts.json                    (500-prompt regression set)
│   ├── multilingual-routing-prompts.json           (top 8 languages, 25 each)
│   ├── multimodal-routing-prompts.json             (PDF/YouTube/audio/video × 25 each)
│   ├── replay-confirmed-regressions.json           (promoted suspicious cases)
│   └── provider-mock-responses.json                (mocks for OpenAI/Anthropic/Gemini/etc.)
├── load/
│   ├── routing-decision-load.k6.js                 (k6 script: 100 req/s × 10 min)
│   ├── routing-decision-spike.k6.js                (spike: 500 req/s × 30s)
│   └── README.md                                   (how to run, expected p95)
├── integration/
│   ├── routing-flagship-end-to-end.spec.ts         (50 prompts through full v2 pipeline)
│   ├── routing-fallback-chain.spec.ts              (force each provider to fail in turn)
│   └── routing-canary-comparison.spec.ts           (assert v1 vs v2 outcomes)
└── regression/
    ├── routing-regression-runner.ts                (re-runs 500-prompt set; outputs diff)
    └── routing-drift-detector.ts                   (compares against baseline snapshot)
```

## QA scripts to add

```
qa/test-routing-r9-coverage.sh           — npm test:cov; fails if <80%
qa/test-routing-r9-regression-500.sh     — fires 500 prompts; asserts ≥99% stable outcome
qa/test-routing-r9-load.sh               — runs k6 load test; asserts p95 < 50ms
qa/test-routing-r9-drift.sh              — runs drift detector; alerts if accuracy drop > 2%
qa/test-routing-r9-provider-mock.sh      — runs against mock provider suite (no cloud cost)
qa/test-routing-r9-migration-rollback.sh — applies + rolls back each migration; asserts no data loss
```

## CI integration

Add to `.github/workflows/ci.yml`:

```yaml
jobs:
  routing-regression:
    runs-on: ubuntu-latest
    needs: [build]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd apps/claw-routing-service && npm run test:cov
      - run: cd apps/claw-routing-service && bash ../../qa/test-routing-r9-regression-500.sh
      - name: Block PR on regression
        run: |
          REGRESSION_COUNT=$(jq '.bad_regression' apps/claw-routing-service/test/regression/results.json)
          if [ "$REGRESSION_COUNT" -gt "0" ]; then
            echo "FAIL: $REGRESSION_COUNT regressions"
            exit 1
          fi
```

## Drift detection

Cron `0 4 * * *` (4 AM daily):

```
1. Run routing on the 500-prompt baseline fixture set
2. Compare to last RoutingCalibrationSnapshot
3. If accuracy delta > 2% → emit `routing.drift.detected` event
4. Alert via existing audit channel
5. Generate `claudePrompt` for diagnosis (similar to Replay Lab export)
```

## Provider mock suite

```
apps/claw-routing-service/test/mocks/
├── openai.mock.ts                  (deterministic responses for routing tests)
├── anthropic.mock.ts
├── gemini.mock.ts
├── deepseek.mock.ts
├── grok.mock.ts
├── ollama.mock.ts
└── llamacpp.mock.ts
```

Used by integration + regression tests so they don't cost real API tokens.

## Release gates

Add `docs/16-quality-engineering/ROUTING_RELEASE_GATE.md`:

```
RELEASE GATE — routing-service

MUST PASS before any merge to main:

[ ] npm run typecheck     → 0 errors
[ ] npm run lint          → 0 errors
[ ] npm run test:cov      → ≥80% on all 4 metrics (statements/branches/functions/lines)
[ ] qa/test-routing-r9-regression-500.sh → 0 confirmed regressions
[ ] qa/test-routing-r9-load.sh           → p95 < 50ms
[ ] qa/test-routing-r9-drift.sh          → no drift alert
[ ] qa/test-routing-r9-migration-rollback.sh → no data loss
[ ] Docker logs check                    → 0 UnhandledPromiseRejection
[ ] CHANGELOG updated
[ ] Per-stream docs updated for any flag activation
```

## Acceptance

| # | Test | Expected |
|---|------|----------|
| 1 | npm run test:cov in clean repo | ≥80% statements/branches |
| 2 | Add a routing regression by hand-editing routing.constants.ts | 500-prompt regression suite catches it; PR blocked |
| 3 | Run k6 load test | p95 routing decision < 50ms at 100 req/s |
| 4 | Drift detector against frozen baseline | Identifies the change; emits alert |
| 5 | Add a new migration + rollback test | Both forward + backward succeed without data loss |
| 6 | Provider mock test (no live cloud) | Tests pass deterministically; runs in CI |

## Rollback

These are quality + CI artifacts, not features. "Rollback" = remove from CI workflow (doesn't affect runtime).
