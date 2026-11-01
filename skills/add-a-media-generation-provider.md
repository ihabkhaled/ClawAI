---
name: add-a-media-generation-provider
summary: Add a new image, video or audio provider or model family so chat models can request it through the media tools - adapter, classifier pattern, family price key, cost seed row, tool table, picker, docs.
task_keywords:
  [
    media generation,
    image provider,
    video provider,
    audio provider,
    tts,
    music,
    generate_image,
    generate_video,
    generate_audio,
    grok-imagine,
    new model family,
  ]
applies_to:
  [
    claw-image-service,
    claw-chat-service,
    claw-routing-service,
    claw-connector-service,
    claw-frontend,
  ]
required_rules:
  [
    28-billing-integrity-and-api-contracts,
    37-payg-credit-integrity,
    59-chat-surfaces-are-one-pipeline,
    13-external-library-wrappers-and-adapters,
  ]
required_docs:
  [
    docs/13-adr/adr-213-chat-models-make-media-through-tools.md,
    docs/13-adr/adr-214-media-models-are-typed-and-priced-by-family.md,
  ]
validation_lane: git commit + git push - the hooks gate the change (rules/23 gate matrix)
---

# Skill: Add a media generation provider

Read [ADR-213](../docs/13-adr/adr-213-chat-models-make-media-through-tools.md) (the tool loop), [ADR-214](../docs/13-adr/adr-214-media-models-are-typed-and-priced-by-family.md) (typed catalog, family pricing) and [ADR-215](../docs/13-adr/adr-215-audio-generation-speech-and-music.md) (audio) first. A provider is data plus one adapter. Never write provider-named code outside the adapter (see the "Providers are data" feedback).

## When to use

- A new image, video or audio provider, or a new model family of an existing one.

## When NOT to use

- A new id of a family that already has a pattern and a family price key: it already works (metered at the family's dearest row). Add the seed row to price it exactly.
- Making a new chat surface offer the tools: [`propagate-a-chat-change-to-every-mode.md`](propagate-a-chat-change-to-every-mode.md) and `MEDIA_TOOL_SURFACES`.

## Steps, in order

1. **Prove the API.** Read the provider's published docs for the model id, request shape and price. If it publishes no model id or request shape (xAI audio today), stop and record that in the image-service guide; do not guess.
2. **Adapter** in `apps/claw-image-service/src/modules/{image,video,audio}-generation/adapters/`, behind the module's adapter interface, with provider error mapping (`audio-provider-error.utility.ts` style). Redact keys; never log prompts at info.
3. **Classifier pattern** in `packages/shared-utilities` (`image-output-model`, `video-generation`, `audio-output-model` tables). The connector snapshot, routing and the pickers all read `classifyMediaOutputModel`; add a test per new id shape. Rebuild the shared package (`npm run affected:shared-build`).
4. **Price.** Add the family's dearest price key (`*_WORST_CASE_*` constant) and a seed row in `model-cost-seed.constants.ts` with source URL and check date; bump `MODEL_COST_SEED_VERSION`. An unpriced family is refused `PAYG_MODEL_UNPRICED` (fail closed, rule 37).
5. **Routing rows.** A migration for new rows (idempotent, rule 52), `modalitiesOut` filled; confirm media rows stay out of text AUTO (`cloud-router-candidates` spec).
6. **Tool table.** `MEDIA_KNOWN_MODELS` and the defaults in `apps/claw-chat-service/src/modules/chat-messages/constants/media-tools.constants.ts`. Only a model in the table can be named by a chat model.
7. **Frontend.** Picker kind and badge come from `modalitiesOut`; add locale strings for any new label in all 13 locales (rule 20).
8. **Docs, same change** (rule 63): `docs/04-backend/service-guide-image.md`, `docs/07-integrations/ai-provider-catalog.md` and `provider-catalog.md`, `docs/business` price pages if a plan changes, the workspace `CLAUDE.md` files, an ADR when the decision is new, and the public feature page copy if a claim changes (rule 66).

## Verify live (rule 44)

One generation per kind through the real stack: directly against image-service, then a chat model calling the tool in normal chat and in a Compare lane. Record cost, the settled amount and the failure signatures in the QA record. Video and audio cost real money per call.

## Failure modes

- Model works but is refused unpriced: no seed row and no family match. Add the pattern or the row.
- Image model picked for plain text: the classifier does not match the id, so `modalitiesOut` is empty and text AUTO sees it.
- Dev container ignores the new shared export: baked packages; `service:rebuild`.
- Tool call never fires: the turn has no media cue word, or the model has no tool calling.
