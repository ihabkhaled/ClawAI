# Routing Service

**Workspace:** [`apps/claw-routing-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-routing-service)  
**Port:** 4004  
**Database:** postgresql  
**Test runner:** vitest · **101 test files**  
**API endpoints:** 74

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-constants`
- `@claw/shared-entitlements`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `AssistantModel`
- `CapabilityEvidence`
- `ModelCostVersion`
- `ModelDeployment`
- `ReplayCase`
- `ReplayRun`
- `RouterAdminOverride`
- `RouterChainEntry`
- `RouterCircuitBreaker`
- `RouterConfiguration`
- `RouterLearnedScore`
- `RouterModelProfile`
- `RouterModelRegistry`
- `RouterProviderAttempt`
- `RouterTopicProfile`
- `RouterWorkflow`
- `RouterWorkspacePrior`
- `RoutingCalibrationSnapshot`
- `RoutingCandidateScore`
- `RoutingDecision`
- `RoutingFeedbackRecord`
- `RoutingOutcomeRecord`
- `RoutingPolicy`
- `SeedExecution`
- `TaxonomyRole`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/health/controllers/health.controller.ts) |
| `GET` | `/internal/assistant-models/:role/candidates` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/assistant-models/controllers/assistant-models-internal.controller.ts) |
| `GET` | `/internal/router-models/context-window/:provider/:model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-context-window-internal.controller.ts) |
| `GET` | `/internal/router-models/costs/:provider/:model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost-internal.controller.ts) |
| `GET` | `/router-models/costs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `POST` | `/router-models/costs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `GET` | `/router-models/costs/:provider/:model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `GET` | `/router-models/costs/:provider/:model/versions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `GET` | `/router-models/costs/catalog` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `POST` | `/router-models/costs/estimate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `POST` | `/router-models/costs/price` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-cost.controller.ts) |
| `GET` | `/router-models/intelligence/:provider/:model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-intelligence.controller.ts) |
| `PATCH` | `/router-models/intelligence/:provider/:model` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-intelligence.controller.ts) |
| `POST` | `/router-models/intelligence/:provider/:model/reset` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/model-intelligence.controller.ts) |
| `GET` | `/routing/adaptive-insights` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/assistant-models/:role` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/assistant-models/controllers/assistant-models.controller.ts) |
| `PUT` | `/routing/assistant-models/:role` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/assistant-models/controllers/assistant-models.controller.ts) |
| `GET` | `/routing/circuit-breakers` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/reliability/controllers/reliability.controller.ts) |
| `GET` | `/routing/circuit-breakers/:scope` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/reliability/controllers/reliability.controller.ts) |
| `POST` | `/routing/circuit-breakers/:scope/reset` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/reliability/controllers/reliability.controller.ts) |
| `POST` | `/routing/classify` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/classifier/controllers/classifier.controller.ts) |
| `GET` | `/routing/configurations` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `POST` | `/routing/configurations` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `GET` | `/routing/configurations/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `PATCH` | `/routing/configurations/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `PATCH` | `/routing/configurations/:id/entries` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `POST` | `/routing/configurations/:id/publish` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `POST` | `/routing/configurations/disable` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `POST` | `/routing/configurations/enable` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `GET` | `/routing/configurations/selectable-deployments` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-configuration-admin/controllers/router-configuration-admin.controller.ts) |
| `GET` | `/routing/decisions/:id/legacy-vs-cloud` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/decisions/:threadId` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/decisions/detail/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/detect-language` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/language-detection/controllers/language-detection.controller.ts) |
| `POST` | `/routing/detect-modality` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/modality-detection/controllers/modality-detection.controller.ts) |
| `GET` | `/routing/education/model-profiles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/education/snapshot` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/education/topic-profiles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/evaluate` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/evaluate-shadow` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/route-evaluator/controllers/evaluate-shadow.controller.ts) |
| `POST` | `/routing/evaluate-v2` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/route-evaluator/controllers/route-evaluator.controller.ts) |
| `POST` | `/routing/learning-loop/feedback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/learning-loop/controllers/learning-loop.controller.ts) |
| `GET` | `/routing/learning-loop/profile/:profileKey` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/learning-loop/controllers/learning-loop.controller.ts) |
| `GET` | `/routing/models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `POST` | `/routing/models` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `DELETE` | `/routing/models/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `GET` | `/routing/models/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `PATCH` | `/routing/models/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `GET` | `/routing/models/:id/overrides` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `DELETE` | `/routing/models/:id/overrides/:fieldName` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `POST` | `/routing/models/discovery/run` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/router-models/controllers/router-models.controller.ts) |
| `POST` | `/routing/models/sync` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/sync/controllers/router-sync.controller.ts) |
| `GET` | `/routing/observability/summary` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/observability/controllers/observability.controller.ts) |
| `POST` | `/routing/playground/analyze-semantic` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/playground/controllers/playground.controller.ts) |
| `GET` | `/routing/policies` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/policies` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `DELETE` | `/routing/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `PATCH` | `/routing/policies/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/recovery/stats` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/replay` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/replay/cases/:caseId/promote` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/replay/cases/:caseId/review` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/legacy-vs-cloud` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/runs/:runId/cases` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/runs/:runId/export` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/runs/:runId/suspicious` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `GET` | `/routing/replay/runs/compare` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/routing/controllers/routing.controller.ts) |
| `POST` | `/routing/score` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/scoring/controllers/scoring.controller.ts) |
| `GET` | `/routing/taxonomy/domains` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/taxonomy/controllers/taxonomy.controller.ts) |
| `GET` | `/routing/taxonomy/roles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/taxonomy/controllers/taxonomy.controller.ts) |
| `POST` | `/routing/taxonomy/roles` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/taxonomy/controllers/taxonomy.controller.ts) |
| `GET` | `/routing/taxonomy/roles/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/src/modules/taxonomy/controllers/taxonomy.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `log.server` | — |
| `message.routed` | `claw-chat-service` |
| `router.trace.emitted` | `claw-chat-service` |
| `routing.model_cost.published` | `claw-auth-service` |
| `routing.models.synced` | `claw-audit-service` |

## Events consumed

| Pattern | Producers |
|---|---|
| `connector.health_checked` | `claw-connector-service` |
| `connector.synced` | `claw-connector-service`, `claw-ollama-service` |
| `llamacpp.model.crashed` | `claw-llamacpp-service` |
| `llamacpp.model.loaded` | `claw-llamacpp-service` |
| `llamacpp.model.unloaded` | `claw-llamacpp-service` |
| `message.completed` | `claw-chat-service` |
| `message.created` | `claw-chat-service` |
| `model.deleted` | — |
| `model.pulled` | — |
| `routing.circuit_breaker.closed` | — |
| `routing.circuit_breaker.opened` | — |
| `routing.learned_score.updated` | — |
| `routing.profile.created` | — |
| `routing.profile.lifecycle_changed` | — |
| `routing.profile.updated` | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-routing-service/AGENTS.md) for generated, service-local agent context.
