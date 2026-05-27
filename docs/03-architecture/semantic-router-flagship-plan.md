# Semantic Router + Thread Context Flagship — Implementation Plan

Tracks delivery of `plan-prompts/ClawAI_semantic_router_thread_context_flagship_pack/`.
The goal is to evolve the router from a keyword-final classifier into a hybrid semantic
AI route planner with thread context, fallback execution, judge pipeline, and a
learning loop.

## 1. Current state audit (what already exists)

`claw-routing-service` is a 12-module platform:

| Module | Status | Notes |
|---|---|---|
| `classifier` | live (v1 hot path) | keyword + category detection in `RoutingManager` |
| `cost-budget` | live | per-user / per-org budget caps |
| `health` | live | provider health snapshots |
| `intelligence` | partial | consensus, embedding-router, multi-intent-splitter, latency-circuit-breaker etc.; **not** wired into AUTO hot path |
| `language-detection` | live | EN/AR/etc. detection |
| `learning-loop` | shadow | feedback + judge outcomes stored, **not** read by hot path |
| `modality-detection` | live | image / video / audio / file intent |
| `observability` | live | decision traces, replay lab |
| `playground` | partial | API exists; FE page exists but lacks semantic mode |
| `reliability` | live | circuit breakers |
| `route-evaluator` | shadow (v2) | scoring engine; shadow-only |
| `router-models` | live | ROUTER role catalog, prompt builder |
| `routing` | live (v1 hot path) | `RoutingManager.handleAuto()` is the keyword pipeline |
| `scoring` | live | numeric scorer used by v2 |
| `sync` | live | model registry sync |
| `taxonomy` | live | DomainTag / WorkflowKind enums |
| `workflows` | partial | many `WorkflowKind` values not live |

`claw-chat-service` already provides:

| Manager | Provides | Gap vs flagship |
|---|---|---|
| `ContextAssemblyManager` | thread messages, memories, context packs, files, research, token budget truncation | no follow-up detection, no thread summarization, no inclusion audit, output shape isn't a named `ThreadExecutionContext` |
| `ChatExecutionManager` | single-shot execute, fast-path, fallback chain (partial), judge dispatch | fallback is per-message ad hoc; no formal `AttemptRecord` log; no quality-check escalation |
| `ParallelExecutionManager` | compare mode (parallel multi-model) | already passes assembled context to every model ✓ |
| `JudgeRefereeManager` | judge / verify path | already receives assembled context ✓ |
| `EscalationChainManager` | escalation across models | exists but not the standard fallback path |

**Bottom line.** ~70% of the pieces exist; the work is wiring, hot-path swap, and
filling the missing manager (Thread Context Collector v2, Semantic Intent Analyzer,
AI Route Planner, true 3-attempt Fallback Executor, Learning Loop closure).

## 2. Phased rollout

Each phase ships behind a feature flag so production can keep the v1 hot path
while we validate. Flags live in `apps/claw-routing-service/src/app/config/app.config.ts`
and `apps/claw-chat-service/src/app/config/app.config.ts`.

### Phase 1 — Foundation (this session)
- Feature flag plumbing (8 env vars).
- Follow-up detection utility (semantic heuristic + Ollama-assisted check).
- Thread context inclusion audit (every assembled context emits a
  `inclusionExplanation: string[]` so debug UIs can render "what was used").
- Master plan doc (this file).
- Documentation for what shipped.

### Phase 2 — Semantic Intent Analyzer (shadow)
- New `SemanticIntentAnalyzerManager` in `routing-service/src/modules/intelligence/`.
- Ollama-routed analyzer prompt returning `SemanticIntentAnalysis` JSON
  (Zod-validated, retry-once-on-invalid).
- Shadow mode: runs alongside v1, results stored on `RoutingDecision`, never
  changes the actual route.
- Tests: 50 unit cases covering ambiguity / domain / risk / follow-up.

### Phase 3 — Model Intelligence enrichment
- Extend `RouterModelIntelligence` with `domainStrengths`, `weakDomains`,
  `bestFor`, `avoidFor`, `learnedScores[]`.
- Backfill from existing `ConnectorModel`, `LocalModel`, `FrontierCatalogEntry`.
- Admin override CRUD endpoint + FE form on `/models/intelligence` (new page).
- Schema migration on `claw-routing` (additive).

### Phase 4 — AI Route Planner (shadow → canary)
- New `AIRoutePlannerManager` in `routing-service`.
- Inputs: thread context + semantic intent + scored candidates + policy + health.
- Output: `AIRoutePlan` (Zod-validated).
- Validation gates: available / capable / not router-only / privacy / budget.
- Shadow first, then 5% canary, then 25%, 50%, 100% (env-flagged).

### Phase 5 — True 3-attempt Fallback Executor
- Extract from `ChatExecutionManager` into dedicated `FallbackExecutorManager`.
- Use the `fallbackChain` from `AIRoutePlan`.
- Quality check (`ResponseQualityCheck`) between attempts.
- Per-attempt `AttemptRecord` in DB + frontend developer drawer.

### Phase 6 — Workflow live wiring
- Implement: `SEARCH_FIRST`, `EXTRACT_FIRST`, `PDF_EXTRACTION`,
  `YOUTUBE_TRANSCRIPT`, `IMAGE_ANALYSIS`, `CODE_REVIEW`.
- Mark unavailable workflows honestly (UI badge + planner constraint).

