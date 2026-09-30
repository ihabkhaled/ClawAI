# ADR-137: Video generation is its own metered surface, priced per second

- **Status:** Accepted (built and unit-tested; live rounds per model recorded below)
- **Date:** 2026-09-30
- **Deciders:** Product owner (request), engineering
- **Related:** rule [37](../../rules/37-payg-credit-integrity.md) item 17,
  [payg-credit.md](../03-architecture/payg-credit.md), ADR-135 (no prices in copy)

## Context

Picking a video model in chat ran the CHAT path and failed: Gemini answered 404 for
`models/veo-3.1-generate-preview` and xAI answered 400 for `grok-imagine-video`. Video
generation was never built. The catalog lists those models as ordinary CHAT models because
nothing sets `ModelKind`, and the image redirect deliberately skips video ("no video
capability to redirect them to"). The owner asked for video from every provider, smart
prompting like images, and 5 to 10 test rounds per model.

## Provider facts (fetched 2026-09-30)

| Provider | Models the account can reach                        | API                                                                                                                                            | Price per second of video                 |
| -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Google   | `veo-3.1-lite/fast/generate-preview`                | `POST models/{m}:predictLongRunning`, poll the operation, video at `response.generateVideoResponse.generatedSamples[0].video.uri` (key header) | $0.05 / $0.10 / $0.40 at 720p, with audio |
| xAI      | `grok-imagine-video`, `grok-imagine-video-1.5`      | `POST /v1/videos/generations`, poll `GET /v1/videos/{request_id}`, `video.url`                                                                 | $0.050 / $0.080                           |
| OpenAI   | `sora-2`, `sora-2-pro` still listed by `/v1/models` | **Shut down 2026-09-24, no replacement**                                                                                                       | n/a                                       |

## Decision (batch 1: metering)

1. **Video is a PAYG surface of its own** (`PaygSurface.VIDEO`), billed per SECOND of clip:
   `videoSeconds` × `videoPerUnitMicroUsd`. The column already existed on
   `ModelCostVersion` and was never summed; `calculateUnitCostMicroUsd`, `isPerUnitPriced`,
   the affordability clamp, `toRawTokenBreakdown`, the meter wire (`unitWire`) and
   auth-service's credit DTO/manager now carry it. The DTO bound is 300 seconds.
2. **Priced rows (seed v11).** Veo Lite/Fast/Standard at 50,000 / 100,000 / 400,000 and
   Grok Imagine Video at 50,000 / 80,000 micro-USD per second, token rates 0. 720p is the
   only resolution generated, so the 720p price is the one that applies. Sora is NOT
   seeded: its API no longer exists. Unpriced means blocked (rule 37 item 5).
3. **The ledger says "Video"** (`billing.credit.surface.VIDEO`, 13 locales).

## Batches 2 to 4 (shipped with batch 1)

2. image-service `video-generation` module (Veo and xAI adapters, polling job, PAYG hold,
   storage through a new file-service `store-generated-video`), nginx `/api/v1/videos`.
3. chat-service: `VIDEO_*` providers, redirect a picked video model, detect a video request
   in AUTO, a planner-written prompt from the user's words, the conversation and any
   research, honest failure messages.
4. frontend: video bubble (progress, `<video>`, download, retry), model picker group.
   Live rounds per model follow.

## How it works (as built)

- **Job model.** image-service owns `VideoGeneration` / `VideoGenerationAsset`. A job is
  QUEUED, STARTING, GENERATING, then COMPLETED, FAILED, TIMED_OUT or CANCELLED. The provider
  call is asynchronous: start returns an operation id, a poll loop (8 s) waits at most 12
  minutes, the clip (max 40 MB) is downloaded and stored by file-service
  (`store-generated-video`). A sweep times out rows stale for 17 minutes.
- **Money.** The hold is reserved before the provider is called, sized on the seconds. It is
  settled only after the asset row is written, and released on failure, cancel, a storage
  failure or a stale sweep. Settlement bills the clip length the provider reports, never more
  than was held.
- **Fallback.** AUTO tries Gemini `veo-3.1-fast-generate-preview`, then Grok
  `grok-imagine-video`. A credit refusal or a storage failure ends the chain: another
  provider cannot fix either.
- **Chat.** A picked veo/grok-video model, or an AUTO message `classifyVideoIntent` accepts,
  becomes a `VIDEO_GEMINI` / `VIDEO_GROK` candidate. The planner writes the shot prompt from
  the user's words, the conversation and any research (the same plan gate as images).
  The message carries `{type: 'video_generation', generationId}`; the frontend polls
  `GET /videos/:id` every 4 s.
- **Not built.** Image-to-video (a message like "animate this image" is NOT routed to video,
  because the API path does not send the image), 1080p/4K, clips over 8 seconds, OpenAI
  (Sora is gone).

## Consequences

- A user can now spend real money per clip; the hold is sized before the call (an 8 second
  Veo Standard clip holds $3.20) and refused when the balance cannot cover it.
- Free-plan behaviour follows the image gate and PAYG credit; no separate plan gate yet.

## What would make this stale

A video call that does not reserve `videoSeconds`; a seeded price for a model whose API is
gone; or a rate here that no longer matches the provider's page.
