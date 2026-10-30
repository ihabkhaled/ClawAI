# ADR-198: Model pickers show the plan decision and dim what it excludes

**Status:** Accepted
**Date:** 2026-10-30

## Context

Every model picker listed every exposed model the same way. On a cost-class plan (Free allows `FREE`,
`CHEAP`, `STANDARD`) a user could choose a `PREMIUM` model such as Grok 4.7, send, and only then be told
"The selected model is not available on your plan". A model from another provider worked, so the list
looked inconsistent. The pickers could not decide it themselves: a model's cost class comes from
routing-service after name normalisation, dated-snapshot matching and the provider-fallback rule, and the
plan check is `isModelAllowedForUsage` in shared-entitlements.

## Decision

1. The server answers. `POST /chat-messages/model-access` (chat-service, any signed-in user) takes up to 300
   `{provider, model}` pairs and returns `allowed` for each. It uses the same function as the send gate
   (`AccessControlService.isPrimaryModelAllowed`), so the picker and the send cannot disagree. A model with
   no resolvable class is not allowed, exactly as on send. An administrator and an allow-all plan are allowed
   without a class lookup.
2. Classes come from one bulk call, `POST /internal/router-models/costs/classes` (routing-service, service
   token), which resolves each pair through `ModelCostService.getSnapshot`. It returns the class band only,
   never a rate (rule 37).
3. The frontend asks in chunks of 300 (a request stays far under the API's 100 KB body limit) and caches the
   answer for a minute. A failed lookup locks nothing: the send path still refuses, and a picker that dimmed
   everything because one request failed would be worse.
4. A model outside the plan is shown, dimmed (`opacity-50`), tagged "Not on your plan" in 13 locales, marked
   `aria-disabled`, and cannot be chosen by click, Enter or the Compare checkbox. It is shown rather than
   hidden so a user can see what an upgrade adds. Local models are never asked about.
5. Applied through the shared `ModelPicker` (composer, advanced module, orchestration labs, judge and critic,
   retry-with-another-model), the Compare list, the escalation-chain builder and the AI-action dialog. Recovery
   suggestions skip a locked model.

## Consequences

- This reverses the earlier written invariant that model selection is never disabled client-side on a plan
  basis. The server is still the gate; the picker now tells the user in advance what it will say.
- A judge or critic is a different role (`allowAsJudge`); the picker dims by the primary decision, which has
  the same class gate. A per-model role switch can still refuse a judge on send.
- OpenRouter, NVIDIA NIM, Hugging Face and AI Horde models have no price, so they are dimmed on every plan,
  paid included, because a send would be refused. Giving them prices unlocks them.
- Threads and Workspace (2026-10-31): both called the shared helper without a class, so a Free or Starter
  user was refused every model there. They now read the class from routing-service
  (`POST /internal/router-models/costs/classes`, service token) the way chat does: threads-service
  `ModelCostClassClient` for the recommended team, the healing pool and the start/retry preflight;
  workspace-service `ModelCostClassResolverManager` for AUTO model choice. Cache key
  `JSON.stringify([provider, model])`, 60 s, a failed lookup is never cached, and no answer means no
  model (the preflight answers 503, the picker shows the model as needing a plan and is not kept in the
  60 s team cache). Only a cost-class plan makes the call.
