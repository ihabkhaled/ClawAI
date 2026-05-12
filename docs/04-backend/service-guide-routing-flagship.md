# Smart Router Flagship — claw-routing-service guide

> Companion to the existing `service-guide-routing.md`. This guide documents
> the v2 flagship modules added on 2026-05-11/12 (Phases 1, 2, 3, 7, 9, 10, 11, 12).
> Legacy `/evaluate` and `/replay` endpoints still live in routing.manager.ts;
> the flagship surface lives in new modules under `src/modules/`.

## Module map

```
src/modules/
├── router-models/         Phase 1  — RouterModelRegistry CRUD + admin overrides
├── taxonomy/              Phase 2  — TaxonomyRole CRUD + DomainTag enum exposure
├── classifier/            Phase 2  — deterministic keyword classifier
├── scoring/               Phase 3  — 14-dim scoring engine
├── route-evaluator/       Phase 7  — Zod-validated RoutingDecisionV2 + route-only contract
├── workflows/             Phase 9  — WorkflowSelectorManager (13 workflow kinds)
├── learning-loop/         Phase 10 — bounded LearnedScore updates
├── observability/         Phase 11 — RoutingDecision aggregation summary
├── reliability/           Phase 12 — persisted circuit breakers
└── routing/               (existing legacy)
```

## Database tables added

| Table                     | Phase | Purpose                                                                             |
| ------------------------- | ----- | ----------------------------------------------------------------------------------- |
| `router_model_registry`   | 1     | Canonical model identity (provider, modelKey, modalities, cost, latency, lifecycle) |
| `router_admin_overrides`  | 1     | Per-(profile, fieldName) admin pins; sync workers must skip these fields            |
| `taxonomy_roles`          | 2     | Professional roles → domain + privacy default                                       |
| `router_workflows`        | 9     | 13 default workflows + custom                                                       |
| `router_learned_scores`   | 10    | Per-(profileKey, domain, taskFamily) learned successRate                            |
| `router_circuit_breakers` | 12    | Persisted CB state per provider scope                                               |

All migrations are **additive only** — existing tables untouched.

## New API surface

All under `/api/v1/routing/`, JWT-auth required.

### Models registry (Phase 1)

- `GET /models` — paginated list (filters: provider, lifecycle, isLocal, isRouterOnly, domain, search)
- `GET /models/:id`
- `POST /models` (ADMIN) — create custom profile
- `PATCH /models/:id` (ADMIN) — update + auto-creates RouterAdminOverride row for managed fields
- `DELETE /models/:id` (ADMIN) — soft-delete (lifecycle=REMOVED)
- `GET /models/:id/overrides` (ADMIN+OPERATOR)
- `DELETE /models/:id/overrides/:fieldName` (ADMIN) — clear specific override

### Taxonomy (Phase 2)

- `GET /taxonomy/roles?industry=&domain=&search=`
- `GET /taxonomy/roles/:id`
- `POST /taxonomy/roles` (ADMIN)
- `GET /taxonomy/domains` — returns the DomainTag enum values

### Classifier (Phase 2)

- `POST /classify` — pure-function classifier (no DB write).
  - Body: `{ messageContent: string, attachedFileMimeTypes?: string[] }`
  - Returns: `ClassificationResult` with domain, secondaryDomain, taskFamily, modalityIn/Out, riskLevel, privacyClass, confidence, reasonTags.

### Scoring (Phase 3)

- `POST /score` (ADMIN+OPERATOR) — debug endpoint, no DB write.
  - Body: `{ classification, policy: { policyId, routingMode, weights? }, profileIds[] }`
  - Returns: `{ ranked: ScoredCandidate[], rejected: ScoredCandidate[] }` with 14-dim breakdowns.

### Route evaluator V2 (Phase 7)

- `POST /evaluate-v2`
  - Body: `{ messageContent, attachedFileMimeTypes?, routingMode?, policyId?, forcedProvider?, forcedModel?, debug? }`
  - Returns: Zod-validated `RoutingDecisionV2`. When `debug:true`, includes top-5 candidates + breakdown.
  - Hard rejects router-only models from candidate set before scoring.
  - Returns `noExecutionModelIssue` when no candidate passes (NO_HEALTHY_EXECUTION_MODEL, NO_PRIVACY_COMPLIANT_MODEL, NO_MODALITY_MATCH, MANUAL_SELECTION_INVALID).

### Learning loop (Phase 10)

- `POST /learning-loop/feedback` — body `{ profileKey, domain, taskFamily, signal }`. Updates LearnedScore with bounded adjustment.
- `GET /learning-loop/profile/:profileKey` — per-domain scores for one profile.

### Circuit breakers (Phase 12)

- `GET /circuit-breakers` — list all
- `GET /circuit-breakers/:scope` — single snapshot
- `POST /circuit-breakers/:scope/reset` (ADMIN) — force CLOSED

### Observability (Phase 11)

- `GET /observability/summary?from=&to=` — aggregate metrics over RoutingDecision rows in window.

