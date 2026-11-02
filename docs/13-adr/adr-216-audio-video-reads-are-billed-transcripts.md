# ADR-216: Audio and video reads are billed transcripts

**Status:** Accepted

**Date:** 2026-11-02

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 37](../../rules/37-payg-credit-integrity.md), [rule 46](../../rules/46-token-quota-enforcement-and-window-integrity.md), [rule 42](../../rules/42-attachment-understanding.md). Related: [ADR-120](adr-120-clawai-owns-multimodal-orchestration.md), [ADR-137](adr-137-video-generation.md)

## Context

`POST /files/extract-text` reads documents from bytes and keeps nothing, but it could not read audio or video. A client (the VS Code extension first) that holds an audio or video file had no way to get its text. Transcription costs real provider money, so a free read would be an unmetered spend path.

## Decision

- **Endpoint:** `POST /api/v1/files/transcribe-text` in claw-file-service. Authenticated, `FILES_USE`. Body `{ contentBase64, fileName, mimeType? }`. Returns 200 `{ text, durationSeconds, provider, model?, truncated }`. Stateless: nothing is stored and no event is published.
- **Formats:** audio mp3, m4a, wav, ogg, flac, aac; `.webm` is audio only when `mimeType` is `audio/*`. Video mp4, mov, mkv, webm. A video read is the transcript of the audio track only (no frames, no vision cost).
- **Caps:** audio 12 MB (413 `TRANSCRIBE_READ_AUDIO_TOO_LARGE`). Video duration `min(plan maxVideoSeconds, 1800 s)`; a plan value of 0 means video is disabled (422). Transcript text is cut at 200,000 characters and `truncated` is set.
- **Refuse before any hold:** every 400, 401, 413 and 422 answers before credit is touched. Codes `TRANSCRIBE_READ_*`: 400 `EMPTY_MEDIA`; 402 `INSUFFICIENT_CREDIT`; 422 `UNSUPPORTED_MEDIA_TYPE`, `MEDIA_TOO_LONG`, `VIDEO_DISABLED_FOR_PLAN`, `MEDIA_UNREADABLE`, `NO_AUDIO_TRACK`, `AUDIO_EXTRACTION_FAILED`, `NO_SPEECH`; 502 `FAILED`; 503 `CREDIT_CHECK_UNAVAILABLE`, `ENTITLEMENTS_UNAVAILABLE`, `TOOL_UNAVAILABLE`, `UNAVAILABLE`.
- **Money:** billed pay-as-you-go through the existing transcription meter (reserve, call, finalize on measured units, release on failure) under a new `PaygSurface.TRANSCRIPTION_READ` in `@claw/shared-types`. requestId `transcription-read:{userId}:{uuid}:{provider}`. The ranked provider walk is unchanged (Gemini, then OpenAI, the free local container last).
- **Rule 46:** a read does NOT count against the day, week or month token windows. Those windows are chat tokens enforced by chat-service; file-service never touches them, and an attachment's transcription is credit-only today. A read follows the same path.
- **Rule 37 item 22:** a per-unit surface is never free-allowance eligible, so `TRANSCRIPTION_READ` is not in `FREE_ALLOWANCE_ELIGIBLE_SURFACES`.
- **Web:** the billing ledger label `billing.credit.surface.TRANSCRIPTION_READ` in 13 locales and `credit.constants.ts`.
- **Code:** `apps/claw-file-service/src/modules/files/{managers/transcription-read.manager.ts, services/transcription-read.service.ts, dto/transcribe-text.dto.ts, constants/transcribe-read.constants.ts, utilities/transcribe-read-media.utility.ts}`. The constants file holds the design record.

## Alternatives rejected

- **Free read:** an unmetered path to provider spend; the owner decided on 2026-11-02 that reads are billed to the caller.
- **Reuse `PaygSurface.TRANSCRIPTION`:** the attachment job and a direct read would merge on the ledger, and "where did the money go" (rule 37) could not tell them apart.
- **Count a read against the token windows:** the windows are chat tokens held by chat-service; file-service has no handle on them and a second counter would drift.
- **Extract frames for video:** adds vision cost and a second provider call for a text read; out of scope.
- **Store the media or the transcript:** this is a read; keeping bytes would turn it into an upload with retention duties.

## Consequences

- A caller with no credit gets a 402 and a user on a plan without video gets a 422, before any provider is called.
- Audio duration is not capped beyond the 12 MB byte cap; the hold is bounded by `TRANSCRIPTION_PAYG_MAX_AUDIO_SECONDS` (7,200 s).
- There is no per-endpoint ffmpeg concurrency limit yet (technical-debt register).
- Not run against a live stack or real ffmpeg yet; unit tests only (QA record `2026-11-02-audio-video-reads-billed`).

## What would make this stale

A second per-unit read endpoint, a change to the transcription provider walk, moving the token windows into a shared service, making a transcription surface free-allowance eligible, or a stored (non-stateless) read.

## Amendment 2026-11-02 (a clip renamed as audio)

The kind is decided by the file extension, so a short video renamed `.mp3` took the audio path and skipped the plan's video gate (`maxVideoSeconds`, 0 = disabled). Found by the automated security review of the commit. An audio-named upload is now probed once; a container that holds a real video stream (any codec except a still-image codec used for cover art: mjpeg, png, bmp, gif, tiff, webp, jpeg2000) is read through the video path and meets the same gate. A probe that cannot read the bytes leaves them on the audio path (fails open, as before), and an audio file with cover art stays audio. Tests: four cases in `transcription-read.manager.spec.ts` (25 pass).
