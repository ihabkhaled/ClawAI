# ADR-214: Media models are typed in the catalog and priced by family

**Status:** Accepted

**Date:** 2026-11-01

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 37](../../rules/37-payg-credit-integrity.md), [rule 51](../../rules/51-router-candidates-and-model-window-fit.md), [rule 14](../../rules/14-shared-packages.md). Related: [ADR-199](adr-199-aggregator-models-are-priced-and-low-plans-stop-at-standard.md), [ADR-213](adr-213-chat-models-make-media-through-tools.md).

## Context

Image, video and audio models sat in the same registry as chat models with the same shape, so the text AUTO router could pick an image model for a sentence, and the pickers could not tell kinds apart. A new id from a known family (`veo-4`, `gpt-image-2`, `grok-imagine-video-2`) was refused as unpriced (`PAYG_MODEL_UNPRICED`) until someone added a row.

## Decision

- **One classifier.** `@claw/shared-utilities` `media-output-model` (with `audio-output-model`) maps a model id to `IMAGE`, `VIDEO` or `AUDIO` output, built from the per-kind pattern tables. The connector snapshot derives `modalitiesOut` from it (`IMAGE_OUTPUT`, `VIDEO_OUTPUT`, `AUDIO_OUTPUT`). routing-service stores it (migration `20261031120000_media_output_modalities` backfills the registry and adds the xAI `grok-imagine-*` rows) and leaves media rows out of text AUTO and execution candidates. They stay available to the pickers (Image, Video and Audio kinds, an Audio badge) and as media-tool targets.
- **Family-fallback metering.** A model with a seeded row meters on itself. An id of a known family with no row meters on the family's dearest row (Gemini image: `gemini-3-pro-image-preview`; `gpt-image-*`: `gpt-image-1@1536x1024`; `veo-*`; `grok-imagine-video*`). It is neither refused nor under-billed. An id outside every family is still refused unpriced; the wallet never guesses (fails closed, rule 37).
- **Prices are data.** Cost seed v15 (`model-cost-list-prices-2026-v15`) records each media price with its source and check date. This ADR states no numbers; the seed and `docs/business` own them.

## Consequences

- A new model of a known family works the day the provider ships it, at the dearest family price, and the seed is corrected afterwards.
- A new family needs a pattern, a family price key and a seed row, in that order.
- Text routing quality no longer depends on media rows being filtered by hand.
