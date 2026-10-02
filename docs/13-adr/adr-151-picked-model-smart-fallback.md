# ADR-151: A picked model that fails gets a labelled substitute, then three suggestions

- Status: Accepted
- Date: 2026-10-02
- Deciders: Product owner, engineering
- Related: rule [51](../../rules/51-router-candidates-and-model-window-fit.md),
  rule [37](../../rules/37-payg-credit-integrity.md), ADR-100, ADR-132 (regenerate with a chosen model)

## Context

AUTO already walks a fallback chain. A model the user PICKED (`MANUAL_MODEL`) did not:
`buildCandidateChain` returned only the pick ("attempt 1/1"), so a provider outage, an
unavailable model or an out-of-credit provider account ended in the generic "All providers
failed to generate a response", with no way forward except guessing another model.

## Decision

1. **routing-service names substitutes.** For a chat pick it adds `pickedModelSubstitutes`
   (up to 5, best first) to `message.routed`, ranked by `rankPickedModelSubstitutes` from the
   same eligible set AUTO uses (exposed, healthy connector, allowed by the plan, never an
   image-output model; rule 51 item 1): another model of the SAME provider at the pick's
   cost class or below, then other providers' models at or below it, then pricier models
   marked `costlier`. A lookup failure means no substitutes (the old behaviour), never a
   failed routing decision.
2. **chat-service tries at most two.** The chain is the pick plus the first two substitutes
   (`PICKED_MODEL_MAX_FALLBACKS`). A substitute that answers is stamped on the reply as
   `metadata.pickedModelFallback` (`originalProvider`, `originalModel`, `costlier`); the
   bubble reads "X failed, so Y answered instead" and, when `costlier`, says Y can cost more.
   Each hop reserves its own credit, so the free cap and the wallet apply per hop.
3. **Only a provider failure moves on.** A credit (402), plan/exposure (403) or quota (429)
   refusal of the pick, and a user stop, end the turn and show as themselves (the upgrade
   notice): another model cannot fix them and a fallback would hide the reason. A substitute
   refused for credit is skipped; the next one may be a free or local model. A pick is never
   swapped for a weak-but-successful answer (the quality re-route is AUTO only).
4. **Everything failed.** `PickedModelFailedException` (`PICKED_MODEL_FAILED`, 502,
   `messageKey pickedModel.failedMessage`) carries up to three untried models
   (`suggestedModels`; cheaper-or-equal first). They go on the SSE error frame and into the
   stored error metadata. The bubble renders them as buttons that regenerate the question
   with that model (the ADR-132 call, `MANUAL_MODEL` + provider + model) plus a
   "Choose another model" model picker. With no backend suggestions the frontend offers the
   first three picker models other than the one that failed. If nothing was tried after the
   pick and nothing is on offer, the pick's own translated error stands (unchanged).
5. **Copy** is `pickedModel.*` (`picked-model-translations.ts`), all 13 locales.

## Consequences

- A pricier substitute can answer, but never silently. A cost-class cap was rejected: it would
  leave a Free user with nothing when the only healthy model is pricier.
- The substitute list is computed at routing time. A model that fails in the window between
  routing and execution is simply skipped (it counts toward the two).
- Code: `picked-model-fallback.utility.ts` (chat), `picked-model-substitute.*` (routing),
  `picked-model-fallback-chokepoint.spec.ts`, frontend `picked-model-recovery.tsx`.
