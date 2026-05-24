# Stream 09 — R.8 Advanced Routing Intelligence

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/09_R8_advanced_routing_intelligence.md`

## Mission

Nine independent sub-features that each make the router smarter. Each ships behind its own flag and can be activated independently.

## Sub-features

### 9.1 — Prompt-length-aware filtering

**Trigger:** routing context arrives with token-count estimate.
**Behavior:** filter out candidates with `contextWindowTokens < estimatedTokens × 1.2` (20% headroom).
**Data needed:** existing `RouterModelRegistry.contextWindowTokens` (already there).
**UI:** in playground score breakdown, show "filtered: insufficient context window".
**Tests:** 100k-token prompt cannot route to 4k-context model; near-boundary uses cushion.
**Flag:** `ROUTING_R8_PROMPT_LENGTH_FILTER_ENABLED`.
**Rollback:** flag off.

### 9.2 — Latency-based circuit breaker

**Trigger:** rolling p95 latency for provider exceeds `ROUTING_R8_LATENCY_CIRCUIT_THRESHOLD_MS` (default 15000).
**Behavior:** open circuit; same lifecycle as existing failure-based breaker (HALF_OPEN probe → CLOSE on success).
**Data needed:** existing `RouterCircuitBreaker` table extended with `trigger='LATENCY_P95'` + `latencyThresholdMs` column.
**UI:** circuit-breaker dashboard (stream R.5) shows trigger reason.
**Tests:** simulate slow provider → assert circuit opens after threshold breach.
**Flag:** `ROUTING_R8_LATENCY_CIRCUIT_BREAKER_ENABLED`.
**Rollback:** flag off; failure-based circuit unchanged.

### 9.3 — Switch model mid-stream

**Trigger:** first SSE chunk takes >`ROUTING_R8_MID_STREAM_FIRST_CHUNK_MAX_MS` (default 5000).
**Behavior:** kill the in-flight call; immediately reroute to next-best candidate; UI shows "switched to faster model" inline notice.
**Data needed:** chat-service must support call cancellation mid-stream.
**Risk:** lose partial output; user sees brief flicker.
**Flag:** `ROUTING_R8_MID_STREAM_SWITCH_ENABLED`.
**Rollback:** flag off — stay with original model regardless.

### 9.4 — Fine-tuned model preference per user

**Trigger:** user has a `UserFineTunePreference` row for the detected domain.
**Behavior:** boost their fine-tune in scoring engine by `weight` × `learnedBiasWeightMax`.
**Data needed:** new `UserFineTunePreference` table (see PRISMA_FUTURE_MODELS.md 09.4).
**UI:** `/settings/fine-tunes` — manage own preferences.
**Tests:** user with fine-tune for "legal" → routes to their fine-tune over claude-opus-4 for legal questions.
**Flag:** `ROUTING_R8_FINE_TUNE_PREFERENCE_ENABLED`.
**Rollback:** flag off.

### 9.5 — Region-aware routing

**Trigger:** routing context has `userRegion` (EU/US/APAC) OR org has region preference.
**Behavior:** prefer regional endpoint (e.g. Bedrock us-east-1 vs eu-west-1) for GDPR compliance + latency win.
**Data needed:** new `RouterRegionPreference` table + connector-service must expose region endpoints (Blocker B5).
**Tests:** EU user gets eu-west-1; GDPR-tagged data forces EU even for US-based user.
**Flag:** `ROUTING_R8_REGION_AWARE_ROUTING_ENABLED`.
**Rollback:** flag off — default region used.

### 9.6 — Multi-intent splitter

**Trigger:** message has 2+ detected intents (e.g. "code + image", "translate + summarize").
**Behavior:** split into N parallel routed calls; merge results into a single response.
**Data needed:** existing `MULTI_INTENT_PRIORITY` constants + chat-service must support parallel-result merging.
**UI:** message shows N pills, one per sub-intent, with per-sub-result.
**Tests:** "write code AND a marketing email" → 2 routes; "translate AND summarize" → 2 routes.
**Flag:** `ROUTING_R8_MULTI_INTENT_SPLITTER_ENABLED`.
**Rollback:** flag off — picks priority winner only (current behavior).

### 9.7 — Embedding-task routing

**Trigger:** `EMBEDDING` modality detected (Stream R.2).
**Behavior:** new evaluator branch picks embedding-specific model (text-embedding-3-large / nomic-embed-text / etc.).
**Data needed:** RouterModelRegistry must include embedding models.
**Tests:** "embed this paragraph" → text-embedding-3-large; "use local" → nomic-embed-text.
**Flag:** `ROUTING_R8_EMBEDDING_ROUTING_ENABLED`.
**Rollback:** flag off — embeddings get classified as text routing (suboptimal but not broken).

### 9.8 — Ensemble consensus mode

**Trigger:** new `RoutingMode.CONSENSUS` OR high-stakes domain (medical/legal) auto-promoted.
**Behavior:** fire 3 models in parallel; score agreement; return highest-confidence answer + agreement score.
**Data needed:** chat-service parallel infrastructure (exists for `/chat-messages/parallel`).
**Tests:** medical question → 3 models agree → high-confidence; 3 disagree → flag as uncertain.
**Flag:** `ROUTING_R8_CONSENSUS_MODE_ENABLED`.
**Rollback:** flag off — falls back to JUDGE_PIPELINE or DIRECT_LLM.

### 9.9 — Cost / quality slider

**Trigger:** user has set a slider value 0-100 in `/settings`.
**Behavior:** scoring engine uses `qualityWeight = slider/100`, `costWeight = 1 - qualityWeight`.
**Data needed:** new `UserCostQualitySlider` table (see PRISMA_FUTURE_MODELS.md 09.9).
**UI:** `/settings/routing-preferences` — slider with live preview.
**Tests:** slider=0 → cheapest; slider=100 → best quality; slider=50 → balanced.
**Flag:** `ROUTING_R8_COST_QUALITY_SLIDER_ENABLED`.
**Rollback:** flag off — uses default 0.5 weight.

## Module structure (scaffold included)

```
apps/claw-routing-service/src/modules/intelligence/        (NEW MODULE — umbrella for 9 sub-features)
├── intelligence.module.ts
├── managers/
│   ├── prompt-length-guard.manager.ts                     (9.1)
│   ├── latency-circuit-breaker.manager.ts                 (9.2)
│   ├── mid-stream-switcher.manager.ts                     (9.3)
│   ├── fine-tune-preference.manager.ts                    (9.4)
│   ├── region-router.manager.ts                           (9.5)
│   ├── multi-intent-splitter.manager.ts                   (9.6)
│   ├── embedding-router.manager.ts                        (9.7)
│   ├── consensus-mode.manager.ts                          (9.8)
│   └── cost-quality-slider.manager.ts                     (9.9)
├── types/
│   └── intelligence.types.ts
└── constants/
    └── intelligence.constants.ts
