### Priced media model matching (2026-11-01)

`isPricedMediaModel` (media-output-model) ignores the Gemini `models/` prefix and a trailing snapshot date
(`-YYYY-MM-DD` or `-YYYYMMDD`), so a dated snapshot of a priced model is the same model. The connector sync and the
exposure migration both use it, and sync never marks a known priced media model REMOVED when a provider's list omits it.
