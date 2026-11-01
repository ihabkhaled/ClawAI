### Priced media model matching (2026-11-01)

`isPricedMediaModel` (media-output-model) ignores the Gemini `models/` prefix and a trailing snapshot date
(`-YYYY-MM-DD` or `-YYYYMMDD`), so a dated snapshot of a priced model is the same model. The connector sync and the
exposure migration both use it, and sync never marks a known priced media model REMOVED when a provider's list omits it.

## Retired media models (2026-11-01)

`RETIRED_MEDIA_MODEL_KEYS_BY_PROVIDER` lists media models the provider shut down (Veo 3.1, the Gemini 3.x image previews); `isPricedMediaModel` returns false for them. `video-model-catalog.constants.ts` holds the video model patterns and the AUTO model per provider (`gemini-omni-*` is the Gemini video model); the old copies in `video-generation.constants.ts` are unused.

## Nano Banana 2.1 (2026-11-01)

`gemini-nano-banana-2.1` is a priced Gemini image model and the image pattern recognises the `gemini-nano-banana*` id.
