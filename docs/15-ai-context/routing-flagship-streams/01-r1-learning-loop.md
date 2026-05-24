# Stream 01 — R.1 Close the Learning Loop

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/01_R1_close_learning_loop.md`

## Mission

Make the data already collected by `RouterLearnedScore`, `RouterTopicProfile`, `RoutingOutcomeRecord`, and `RoutingFeedbackRecord` actually influence future routing decisions in the v1 hot path.

## Current state (from audit)

- `RouterEducationManager.ingestExecutionOutcome()` writes `RouterModelProfile` + `RouterLearnedScore` rows on `message.completed`.
- `RouterEducationManager.ingestFeedbackSignal()` writes the same on `message.feedback_set`.
- `LearningLoopManager` produces `RouterLearnedScore` via `bounded-adjust.utility.ts`.
- **`RoutingManager.handleAuto()` never reads any of it.** Hot path is keyword-based + Ollama-router only.
- v2 evaluator (`route-evaluator/`) consumes the learned data but runs in shadow mode.

## Files to add (scaffold included in this branch)

```
apps/claw-routing-service/src/modules/routing/
├── managers/
│   └── learned-bias.manager.ts                       (NEW — new manager)
├── utilities/
│   ├── learned-bias-applier.utility.ts               (NEW)
│   └── confidence-calibrator.utility.ts              (NEW)
├── types/
│   ├── learned-bias.types.ts                         (NEW)
│   └── thread-sticky-route.types.ts                  (NEW)
└── constants/
    └── learned-bias.constants.ts                     (NEW)
```

## Files to modify (NOT scaffolded — needs careful integration)

```
apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts
  → handleAuto(): after category detection + before final selection, call LearnedBiasManager.applyBias()
  → handleAuto(): if thread sticky route enabled + thread has prior decision, prefer same provider+model
  → buildExplanation(): include learnedBiasReason in reasonTags

apps/claw-routing-service/src/modules/routing/services/routing.service.ts
  → publish new "routing.learned_bias_applied" event when bias changes a decision

apps/claw-routing-service/src/modules/routing/repositories/routing-decisions.repository.ts
  → findLastDecisionForThread(threadId): used by sticky route

apps/claw-routing-service/src/app/config/app.config.ts
  → add zod-validated env block for ROUTING_R1_*
```

## API contract — LearnedBiasManager

```typescript
// apps/claw-routing-service/src/modules/routing/managers/learned-bias.manager.ts

export type BiasInput = {
  userId: string;
  domain: DomainTag;
  taskFamily: string;
  candidates: CandidateModel[];
  privacyConstraint: PrivacyClass;
  threadId?: string;
};

export type BiasOutput = {
  candidates: CandidateModel[]; // re-scored
  appliedBias: {
    learnedScoreRows: string[];   // ids of rows that influenced the decision
    topicProfileRow?: string;
    sampleSize: number;
    biasWeight: number;
    reasonTag: string;            // 'learned_bias_thumbs_up_history' | 'sample_too_small_no_bias' | etc.
  };
};

@Injectable()
export class LearnedBiasManager {
  async applyBias(input: BiasInput): Promise<BiasOutput>;
}
```

## Bounded-bias algorithm

```
1. Fetch RouterLearnedScore rows for (userId, domain) — limit 50 most recent.
2. Fetch RouterTopicProfile row for (userId, taskFamily).
3. For each candidate model:
   - Look up score adjustment Δ from learned rows + topic profile.
   - Clamp Δ to ±ROUTING_R1_LEARNED_BIAS_WEIGHT_MAX (default 0.3).
   - If sample size < ROUTING_R1_MIN_SAMPLE_SIZE (default 10): use Δ × (sampleSize/min).
   - Add Δ to candidate.score.
4. Re-rank candidates.
5. NEVER promote a candidate that fails privacyConstraint (LOCAL_ONLY/LOCAL_PREFERRED).
6. NEVER promote a candidate that lacks required capability (vision/tools/streaming).
7. Return re-ranked list + appliedBias metadata.
```

## Confidence calibration

```
1. Rolling window: last ROUTING_R1_CONFIDENCE_CALIBRATION_WINDOW_DAYS (default 30) days.
2. For each routing signal (EXACT_KEYWORD, VERB_NOUN_COMBO, CATEGORY_KEYWORD, HEURISTIC_FALLBACK, PRIVACY_ENFORCED):
   - Compute hit rate = correct decisions / total decisions with that signal.
3. Replace constants with rolling values.
4. Snapshot weekly into RoutingCalibrationSnapshot.
5. Compare to baseline; alert if drop > drift threshold (Stream 09 / R.9).
```

## Per-thread sticky route

```
If ROUTING_R1_STICKY_THREAD_ROUTE_ENABLED=true:
  → Find last 5 RoutingDecision rows for context.threadId.
  → If all 5 picked same (provider, model) AND no privacy/capability change triggered → use same.
  → Otherwise fall through to AUTO.