## Event emissions (Phase 1, 7, 10, 12)

Published on `claw.events` topic exchange:

| Event                               | Publisher       | Audited by | Severity |
| ----------------------------------- | --------------- | ---------- | -------- |
| `routing.profile.created`           | router-models   | audit      | LOW      |
| `routing.profile.updated`           | router-models   | audit      | LOW      |
| `routing.profile.lifecycle_changed` | router-models   | audit      | MEDIUM   |
| `routing.policy.changed`            | (Phase 4)       | audit      | MEDIUM   |
| `routing.learned_score.updated`     | learning-loop   | audit      | LOW      |
| `routing.no_execution_model`        | route-evaluator | audit      | HIGH     |
| `routing.circuit_breaker.opened`    | reliability     | audit      | HIGH     |
| `routing.circuit_breaker.closed`    | reliability     | audit      | MEDIUM   |
| `routing.circuit_breaker.half_open` | reliability     | audit      | MEDIUM   |

Audit consumer: `apps/claw-audit-service/src/modules/audits/consumers/routing.consumer.ts`.

## Default policy weight tables (Phase 3)

Each `RoutingMode` carries a 14-dim weight vector summing to 1.0 ± 0.001:

| Mode             | Top weight                 | Behavior                                   |
| ---------------- | -------------------------- | ------------------------------------------ |
| `AUTO`           | capability=0.18            | balanced default                           |
| `COST_SAVER`     | cost=0.28                  | prefers FREE/CHEAP, accepts B-tier         |
| `LOW_LATENCY`    | latency=0.28               | prefers FAST/REALTIME                      |
| `HIGH_REASONING` | capability=0.22            | demands S/A tier                           |
| `PRIVACY_FIRST`  | privacy=0.28               | prefers local                              |
| `LOCAL_ONLY`     | privacy=0.18               | hard rejects non-local                     |
| `MANUAL_MODEL`   | capability=0.5, health=0.2 | scoring bypassed; validates selection only |

Constants: `src/modules/scoring/constants/scoring.constants.ts`.

## Workflow selector priority (Phase 9)

```
PDF_INPUT       → PDF_EXTRACTION
YOUTUBE_INPUT   → YOUTUBE_TRANSCRIPT
AUDIO_INPUT     → AUDIO_TRANSCRIBE
VIDEO_INPUT     → VIDEO_ANALYSIS
IMAGE_INPUT     → IMAGE_ANALYSIS
SPREADSHEET     → EXTRACT_FIRST
IMAGE_OUTPUT    → IMAGE_GENERATION
STRUCTURED_OUT  → FILE_GENERATION
"compare X..."  → COMPARE_ENSEMBLE
"review code"   → CODE_REVIEW (+ judge if non-LOW risk)
"latest..."     → SEARCH_FIRST
HIGH+sensitive  → JUDGE_PIPELINE  (MEDICAL/LEGAL/FINANCE/MENTAL_HEALTH)
otherwise       → DIRECT_LLM
```

## Learning loop deltas (Phase 10)

Per-signal `successRate` adjustment, clamped to `[0.3, 0.95]`:

| Signal             | Δ      |
| ------------------ | ------ |
| POSITIVE           | +0.020 |
| JUDGE_VERIFIED     | +0.015 |
| NEGATIVE           | −0.030 |
| JUDGE_REVISED      | −0.020 |
| JUDGE_ESCALATED    | −0.040 |
| FALLBACK_TRIGGERED | −0.005 |

20 consecutive NEGATIVES from a 0.4 baseline cannot drop below 0.3 (verified by unit test).

## Seeding

Seeds live under `prisma/`:

```bash
cd apps/claw-routing-service
npx prisma migrate deploy          # apply 5 migrations
npx tsx prisma/seed-router-models.ts   # ~25 cloud + local profiles
npx tsx prisma/seed-taxonomy.ts        # ~110 professional roles
npx tsx prisma/seed-workflows.ts       # 13 default workflows
```

## Testing

- 209 new unit tests across phases 1, 2, 3, 7, 9, 10, 11, 12 (`src/modules/**/__tests__/`)
- Master harness: `qa/test-router-flagship.sh` (gitignored runtime artifact)
- Routing-service test suite: 34 suites / 535 tests pass; typecheck clean; lint 0 errors

## Known gaps (deferred)

- **Phase 4** — `/routing` policies page UI overhaul (weights editor, simulator)
- **Phase 5** — `/routing/models` admin table + drawer
- **Phase 6** — connector/ollama/llamacpp internal snapshot endpoints + sync workers
- **Phase 8** — wire ScoringEngineManager into legacy `routing.manager.ts.evaluate()` so the existing `/evaluate` endpoint uses the new scorer (currently only `/evaluate-v2` does)
- **Phase 13** — simulator UI + fixture management UI
- **Phase 14** — full 60-prompt browser UAT execution
- **Phase 15** — sales / marketing positioning doc

See `plan-prompts/smart-router-flagship-implementation/` for the original 15-prompt plan and per-phase execution prompts.