### Phase 7 — Judge for high-risk routing
- Auto-set `requiresJudge=true` when `riskLevel ∈ {HIGH, CRITICAL}` or
  domain ∈ {legal, medical, finance, security}.
- Judge receives same `ThreadExecutionContext` as primary model.
- Escalation on judge REVISE/ESCALATE → fallback attempt.

### Phase 8 — UI transparency
- "Why this model?" panel under every assistant message.
- `/routing/decisions/:id/detail` drawer with semantic intent, candidates, attempts, judge result.
- Thread context inspector in dev mode (`ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED`).
- Playground "semantic mode" tab.

### Phase 9 — Learning loop closure
- `LearningSignalRepository` already exists; wire its scores into
  `ScoringEngineManager.applyLearnedBoost()`.
- Bounded adjustment (±15% max influence).
- Admin override beats learned score.
- Rollback snapshot per feature-flag flip.

### Phase 10 — QA / regression / release
- 500-prompt regression suite in `qa/routing-regression/`.
- Thread-context test suite (15 cases from the prompt's §16.5).
- Fallback test suite (10 cases from §16.6).
- Security test suite (9 cases from §16.7).
- Load test (100 req/s routing).
- UAT script for non-technical reviewer.

## 3. Feature flags

| Flag | Default | What it gates |
|---|---|---|
| `ROUTING_SEMANTIC_ANALYZER_ENABLED` | `false` | run analyzer shadow path |
| `ROUTING_SEMANTIC_ANALYZER_USE_FOR_ROUTING` | `false` | promote analyzer to hot path |
| `ROUTING_AI_ROUTE_PLANNER_ENABLED` | `false` | run planner shadow path |
| `ROUTING_AI_ROUTE_PLANNER_USE_FOR_ROUTING` | `false` | promote planner to hot path |
| `ROUTING_V2_CANARY_PERCENT` | `0` | percent of traffic routed via v2 evaluator |
| `ROUTING_THREAD_CONTEXT_INJECTION_ENABLED` | `true` | already true today; flag enables follow-up detection + summarization |
| `ROUTING_FALLBACK_ATTEMPTS_ENABLED` | `false` | swap to formal `FallbackExecutorManager` |
| `ROUTING_MAX_FALLBACK_ATTEMPTS` | `3` | max attempts when above is true |
| `ROUTING_JUDGE_HIGH_RISK_ENABLED` | `false` | auto-judge for risky routes |
| `ROUTING_DEBUG_CONTEXT_INSPECTOR_ENABLED` | `false` | dev-only UI panel |

## 4. Phase 1 deliverables shipped this session

- `apps/claw-chat-service/src/modules/chat-messages/utilities/follow-up-detection.utility.ts`
  — heuristic detector for "continue", "make it shorter", "translate it", "do
  the second one", "regenerate", "fix it", "add tests", "in arabic", "compare
  them"… returns `{ isFollowUp: boolean, signals: string[], confidence: number }`.
- `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/follow-up-detection.utility.spec.ts`
  — 30+ unit tests across positive / negative / multilingual / ambiguous cases.
- `apps/claw-chat-service/src/modules/chat-messages/types/context.types.ts` extended
  with optional `inclusionExplanation: string[]` on `AssembledContext` so
  every assembled context records why each block was included; populated by
  `ContextAssemblyManager.assemble()`.
- `apps/claw-routing-service/src/app/config/app.config.ts` + `.env.example`
  extended with all 10 feature flags above (defaults preserve current
  behavior).
- `apps/claw-chat-service/src/app/config/app.config.ts` mirrors the flags it
  consumes.

## 5. Hard rules carried forward from the prompt

1. Keywords stay as weak signals; they never overrule the planner's final decision.
2. Router models never answer the user directly.
3. Router-only models are never selected as executors.
4. Manual model still receives full thread context.
5. Compare / judge / fallback / search-first paths all use the same
   `ThreadExecutionContext`.
6. Privacy / local-only constraints always win over semantic routing.
7. Unknown capability ≠ supported.
8. High-risk tasks (medical / legal / finance / safety) prefer stronger model + judge.
9. No release until §19 release gates pass.
10. Every phase ships behind a flag; rollback is one env-var flip.

## 6. Where to find each piece of the flagship prompt

| Prompt section | Repo location |
|---|---|
| §4 Thread context | `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts` |
| §5 Semantic analyzer | (new) `apps/claw-routing-service/src/modules/intelligence/managers/semantic-intent-analyzer.manager.ts` |
| §6 Model intelligence | `apps/claw-routing-service/src/modules/router-models/` |
| §7 AI route planner | (new) `apps/claw-routing-service/src/modules/intelligence/managers/ai-route-planner.manager.ts` |
| §8 Scoring engine | `apps/claw-routing-service/src/modules/scoring/` |
| §9 Workflows | `apps/claw-routing-service/src/modules/workflows/` |
| §10 Fallback executor | `apps/claw-chat-service/src/modules/chat-messages/managers/escalation-chain.manager.ts` (becomes the basis for the new FallbackExecutorManager) |
| §11 Prompt assembly | `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts` |
| §12 Decision persistence | `apps/claw-routing-service/prisma/schema.prisma` `RoutingDecision` model |
| §13 UI | `apps/claw-frontend/src/app/(portal)/routing/` |
| §14 API | `apps/claw-routing-service/src/modules/{intelligence,playground,routing,observability}/controllers/` |
| §16 Tests | `qa/routing-*` + each service's `__tests__/` |