```

## Acceptance per sub-feature

| # | Feature | Acceptance |
|---|---------|------------|
| 9.1 | Prompt length | 100k-token msg → only 128k+ context candidates |
| 9.2 | Latency circuit | p95 > 15s for 5 min → circuit OPEN |
| 9.3 | Mid-stream switch | First chunk > 5s → killed + rerouted |
| 9.4 | Fine-tune | User with fine-tune for legal → biased toward it |
| 9.5 | Region | EU user → EU endpoint |
| 9.6 | Multi-intent | 2 intents → 2 parallel calls |
| 9.7 | Embedding | Embedding intent → embedding model |
| 9.8 | Consensus | 3 models fire; agreement scored |
| 9.9 | Slider | Slider value affects scoring weight |

## Tests + flag matrix

```
qa/test-routing-r8.1-prompt-length.sh
qa/test-routing-r8.2-latency-circuit.sh
qa/test-routing-r8.3-mid-stream-switch.sh
qa/test-routing-r8.4-fine-tune.sh
qa/test-routing-r8.5-region.sh
qa/test-routing-r8.6-multi-intent.sh
qa/test-routing-r8.7-embedding.sh
qa/test-routing-r8.8-consensus.sh
qa/test-routing-r8.9-cost-quality-slider.sh
```

## Rollback

Each sub-feature has its own flag. Disabling one does NOT affect the others.
