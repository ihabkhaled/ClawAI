# ADR-137: Video generation is its own metered surface, priced per second

- **Status:** Accepted (built, unit-tested and run live on 2026-09-30)
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
- **Not built.** 1080p/4K, clips over 8 seconds, OpenAI (Sora is gone). Image-to-video was
  built later, see the last section.

## Live results (2026-09-30, dev stack, admin account, 4 s clips, 720p)

| Model                           | Completed clips        | Typical time |
| ------------------------------- | ---------------------- | ------------ |
| `veo-3.1-lite-generate-preview` | 4                      | 48 s         |
| `veo-3.1-fast-generate-preview` | 4, plus 1 through AUTO | 48-66 s      |
| `veo-3.1-generate-preview`      | 4                      | 54-73 s      |
| `grok-imagine-video`            | 4                      | 54-72 s      |
| `grok-imagine-video-1.5`        | 4                      | 48-73 s      |

Every completed clip was a real mp4 (1-6 MB). Cancel, double cancel, retry (old row superseded)
and 404/401 checks passed. A dev restart mid-job was recovered by the stale sweep: rows timed
out, holds released, user told they were not charged.

Found live, fixed: Veo wants `durationSeconds` as a NUMBER (a string answers 400); xAI answers an
exhausted account with 403 `permission-denied`, which is a quota failure and not a bad key.

Metered user (Pro plan, $1 credit, 2026-10-01): one 4 s `grok-imagine-video` clip spent exactly
200,000 micro-USD; the ledger shows a `VIDEO` RESERVATION then CONSUMPTION. A refused run
(Gemini out of prepaid credit, 402) reserved 200,000 then RELEASED it, net zero.

Found by that test, fixed: auth-service's `looksLikeLocalFallback` ignored `videoPerUnitMicroUsd`,
so a video-only price (token rates 0) looked like a free local answer and a funded user was
refused `PAYG_MODEL_UNPRICED`. The admin is unmetered, so earlier live rounds could not see it.

Gate: video reuses the image plan feature (`allowImageGeneration`); Free-plan users are blocked
for both, even with credit. A separate `allowVideoGeneration` feature is a product decision.

Rounds: the 5 models ran 5 completed clips each after a top-up (one round per model was first lost
to a dev restart), 25 in total plus 1 through AUTO.

## Consequences

- A user can now spend real money per clip; the hold is sized before the call (an 8 second
  Veo Standard clip holds $3.20) and refused when the balance cannot cover it.
- Free-plan behaviour follows the image gate and PAYG credit; no separate plan gate yet.

## What would make this stale

A video call that does not reserve `videoSeconds`; a seeded price for a model whose API is
gone; or a rate here that no longer matches the provider's page.

## Image-to-video (2026-10-01)

A user attaches an image and asks for a video from it; the image is the clip's first frame.

**Provider facts (official docs, fetched 2026-10-01).**

| Provider | Input field                                                                                                                                                       | Variants that accept it                                | Limits                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Google   | `instances[0].image = {inlineData: {mimeType, data(base64)}}` on `predictLongRunning` (Gemini API; `bytesBase64Encoded` is the Vertex shape and is rejected here) | Veo 3.1, 3.1 Fast and 3.1 Lite (text and image inputs) | 4, 6 or 8 s, 16:9 or 9:16; 8 s is required only for reference images, 1080p and 4K, not for a first-frame image |
| xAI      | `image: {url}` on `POST /videos/generations`; the url may be a public URL, a base64 data URI (`data:image/jpeg;base64,...`) or a Files API id                     | `grok-imagine-video`, `grok-imagine-video-1.5`         | JPEG shown in the docs; no format or size limit published                                                       |

Both providers take it, so AUTO keeps its chain (Gemini then Grok), and a retry or fallback
hop reuses the same image. xAI is sent a data URI, so no file URL is ever exposed to a
provider. Veo's request body was NOT exercised live (the stored Gemini key is out of
prepaid credit: 402 on every call); it is covered by an adapter test of the exact body.
Price is unchanged, per second of clip.

**Decisions.**

1. **The image never travels in the request.** chat-service sends only `sourceFileId` (the
   first `image/*` file of the turn). image-service reads the bytes from file-service's
   existing owner-checked `GET /internal/files/:id/content?userId=`, which answers 404 for a
   non-owner. No new file-service route. The owner is the generation's `userId`, set by
   chat-service from the authenticated thread, never a client field.
2. **Validation (rule 16 IDOR, rule 42).** Only JPEG, PNG and WebP, at most 10 MB, and the
   magic bytes must match the declared type (the mime type sent upstream is the sniffed one).
   Every refusal (not the user's, missing, wrong type, too large, service down) is one code,
   `VIDEO_SOURCE_IMAGE_INVALID`, with a fixed sentence, so a stranger's id and a missing id
   look the same. It is a no-fallback code and runs BEFORE the PAYG hold: a refused image
   costs nothing and reaches no provider.
3. **Persistence.** `video_generations.source_file_id` (nullable; migration
   `20261001100000_add_video_source_file_id`). The existing `VideoAssetRole.REFERENCE` is
   not used: a column copies into a retry and an AUTO successor without a second table.
   The view shows `sourceFileId` (the user's own file id).
4. **Routing.** `classifyVideoIntent(text, hasAttachedImage)` also accepts "animate this",
   "bring it to life", "turn my photo into a video" when an image is attached; without an
   attachment those words still do NOT start a video (nothing to animate). A picked video
   model with an image attached is image-to-video for any prompt: `detectImageFromAttachment`
   (chat-service) and `explicitModeMayGenerate` (routing-service) both leave a video model
   alone. Found live: without the routing-service guard "make the light shift slowly" with a
   picked Grok video model was turned into an image EDIT on Gemini.
5. **Planner.** With an image the planner writes at most 300 characters of MOTION and camera
   movement and never re-describes the picture, because the provider sees it.

**Live (2026-10-01, dev stack, admin, 4 s, 720p, `grok-imagine-video` pinned MANUAL_MODEL).**
Three different generated PNGs were uploaded through `POST /files/upload` and sent with a
motion prompt and `fileIds`: 3 of 3 `COMPLETED` in 55 to 61 s, each row with
`sourceFileId` equal to its upload, and three different mp4s (sha256 prefixes `a0d13ee3`,
`224defe4`, `9e16591e`). One Veo 3.1 Fast image-to-video clip reached Google and was refused
with 402, recorded as `VIDEO_PROVIDER_QUOTA_EXCEEDED` (expected: no credit). QA threads and
files were deleted.

**Unit coverage.** Adapter request bodies (Veo `inlineData`, xAI data URI), the owner-checked
read (URL carries the caller's `userId`; a 404 from file-service refuses), type, magic-byte
and size refusal, service flow (no hold before a refused image, no fallback, retry reuses the
image), chat routing (AUTO with and without an attachment, outage reads as no image, video
model never turned into an edit), planner prompt, routing-service manual pick.

**Frontend.** No change is needed for the image to flow (the composer already sends
`fileIds`). The failure code `VIDEO_SOURCE_IMAGE_INVALID` falls back to its English sentence
until the 13 locales get a translation.