```

## Acceptance criteria

| # | Test                                                                                       | Expected                                                                |
|---|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| 1 | User thumbs-downs gpt-4o-mini for 12 legal questions; thumbs-ups claude-opus-4 for 8       | Next legal question routes to claude-opus-4 even if keyword classifier first picks mini |
| 2 | Same as above with only 3 thumbs-downs                                                     | Sample too small; bias dampened; reasonTag includes `sample_too_small` |
| 3 | Privacy-keyword message + learned bias toward cloud model                                  | Local model wins; reasonTag includes `privacy_override_beats_learned`  |
| 4 | User on MANUAL_MODEL=gpt-4o; learned bias toward claude-sonnet-4                           | gpt-4o wins; learned bias not applied                                  |
| 5 | Thread has 5 prior decisions all on claude-sonnet-4; new message on same topic             | Sticky route picks claude-sonnet-4; reasonTag includes `thread_sticky` |
| 6 | Sticky route would pick a now-unhealthy model                                              | Falls through to AUTO; reasonTag includes `sticky_unhealthy_fallthrough`|
| 7 | RoutingDecision.explanation contains "learned bias adjusted score from X to Y"             | Visible in `/api/v1/routing/decisions/:threadId` response               |
| 8 | Feature flag off                                                                            | Hot path unchanged; no learned bias applied                            |

## Tests

```
apps/claw-routing-service/src/modules/routing/managers/__tests__/learned-bias.manager.spec.ts
  - applies positive bias from thumbs-ups history
  - applies negative bias from thumbs-downs history
  - clamps bias to ±weightMax
  - dampens bias when sample size below min
  - never overrides privacy constraint
  - never overrides capability requirement
  - never overrides manual user model
  - calibration uses rolling 30-day window

apps/claw-routing-service/src/modules/routing/utilities/__tests__/confidence-calibrator.utility.spec.ts
  - hit rate calculated correctly
  - default to constants when window empty
  - signals tracked independently

apps/claw-routing-service/src/modules/routing/managers/__tests__/routing.manager.sticky-route.spec.ts
  - sticky route picks last decision when 5/5 same
  - sticky route falls through on unhealthy model
  - sticky route disabled by flag

qa/test-routing-r1-learning-loop.sh
  - Live API test: seed 12 fake feedback rows, fire routing request, verify response includes learned bias reason tag
```

## Observability

New log lines (all `info` level, structured):

```
routing.learned_bias_applied  candidates=N userId=X domain=Y biasWeight=Z reasonTag=...
routing.sticky_thread_applied threadId=X provider=Y model=Z
routing.confidence_calibrated signal=EXACT_KEYWORD windowDays=30 hitRate=0.93
routing.privacy_override_beat_bias userId=X originalCandidate=Y replacedWith=Z
```

New RabbitMQ events:

```
routing.learned_bias_applied   { userId, domain, biasWeight, beforeScore, afterScore }
routing.confidence_recalibrated { signal, oldValue, newValue, windowDays }
```

## Rollback

```bash
echo 'ROUTING_R1_LEARNED_BIAS_ENABLED=false' >> .env
./scripts/claw.sh restart routing-service
```

Hot path reverts to keyword-only routing. Existing decisions in DB retain `learnedBiasReason` field (nullable).

## Risks

| # | Risk | Mitigation |
|---|------|------------|
| 1 | Learned bias amplifies user mistakes (e.g. user incorrectly thumbs-downs all coding answers) | Cap at ±0.3 weight; require min sample size; visible in explanation |
| 2 | Bias data leaks via reasonTag in chat UI ("we picked X because you hated Y") | reasonTag goes to admin replay only; user-facing explanation is generic |
| 3 | Hot path latency increases due to extra DB queries | Cache learned-bias rows per (userId, domain) for 5 min |
| 4 | First-week of activation: no bias data yet | Falls back to existing keyword routing — safe-by-default |
| 5 | Sticky route gets stuck on a broken model | Sticky checks isHealthy; sticky disabled when circuit breaker open |

## Implementation slices (PRs)

1. **Slice 1.1:** scaffold types + constants + LearnedBiasManager skeleton (this branch) + unit tests for applier
2. **Slice 1.2:** wire LearnedBiasManager.applyBias() call into `RoutingManager.handleAuto()` behind `ROUTING_R1_LEARNED_BIAS_ENABLED` flag; integration test
3. **Slice 1.3:** confidence calibrator + replace constants in routing.constants.ts; weekly snapshot cron
4. **Slice 1.4:** per-thread sticky route + tests
5. **Slice 1.5:** explanation surface in `RoutingDecision.explanation` field; surface in `/routing` admin UI
6. **Slice 1.6:** RabbitMQ events + audit logs

Each slice ships behind the flag — activation = flip flag in `.env`.
