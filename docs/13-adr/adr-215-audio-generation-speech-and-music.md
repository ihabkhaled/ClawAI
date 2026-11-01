# ADR-215: Audio generation (speech and music) lives in image-service

**Status:** Accepted

**Date:** 2026-11-01

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 37](../../rules/37-payg-credit-integrity.md). Related: [ADR-120](adr-120-clawai-owns-multimodal-orchestration.md) (TTS for replies), [ADR-137](adr-137-video-generation.md), [ADR-139](adr-139-credit-unlocks-media-generation.md), [ADR-213](adr-213-chat-models-make-media-through-tools.md).

## Context

The `generate_audio` tool needs a job-shaped audio backend. Reply read-aloud (ADR-120) already speaks through TTS, but it is a player feature, not a stored, retryable generation a chat model can request.

## Decision

- **Module** `apps/claw-image-service/src/modules/audio-generation`, beside video; tables `audio_generations` and `audio_generation_assets` (idempotent migration `20261031100000_add_audio_generations`). Providers answer in one synchronous call, so the async job is ours: enqueue, run in the background, the caller polls.
- **Providers:** `AUDIO_OPENAI` speech (`tts-1`, `tts-1-hd`, `gpt-4o-mini-tts`), `AUDIO_GEMINI` speech (Gemini TTS models, PCM wrapped as WAV) and `AUDIO_GEMINI` music (Lyria). xAI is skipped: it lists text to speech but publishes no model id or request shape.
- **Contract:** internal service-token `POST /internal/audio/generate` and `GET /internal/audio/:id`; public JWT `GET /audio/:id`, `POST /audio/:id/retry`, `POST /audio/:id/cancel`. Status `QUEUED | RUNNING | COMPLETED | FAILED | TIMED_OUT | CANCELLED`. No event is published, same as video.
- **Money:** `PaygSurface.TTS`; hold before the call, settle after the asset row exists, release on every other exit. The plan gate is the media unlock (`allowImageGeneration`, credit-unlockable per ADR-139), shared with video. Only models with a seeded price run; others are refused `PAYG_MODEL_UNPRICED`.
- **Storage:** file-service stores `audio/mpeg` and `audio/wav` only.

## Consequences

- Music is metered as one unit per song through `imageUnits` today; a dedicated unit is an open item.
- The audio card in the thread is not rendered yet.
- ADR-120's "TTS follow" is now complete for generation as well as read-aloud.
