# 00 — Master Routing Flagship Plan

**Source prompt:** `plan-prompts/ClawAI_routing_implementation_flagship_pack/00_MASTER_routing_implementation_flagship.md`

## Mission

Turn the routing audit into an implementation-grade flagship plan that makes ClawAI's router smarter, multimodal, learning-aware, workflow-aware, budget-aware, transparent, and production-grade.

## Implementation roadmap (release slices)

| Release | Streams | Goal | Acceptance |
|---------|---------|------|------------|
| **R1** | 01, 11.1, 11.2 | Closing the learning loop + visibility | LearnedScore biases hot path; explanation surfaces in chat; workflow kind on every decision |
| **R2** | 02, 06, 10 | Trust + safety | v2 canary 5% with rollback; playground UI; 500-prompt regression suite in CI |
| **R3** | 03, 11.4, 11.5, 11.10 | Multimodal detection | YouTube/PDF/video/audio/spreadsheet/URL/lang detection; modality stored on decision |
| **R4** | 04 | Workflows go live | JUDGE_PIPELINE, COMPARE_ENSEMBLE, SEARCH_FIRST, EXTRACT_FIRST, PDF_EXTRACTION, YOUTUBE_TRANSCRIPT, CODE_REVIEW all execute |
| **R5** | 05, 07 | Cost + multi-tenant | Per-user + per-org budgets; org-scoped policies; allow/deny lists |
| **R6** | 08, 09 | Intelligence + i18n | Language-aware routing; prompt-length filter; mid-stream switch; embedding routing; consensus; cost/quality slider |

## Dependency graph

```
            ┌────────────────────────┐
            │ 01 learning loop       │◄────────────────┐
            └───────┬────────────────┘                 │
                    │                                  │
            ┌───────▼────────────────┐                 │
            │ 02 v2 canary           │                 │
            └───────┬────────────────┘                 │
                    │                                  │
            ┌───────▼────────────────┐    ┌────────────┴───┐
            │ 04 workflows live      │◄──┤ 03 modality   │
            └───────┬────────────────┘    └────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   ┌────────┐ ┌─────────┐ ┌──────────┐
   │ 05 cost │ │ 06 playg │ │ 07 fleet │
   └────────┘ └─────────┘ └──────────┘
                    │
            ┌───────▼────────────────┐
            │ 08 i18n   09 advanced  │
            └────────────────────────┘
                    │
            ┌───────▼────────────────┐
            │ 10 quality (always-on) │
            └────────────────────────┘
```

## Owners / agents needed

| Domain | Owner agent |
|--------|-------------|
| Backend manager/service/repository | principal backend architect agent |
| Prisma migrations + seeders | principal data architect agent |
| Frontend pages/components/hooks | principal frontend architect agent |
| Scoring/learning algorithms | principal AI routing scientist agent |
| Workflow orchestration | principal LLM orchestration architect agent |
| QA / replay / regression | principal QA agency agent |
| Docs / runbooks | principal documentation owner agent |
| Release gates / canary / rollback | principal DevOps agent |

## Migration order (Prisma)

1. **R.1** — no new tables; reads existing `RouterLearnedScore`/`RouterTopicProfile`.
2. **R.4** — add `UserCostBudget` + index.
3. **R.6** — add nullable `orgId` to `RoutingPolicy` + composite index `(orgId, isActive, priority)`.
4. **R.7** — extend `RoutingDecision` with `detectedLanguage` + `languageConfidence` columns.
5. **R.2/R.3** — extend `RoutingDecision` with `detectedModalities Json` + `selectedWorkflow WorkflowKind` columns.
6. **R.8** — `RouterRegionPreference`, `UserCostQualitySlider`, `UserFineTunePreference` (one migration per sub-feature).

## Test strategy

Per-stream test plan in each `0X-name.md`. Cross-cutting:

- **Unit:** every manager method (≥80% coverage). Jest + ts-jest.
- **API:** `qa/test-routing-r<N>-<feature>.sh` per stream. Hits live backend, asserts DB rows + response shape.
- **Integration:** `qa/test-routing-integration-flagship.sh` — fires 50 prompts through R.1+R.2+R.3+R.4 pipeline, verifies decision lifecycle.
- **Regression:** `qa/test-routing-regression-500.sh` (Stream 10) — runs the 500-prompt validation set every CI.
- **Load:** `qa/test-routing-load.sh` (Stream 10) — 100 req/s × 10 min, p95 routing decision < 50 ms.
- **Playwright:** `apps/claw-frontend/e2e/routing-*.spec.ts` per UI stream (06, 11.3, 11.9).

## Rollback strategy

Every stream activation behind a feature flag in `.env`:

```
ROUTING_R1_LEARNED_BIAS_ENABLED=false
ROUTING_R2_MODALITY_DETECTION_ENABLED=false
ROUTING_R3_WORKFLOWS_ENABLED=false
ROUTING_R4_COST_BUDGET_ENABLED=false
ROUTING_R6_MULTI_TENANT_ENABLED=false
ROUTING_R7_LANGUAGE_DETECTION_ENABLED=false
ROUTING_R8_<subfeature>_ENABLED=false
ROUTING_V2_CANARY_PERCENT=0
ROUTING_V2_PRIMARY_ENABLED=false
ROUTING_V2_ROLLBACK_SWITCH=true
```

Flip flag → rollback in seconds. No data migration required to roll back a stream.

## Business positioning (1 sentence)

> "ClawAI isn't another AI wrapper — it's the intelligence layer that picks the right model and workflow for the task, with cost, privacy, latency, modality, domain awareness, learned feedback, and full transparency."

## Blockers identified

| # | Blocker | Stream | Resolution |
|---|---------|--------|------------|
| B1 | `chat-service` is the consumer of `/routing/evaluate`; activating R.1 requires no chat changes (it's transparent), but **R.2/R.3 require chat to pass attachment+URL metadata in the routing context** | 02, 03 | Add `RoutingContext.attachments` + `RoutingContext.urls` upstream in chat-service |
| B2 | `connector-service` must expose `freeTierRemaining` for R.4 free-tier awareness; not implemented today | 05 | New connector field + sync event |
| B3 | `WorkflowKind.JUDGE_PIPELINE` requires the chat execution layer to support multi-step LLM calls; currently single-call | 04 | Refactor `ChatExecutionManager` to support workflow handoff |
| B4 | Multi-tenant requires `User.orgId` end-to-end (auth-service); today users have no org | 07 | Add `Organization` + `OrganizationMember` to auth-service first (same model exists in agent-service but isolated) |
| B5 | Region routing needs Bedrock multi-region connector support | 09.5 | New `ConnectorRegion` table in connector-service |
