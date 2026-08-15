# Cloud Smart Router — Implementation Plan

Produced by the mandatory prompt-pack intake protocol
([`rules/26-prompt-pack-intake-protocol.md`](../../../rules/26-prompt-pack-intake-protocol.md)).

- Pack: `ClawAI_Cloud_Smart_Router_Prompt_Pack_v1.0.0` (33 documents + 20 templates), read end to end.
- Pack reference commit: `0757a1be`. Branch base: `3942669a`.
- **Drift check:** `git diff --stat 0757a1be HEAD -- apps/claw-{routing,chat,connector}-service apps/claw-frontend` is **empty**. The pack's audit is current for every path it targets.
- Codebase audit: 10 parallel area audits, **246 findings — 104 DONE, 96 PARTIAL, 46 MISSING**.
- Baseline: [BASELINE.md](./BASELINE.md) — routing service 50 suites / 769 tests green.

---

## 0. The single most important finding

**The privacy filter does not gate the router invocation.**

`RoutingManager.detectLocalEnforcementDomain()`
([routing.manager.ts:559](../../../apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts#L559))
computes a medical / legal / finance / government / executive / privacy verdict **before** the router
call at [routing.manager.ts:426](../../../apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts#L426).
But `tryOllamaAssistedRouting`
([routing.manager.ts:519](../../../apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts#L519))
still ships `context.message.slice(0, 500)` to the router model and only **rewrites the answer
afterwards** (lines 537–544).

That is safe today for exactly one reason: the router is a local Ollama model, so nothing leaves the box.

Swapping in a Gemini or Ollama-Cloud router without moving that filter in front of the invocation
**silently exfiltrates medical, legal, financial and government prompt text to a third party.** It
would compile, pass every existing test, and produce no visible symptom.

### 0b. And a second, live defect found while verifying the first

Privacy enforcement is currently **weaker when the router succeeds than when it fails.**

- `buildFallbackChain` with a local primary deliberately appends every healthy cloud provider
  ([routing.manager.ts:202-212](../../../apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts#L202)) — Anthropic, OpenAI, Gemini, Grok, Ollama Cloud.
- `buildLocalPrivacyDecision` — the path taken when the router is **unavailable** — filters that chain
  with `.filter(f => f.provider === LOCAL_PROVIDER)` ([routing.manager.ts:1060](../../../apps/claw-routing-service/src/modules/routing/managers/routing.manager.ts#L1060)).
- `tryOllamaAssistedRouting` — the path taken when the router **succeeds** — returns the chain
  **unfiltered**, even when `enforcedLocal` is true.
- The emitted `routingMode` is `AUTO`, and chat-service only suppresses cloud candidates for
  `LOCAL_ONLY`/`PRIVACY_FIRST` (`execution.constants.ts:37`, applied at `chat-execution.manager.ts:1346`).

Net effect **in production today**: a medical/legal/finance/government prompt that goes through the
Ollama-assisted path yields a local primary with a cloud fallback chain, and chat-service will execute
on a cloud provider if the local model fails. This is independent of the cloud-router work.

Both defects are fixed first, in one commit, before any cloud adapter exists (Batch 0).

---

## 1. What already exists — reuse, do not rebuild

| Capability                                                                                         | Existing code                                                                                                                         | Fitness                                                           |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Weighted multi-dimension scoring                                                                   | `scoring/` — 14 dimensions in [scoring.types.ts:11-26](../../../apps/claw-routing-service/src/modules/scoring/types/scoring.types.ts) | **High.** This _is_ the pack's V3 scorer.                         |
| Registry-driven evaluator with hard eligibility filter + zod-validated decision                    | `route-evaluator/managers/route-evaluator.manager.ts:39`                                                                              | **High** — but dead. See §2.                                      |
| Model registry with capabilities, cost, lifecycle                                                  | `RouterModelRegistry` (schema.prisma:415-517), 24 seeded profiles                                                                     | **Medium** — flat, no definition/deployment split.                |
| Immutable versioned pricing in integer micro-USD                                                   | `ModelCostVersion` (schema.prisma:651-704)                                                                                            | **High** — correct shape, but empty and unconsumed.               |
| Replay harness over historical decisions                                                           | `routing/managers/replay.manager.ts:47` + `ReplayRun`/`ReplayCase`                                                                    | **High** for V4.                                                  |
| Outcome + feedback records                                                                         | `RoutingOutcomeRecord`, `RoutingFeedbackRecord`                                                                                       | **High.**                                                         |
| Circuit breaker store                                                                              | `RouterCircuitBreaker` + `reliability/repositories/circuit-breaker.repository.ts`                                                     | **Medium** — execution-only, untyped `state` String.              |
| Provider adapter registry (8 providers, one interface)                                             | connector-service `adapters/adapter-factory.ts:12-29`                                                                                 | **High** as a _pattern_; see §3 for why it cannot host inference. |
| Ollama **Cloud** adapter                                                                           | `ollama.adapter.ts:138-168` rewrites localhost → `https://ollama.com/api`, always Bearer                                              | **High** — Ollama Cloud is already half-built.                    |
| Durable Redis-backed SSE (Runtime V2) with cursor resume, idempotency fingerprints, typed envelope | chat-service `runtime-v2-*`, `dto/runtime-v2.dto.ts:284-310`                                                                          | **High** — its event-type regex already accepts `router.*`.       |
| Versioned idempotent seed with advisory lock + fingerprint                                         | payment-service `gateway-config.repository.ts:44-79 importEnvironmentOnce`                                                            | **High** — the template to copy.                                  |
| `ADMIN_ROUTING_MANAGE` permission, client + server                                                 | `permission.enum.ts:52`, `routing.controller.ts:44-47`                                                                                | **Done** — no new permission needed.                              |
| Accessible drag-reorder pattern                                                                    | `hooks/context-packs/use-context-pack-item-drag.ts:9-87`                                                                              | **High** — reuse for chain ordering.                              |
| One-file-13-locale i18n pattern                                                                    | `lib/i18n/locales/deployment-translations.ts`                                                                                         | **High** — avoids editing 13 files by hand.                       |

---

## 2. The structural surprise: three routers exist, one is live

| Lane                                                                                                      | Status                                                                                  | Reachable via                                                               |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **v1** `RoutingManager` + `OllamaRouterManager`                                                           | **LIVE** — keyword heuristics + hardcoded provider/model constants + a local LLM assist | RabbitMQ `message.created` → `routing.service.ts:436`                       |
| **v2** `RouteEvaluatorManager` — registry + 14-dimension scoring + hard eligibility filter + zod decision | **Fully built, fully tested, ZERO callers**                                             | `/routing/evaluate-v2`, `/routing/evaluate-shadow` — unreferenced repo-wide |
| **shadow** `SemanticIntentAnalyzer` + `AIRoutePlanner`                                                    | Fire-and-forget after the decision is already made; both flags default `false`          | n/a                                                                         |

**Decision: promote and extend v2; do not build a fourth lane.** The pack's V1–V3 target shape is
substantially what v2 already is. Extending v1 would mean rewriting
[routing.constants.ts](../../../apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts)
(2,389 lines of keyword lists and hardcoded model IDs); extending v2 alone changes nothing users see
until it is wired to the hot path. So: wire v2 to the hot path behind a flag, with v1 as the
rollback adapter — which is exactly the pack's "legacy behind flags" requirement, satisfied by an
existing implementation rather than a new one.

---

## 3. Deviations from the pack — where the pack is wrong about this codebase

These are stated explicitly per policy; none is applied silently.

| #   | Pack assumes                                                                | Reality                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Consequence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Adapters/coordinator can live in connector-service                          | connector-service is a **credential vault + catalog with zero inference code**. Every provider call is made by the _consumer_ after pulling a decrypted key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | The coordinator goes in **routing-service**, calling providers directly, reusing connector-service only for credentials + health + discovery.                                                                                                                                                                                                                                                                                                                                                                 |
| D2  | chat ↔ routing is a request/response seam                                   | It is **RabbitMQ only**. There is no `ROUTING_SERVICE_URL` in chat-service config at all.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Trace events must be _published_, not returned. Keep the async contract working throughout.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D3  | `seed:versioned` can carry the router seed                                  | `tools/release/seed-versioned.mjs` only picks up `apps/*/prisma/seed.{js,ts}`; **routing-service has none**, and auth-service is the only service wired in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Four new pieces in routing-service: `SeedExecution` model + migration, seed machinery, `prisma/seed.js`, and `migrations.seed` in `prisma.config.ts`.                                                                                                                                                                                                                                                                                                                                                         |
| D4  | `OLLAMA_CLOUD` is a new provider                                            | The `OLLAMA` connector **is already Ollama Cloud**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Add a distinct deployment identity so local and cloud Ollama can coexist — not a new adapter from scratch.                                                                                                                                                                                                                                                                                                                                                                                                    |
| D5  | Update the per-package CI matrix in 4 jobs                                  | **Stale.** `ci.yml:30-64` computes the matrix dynamically via `tools/affected/index.mjs ci-matrix`. `CLAUDE.md` and `rules/05` still say otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No CI edit for changes inside existing workspaces. Do not spend a commit on it. (Flagged for a docs fix.)                                                                                                                                                                                                                                                                                                                                                                                                     |
| D6  | Seeded model IDs are current                                                | Pack seeds `glm-4.7:cloud`; the repo already believes `glm-5.2` and `kimi-k2.6` ([routing.constants.ts:18-19](../../../apps/claw-routing-service/src/modules/routing/constants/routing.constants.ts#L18)). Gemini IDs likewise unverified.                                                                                                                                                                                                                                                                                                                                                                                                         | **Every seeded ID is a bootstrap alias in `REQUIRES_*_VALIDATION` and becomes eligible only after connector discovery confirms it.** No pack ID is trusted.                                                                                                                                                                                                                                                                                                                                                   |
| D7  | Provider is an enum                                                         | Provider is a **free-form String** on 4 tables; allowed values live only in a schema comment and seed data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Introduce a provider enum additively; do not migrate the String columns in the same batch.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| D8  | Tenant priors (V6) have somewhere to live                                   | routing-service schema has **zero** `userId`/`workspaceId`/`tenantId` columns.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | V6 is gated behind a scoping migration + backfill. Sequenced late and called out as its own risk.                                                                                                                                                                                                                                                                                                                                                                                                             |
| D9  | Coverage is 92%/95%                                                         | Written policy says 92/95; **enforced** config is 70 (routing, chat) / 60 (frontend), and **CI never measures coverage** (`npm run test`, no `--coverage`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Write to 92/95, prove locally with `test:cov`, never lower the enforced floor.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| D10 | `CodeQL` and `tools/audit-untranslated-i18n.cjs` exist as gates             | CodeQL runs (confirmed on PR #159) but has no workflow file in `.github/workflows/`; the i18n audit script **does not exist** though three rules mandate it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Do not invent them. Flag as follow-ups.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D11 | Batch 5 ("v2 promoted to hot path") means extending `RouteEvaluatorManager` | Batches 1/3/4/6/7 built a parallel definition/deployment/chain system instead: `ModelDeployment` (extends the same `RouterModelRegistry` definitions v2 scores against — no data-model conflict) + `RouterConfiguration`/`RouterChainEntry` + `RouterInferenceCoordinatorManager` + `CloudRouterManager`. `CloudRouterManager.route()` already implements the immutable-snapshot-load + chain-resolve + coordinator-walk sequence end to end and is registered as a DI provider, but — like the old v2 before it — has **zero callers**: nothing in `routing.manager.ts` invokes it, and nothing computes the `eligibleDeploymentIds` it requires. | Batch 5 wires **`CloudRouterManager`**, not `RouteEvaluatorManager`, into `handleAuto`. `RouteEvaluatorManager`/`/routing/evaluate-v2` stays untouched, still-dead code — a separate future cleanup, not in this pack's scope. No new feature flag: `CloudRouterManager` already returns `available:false` (`CONFIGURATION_DISABLED`/`NO_PUBLISHED_CONFIGURATION`) when the published `RouterConfiguration.enabled` is off, which **is** the v1 rollback switch — the same one Batch 9's admin page operates. |

---

## 4. Data model delta

Extend, don't duplicate. Existing coverage first:

| Pack aggregate                                         | Existing                                                                                                                    | Action                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ModelDefinition`                                      | `RouterModelRegistry` — but identity **is** `(provider, modelKey)`, so one model behind two providers is two unrelated rows | Keep as the definition table; add a nullable `definitionKey` to group cross-provider identity                                       |
| `ModelDeployment`                                      | **none**                                                                                                                    | **New.** FK → registry; provider, connectorId, deploymentType, region, privacyClass, activationState, health, limits, costVersionId |
| `CapabilityEvidence`                                   | Shared _types_ exist (`model-capability-evidence.type.ts`) with **zero consumers**                                          | **New table**, reusing the existing shared types                                                                                    |
| `RouterConfiguration` + `RouterChainEntry` + revisions | **none** (`RoutingPolicy` is priority-based and mutated in place)                                                           | **New**, immutable revisions + optimistic concurrency                                                                               |
| `RoutingDecision`                                      | Exists and is rich (schema.prisma:166-221)                                                                                  | **Extend**: `traceId`, `configRevisionId`, `registryRevision`, `lowConfidence`, `updatedAt`                                         |
| `RouterProviderAttempt`                                | **none** — only flat `fallbackProvider`/`fallbackModel`                                                                     | **New**                                                                                                                             |
| `RoutingCandidateScore`                                | **none** — scoring is stateless, never persisted                                                                            | **New** (required to back `router.candidate.scored`)                                                                                |
| Outcome / Feedback / LearnedScore                      | All exist                                                                                                                   | **Reuse.** Resolve the two-competing-stores conflict (§5)                                                                           |
| Seed ledger                                            | **none** in routing-service                                                                                                 | **New** `SeedExecution`                                                                                                             |

---

## 5. Conflicts that must be resolved, not stacked

The audit found four places where two mechanisms already disagree. Adding a third is the default
failure mode; each gets an explicit decision recorded in an ADR.

1. **Two learned-metric stores.** `RouterModelProfile`/`RouterTopicProfile`, written by
   `router-education.manager.ts:109-128` and applied to live routes via `calibrateDecision`
   (`routing.service.ts:230,:437`) — **the only learning system in the repo with production effect**,
   and it already carries `sampleSize`, `confidenceInProfile`, `calibrationTrustScore` and
   `weightedSuccessScore`. Versus `RouterLearnedScore`, whose sole writer is an HTTP endpoint
   **nothing calls**.
   → **V5/V6 build on the education profiles**, whose fields already match the pack's
   minimum-samples/confidence requirements. `RouterLearnedScore` is the unwired duplicate: either
   wire it as the versioned aggregate layer over those profiles, or retire it — decided in the V5 ADR,
   never left as a third store.
2. **Two admin-override mechanisms on the same table.** `RouterAdminOverride` rows vs `RouterModelRegistry.adminOverrideJson`. They can disagree about which fields are frozen. → `RouterAdminOverride` wins.
3. **Two cost sources.** `RouterModelRegistry.inputCostPer1M` (Decimal, seeded, **actually used for ranking**) vs `ModelCostVersion` (integer micro-USD, correct, versioned, **empty and unconsumed**). → migrate ranking onto `ModelCostVersion`; seed it.
4. **Two SSE protocols on one URL.** Legacy in-memory (per-process sequence, 100-event ring buffer, **cannot survive horizontal scaling**) vs Runtime V2 (Redis journal, cursor resume, idempotent). → **Runtime V2 is the sole carrier for router trace events.** Its event-type regex already admits `router.*`.

---

## 6. Batch decomposition

Every batch is independently commitable, independently gated, and ends with
`cd <workspace> && npx tsgo --noEmit && npm run lint && npm test && npm run build`,
then one commit and one push. Per-folder gates only — never all-workspace.

| #     | Batch                                                                                                                                                                                        | Workspaces                  | Unblocks                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| **0** | **Privacy filter gates the invocation** (§0). Pure safety fix + tests. No schema change.                                                                                                     | routing                     | Everything — no cloud adapter may exist before this |
| 1     | Provider enum + `ModelDeployment` + `CapabilityEvidence` (additive migration)                                                                                                                | routing                     | 3, 8                                                |
| 2     | `SeedExecution` + seed machinery + `prisma.config.ts` + `prisma/seed.js`                                                                                                                     | routing                     | 4                                                   |
| 3     | `RouterInferenceCoordinator` + provider interface + Gemini/Ollama-Cloud/legacy adapters + canonical error taxonomy + per-entry breaker + strict output + 1 bounded repair + attempt recorder | routing                     | 5, 6                                                |
| 4     | `RouterConfiguration` + `RouterChainEntry` + revisions + `cloud-smart-router-default-v1` seed                                                                                                | routing                     | 7, 9                                                |
| 5     | Per-request immutable snapshot + eligibility filter + v2 promoted to hot path behind flag, v1 as rollback                                                                                    | routing                     | 6                                                   |
| 6     | `RouterProviderAttempt` + `RoutingCandidateScore` persistence                                                                                                                                | routing                     | 7                                                   |
| 7     | Typed trace events: shared-types union → routing publishes → chat carries on Runtime V2                                                                                                      | shared-types, routing, chat | 8                                                   |
| 8     | Frontend: discriminated event union, `eventId` dedupe, sequence guard, Auto timeline, i18n ×13                                                                                               | frontend                    | —                                                   |
| 9     | Admin Smart Router page: API + 6 tabs + RBAC + chain reorder + i18n ×13                                                                                                                      | routing, frontend           | —                                                   |
| 10    | Discovery / enrichment / lifecycle validation                                                                                                                                                | connector, routing          | 11                                                  |
| 11    | Learning V4–V7 (V6 gated on the tenant-scoping migration, D8)                                                                                                                                | routing                     | —                                                   |
| 12    | Routing lab: 300-case corpus, fault injection, replay, evidence manifest                                                                                                                     | routing                     | release                                             |

**Ordering rationale.** 0 is a security fix and ships alone. 1–2 are pure additive data plumbing with
no behaviour change. 3 builds the provider layer against mocks before any config exists. 4 makes it
configurable. 5 is the first batch that changes what a user sees — and it is flag-gated with v1 as a
live rollback. 6–9 are the transparency and control surfaces. 10–12 are the evidence programme.

---

## 7. Constraint surface — obeyed by every batch

- **Banned:** `any`, `!`, `==`, `var`, `console.log`, `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, floating promises, `process.env` outside `AppConfig`, Prisma outside repositories, logic in controllers, cross-service DB access, hook bypass (`--no-verify`).
- **Declaration ownership:** no inline `type`/`interface`/`enum`/module-`const` in any logic file — extract to `types/`, `common/enums/`, `constants/`. Frontend: `.tsx` is render-only (string-literal unions, enums, hooks, sub-components all banned there).
- **Sizes:** service methods ≤ 30 lines, managers ≤ 80, controllers 3 lines, files ≤ 500.
- **Tests:** Jest `*.spec.ts` co-located (backend), Vitest `*.test.ts(x)` (frontend). Target 92/95 on new code; enforced floor 70/70/70/70 (routing, chat) and 60 (frontend). CI does not measure coverage — prove locally with `test:cov`.
- **i18n:** every user-facing string via `t()`, 13 locales + `i18n.types.ts` in the same commit. Prefer the one-file `deployment-translations.ts` pattern. `t()` is **not** type-safe — the guard is a regex test that only sees literal keys.
- **Watch out:** routing-service's local ESLint config is _weaker_ than root (omits `as unknown as`, `console.log`, module-scope `let`). Green routing lint ≠ policy-clean.
- **Watch out:** touching `docker/`, `infra/`, `.github/`, `tools/`, `rules/`, `.env*`, root configs sets `rootInvariant` → CI runs **all 20 workspaces**. Batch such edits together.
- **Generated artifacts** (`.ai/**`, workspace `AGENTS.md`, inventory snapshot) are a hard gate; the pre-commit hook regenerates and stages them.

---

## 8. Open risks

| Risk                                                                                                                                                              | Mitigation                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Cloud router adds a paid call to every Auto request; no `TokenLedgerContext.ROUTER` exists, so router inference is currently **free and invisible** to the ledger | Batch 3 adds the ledger context; cost caps enforced before rollout                                    |
| `/internal/connectors/config` is `@Public()` and returns a **plaintext API key** over intra-cluster HTTP                                                          | Do not widen. Prefer moving invocation behind the credential boundary. Logged as a security follow-up |
| Legacy SSE lane cannot survive horizontal scaling (per-process sequence, per-process cancel map)                                                                  | Router trace rides Runtime V2 only                                                                    |
| V6 tenant priors have no scoping columns anywhere in routing-service                                                                                              | Gated behind an explicit scoping migration + backfill; sequenced last                                 |
| The pack's 6 seeded model IDs are unverified and at least one looks older than what the repo already uses                                                         | All seeds land in `REQUIRES_*_VALIDATION`; discovery promotes them                                    |
