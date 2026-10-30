# Threads and Workspace honour cost-class plans (ADR-198)

A plan that allows cost classes (Free, Starter, Plus, Pro, ...) treated every model as not allowed in
Threads and in Workspace AI actions, because `isModelAllowedForUsage` returns false on such a plan when
it gets no class. Chat was fixed earlier; these two services now do the same.

- threads-service: `ModelCostClassClient` reads the classes from routing-service. Used by the
  recommended team and model picker status, the healing pool, and the start and retry preflight. The
  preflight answers 503 `Model prices are unavailable` when routing cannot answer; a premium or unpriced
  model is still the 403 `MODEL_NOT_ALLOWED_FOR_PLAN`.
- workspace-service: `ModelCostClassResolverManager` feeds `ModelCatalogResolverManager.filterToPlan`
  (AUTO model choice). Routing down means no AUTO model, never a guess.
- Config: new `ROUTING_SERVICE_URL` read by both (default `https://routing-service:4004`); the shared
  `.env` value is used, no new variable to add.
- Tests: `model-cost-class.client.spec.ts`, `model-cost-class.plan.spec.ts`,
  `generation-preflight.cost-class.spec.ts`, `recommended-team.cost-class.spec.ts` (threads);
  `model-cost-class-resolver.manager.spec.ts` (workspace). Each covers cheap allowed, premium refused,
  unpriced refused, routing down refused.

No migration. Deploy: restart threads-service and workspace-service.
