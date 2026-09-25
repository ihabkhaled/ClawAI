# Multimodal Orchestration — Intake Audit and Batch Plan

**Started:** 2026-09-25 · **Branch:** `feat/multimodal-orchestration` (worktree), each batch pushed to `origin/main`
**Source:** the "ClawAI Multimodal Orchestration Expansion" prompt pack (151 sections), run
through [rules/26](../../rules/26-prompt-pack-intake-protocol.md).
**Decision record:** [ADR-120](../13-adr/adr-120-clawai-owns-multimodal-orchestration.md) "ClawAI owns multimodal orchestration" (landed with batch 2b; ADR-119 was taken by the file-request work).

## Owner decisions (2026-09-25, second round supersedes the first where they differ)

| Question                     | Decision                                                                                                                                                                                  |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transcription billing        | **Meter via PAYG.** New `PaygSurface.TRANSCRIPTION`; paid cloud STT does reserve → call → finalize / release, charged to the uploader. Local STT stays free.                              |
| OpenAI image pricing         | **Charge the per-image rate.** OpenAI generations settle at $0 today because the per-image price is never summed. The per-image cost lives in DB pricing, never env; provider list price. |
| Plan gating                  | **Free gets the basics** (image understanding, voice notes, short video). **Paid gets everything** (image generation / edit, long video, helper vision / helper models). Server-enforced. |
| Selected model has no vision | **Helper vision.** A `VISION_HELPER` assistant role describes the image, framed as derived observations, metered on its own surface; OCR + honest note when no helper.                    |
| ffmpeg for video             | **Yes.** file-service image gets Debian `ffmpeg`; bounded spawn, argument arrays, no network protocols, temp frames garbage-collected.                                                    |
| Text-to-speech               | **Build it now.** Separate `textToSpeech` capability, endpoint, player UI, and its own `PaygSurface.TTS` — never mixed with transcription.                                                |
| Landing                      | Each gated batch is pushed to `origin/main`.                                                                                                                                              |

## Audit (against code, 2026-09-25)

| Capability                   | Status               | Evidence / gap                                                                                                                                          |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image generation (service)   | PARTIAL              | Core flow + PAYG (`PaygSurface.IMAGE`) done. `POST /images/:id/retry(-alternate)` had **no ownership check**; `/images/:id/events` SSE was `@Public()`. |
| Image generation from chat   | PARTIAL              | Keyword path works end to end. Routing's OpenAI default is retired `dall-e-3`; thread/message ids never sent; a fallback that succeeds stays invisible. |
| Image editing / variation    | PARTIAL              | Reference image works for Gemini + SD img2img. OpenAI edits, masks, inpainting: MISSING.                                                                |
| Image understanding          | PARTIAL / WRONG      | `image_url` parts go to every model with no per-model vision check. No helper path.                                                                     |
| Voice notes / transcription  | DONE (unmetered)     | Full pipeline wired; no `PaygSurface` — rule 37 violation.                                                                                              |
| Native audio into chat model | MISSING              | No provider payload carries audio.                                                                                                                      |
| TTS                          | MISSING              | No TTS anywhere; built in batch 9 (owner decision).                                                                                                     |
| Video upload                 | DONE                 | Allowlist, magic bytes, chunked upload, recorder.                                                                                                       |
| Native video                 | PARTIAL              | Gemini only, via a hardcoded chat-service model set; routing's `supportsVideoInput` is populated but read by nothing.                                   |
| Video → frames + transcript  | MISSING              | No ffmpeg, no probe, no audio-track transcription. `[Video file: x]` placeholder reaches the model as content.                                          |
| Capability source of truth   | WRONG                | Three `ModelCapability` enums; chat-service never reads per-model flags; OpenAI vision heuristic marks gpt-5 / o-series non-vision.                     |
| AUTO modality awareness      | MISSING              | Routing sends `attachmentMimeTypes: []`.                                                                                                                |
| Compare                      | PARTIAL              | Every lane budgeted at an 8k window; no per-lane media resolution; delivery recorded after the fact from a provider list.                               |
| Judge                        | DONE (compare judge) | Rebuilds context with its own model; critic gets snippets.                                                                                              |
| Delivery provenance          | PARTIAL              | `FileDeliveryMode` has no audio/video modes; single chat records nothing; `TRUNCATED_TEXT` never emitted.                                               |

## Batches

1. **Image-service hardening** — ownership on retry/retry-alternate, authenticated SSE, retired default model in routing. _Shipped `d55f80e81`._
2. **Capability foundation**
   - 2a connector-service is the per-model media source of truth (`supportsVideoInput` + migration, OpenAI vision/audio heuristics); routing sync maps snapshot `AUDIO` → `AUDIO_INPUT`.
   - 2b chat-service reads per-model capability; `FileDeliveryMode` gains transcript / video / processing / failed modes; single chat records delivery; video placeholder leak; compare budgets per real window; ADR-120.
     _Shipped:_ `ModelCapabilityClient` (connector `models-snapshot`, 60 s cache, never throws, tri-state `MediaCapabilityState`); `modelMatchKey`/`bareModelKey` moved to `@claw/shared-utilities` (routing re-exports); pure `resolveAttachmentDelivery` + `AttachmentDeliveryManager` applied at both execution chokepoints (`callProvider`, `streamCandidate`) so single chat, compare lanes, judge and critic each resolve against their own model; non-vision lanes get no image bytes, only OCR + honest note; `FileDeliveryMode` += `TRANSCRIPT`, `STILL_PROCESSING`, `FAILED_PROCESSING`, `NATIVE_VIDEO`, and `TRUNCATED_TEXT` is emitted; single chat writes `metadata.fileDelivery`; `[Video file:]` placeholder no longer reaches the model; video routing reads `VIDEO_INPUT` with the static set as UNKNOWN fallback; compare budgets for the smallest lane window (`laneTargets`); per-turn `mediaDelivery` log line; rule 42 item 14. Open: none — the four frontend labels and the gemma3 / qwen-vl / llama4 / mistral-small local heuristic shipped in the same commit.
3. **PAYG unit metering + OpenAI per-image price** — moved ahead of the rest: finalize carried only tokens, so no per-unit surface (images, STT, TTS) could be charged. _Shipped `410eedaf4`._
   _Unit-metering foundation + OpenAI image pricing landed (2026-09-25):_ optional `imageUnits` / `audioSeconds` / `ttsCharacters` on the PAYG wire (`PaygUnitCounts`), bounded in auth's reserve/finalize DTOs; hold sized on expected units, settled on measured units; `calculateCostMicroUsd` sums per-unit terms in BigInt; new `ModelCostVersion.ttsPerCharacterMicroUsd` (migration `20260925120000_add_tts_per_character_rate`); seed v4 prices gpt-image-1 $0.167 / dall-e-3 $0.040 / dall-e-2 $0.020 per image and supersedes the v3 token rows; image-service reserves `imageUnits: 1` and finalizes images returned; rule 37 item 17. Transcription (batch 4) and TTS (batch 8) reuse the same fields.
4. **Transcription metering** — `PaygSurface.TRANSCRIPTION` in file-service; local STT exempt.
   _Shipped (2026-09-25):_ `PaygSurface.TRANSCRIPTION` + `FileTranscribeFailureReasonCode` += `INSUFFICIENT_CREDIT` / `CREDIT_CHECK_UNAVAILABLE`; file-service `TranscriptionMeterManager` reserves per provider attempt (`transcription:${fileId}:${provider}`, charged to the uploader), calls, finalizes on measured units (whisper-1 `verbose_json` `duration` seconds; Gemini `usageMetadata`, sent the granted `maxOutputTokens`) or releases on throw / timeout / empty transcript; a 402, clamped hold, unreachable meter or unpriced model is a recorded refusal that never falls through to a second provider; routing seed v5 prices whisper-1 at 100 µUSD/s ($0.006/min); frontend ledger label in 13 locales. Local STT has no path yet — an exempt provider comes back unmetered with no special case. Open: gpt-4o-(mini-)transcribe are not seeded (file-service only calls whisper-1); deploy order auth → routing → file-service or paid transcription fails closed.
5. **Helper vision** — `VISION_HELPER` assistant role + `PaygSurface.VISION_HELPER`; derived-observation framing; upgrades the `OMITTED_NO_VISION` seam from 2b.
   _Implemented (2026-09-25):_ routing enum + migration `20260925150000_add_vision_helper_role` + seed (Gemini gemini-2.5-flash, OpenAI gpt-4.1-mini); chat-service `VisionHelperManager` + `VisionHelperCandidatesClient` at both chokepoints — catalog-vision-SUPPORTED candidates only (local-only on LOCAL_ONLY/PRIVACY_FIRST), one description per (user, turn, image) shared by lanes + judge (`turnId`), reserve `${turnId}:vision:${fileId}` → `callProvider` with the hold (granted ceiling, finalize/release), 402/clamp/timeout terminal, other errors fall through with `…:attempt:N`; `FileDeliveryMode.DERIVED_IMAGE_TEXT` with `helperProvider`/`helperModel`; framed block with delimiter stripping; descriptions + file text fitted jointly into the file share; ≤4 images per turn; `metadata.helperExecutions` + `visionHelper` log line; frontend label/count/tooltip + ledger label + admin tab section in 13 locales; ADR-120 addendum; skill `add-a-helper-model-role.md`. Open: plan gating (batch 6); live QA not run (dev containers compile the main checkout).
6. **Plan gating** — free: image understanding, voice notes, short video; paid: image generation / edit, long video, helper vision. Server-enforced.
   _Implemented (2026-09-25):_ `Plan.allowImageGeneration` / `allowHelperVision` / `allowTextToSpeech` (default false) + `maxVideoSeconds Int? DEFAULT 60` (null unlimited, 0 disabled), migration `20260925200000_add_media_plan_gates` (free/trial off + 60 s, starter…unlimited on + 600 s, by slug), `plan-catalog.json` `media` + seeder `mediaGateProjections`, admin plan editor, `@claw/shared-entitlements` gates + `limits.maxVideoSeconds`; image-service `ImagePlanGateManager` first in generate / retry / retry-alternate → 403 `PLAN_FEATURE_DISABLED` before any row, hold or provider call, fails closed 503; chat `callImageService` → translated `PlanFeatureNotice` (13 locales), `VisionHelperManager` → OCR + note, reason `helper_vision_plan`; ADR-122. Open: TTS and video enforcement land with batches 9 and 7/8; live QA not run (dev containers compile the main checkout).
7. **Video processing** — ffmpeg in file-service; probe metadata into `extractionMetadata`; audio track into the existing transcription path; bounded, time-biased frame sampling.
   _Implemented (2026-09-25):_ Debian `ffmpeg` in `Dockerfile.dev` + prod runner (build-time `-version` check); `media-process.utility.ts` is the only `child_process` import (arg arrays, `shell: false`, stdin ignored, SIGKILL budget, stdout cap, mkdtemp dir removed in `finally`); `-protocol_whitelist file,pipe` + `-format_whitelist <video demuxers>` before every input (HLS polyglot refused, verified on bookworm ffmpeg 5.1); `file.video_process_requested/_completed/_failed` (self-consumed, `publishConfirmed`, idempotent by placeholder + Redis `SET NX` lock); ffprobe → Zod → `extractionMetadata.media`; global caps 3840×2160 / 30 min; thumbnail ≤480 px / 96 KB; `Plan.maxVideoSeconds` enforced BEFORE the paid step (`VIDEO_TOO_LONG_FOR_PLAN` / `VIDEO_DISABLED_FOR_PLAN`, auth down → paid step skipped); audio track → 16 kHz mono MP3 → `TranscriptionManager.transcribeDerivedAudio` (requestId `transcription:${fileId}:video-audio:${provider}`, held on measured seconds; OpenAI segments, Gemini `[mm:ss]` lines); one `saveVideoExtractionResult` write of the timestamped document; `getIngestionState` PROCESSING on the placeholder, stale placeholder re-queued on poll; `POST /internal/files/:id/video-frames` (service token, owner 404, ≤8 timestamps, ≤768 px, Redis 10 min cache, never persisted); rule 42 item 15; skill `debug-a-video-the-model-cannot-read.md`. Open: chat-service does not read the document or call frames yet (batch 8); no audit-service consumer for the new events (same as transcription); frame sampling policy (which timestamps) is batch 8; ffmpeg CPU is not PAYG-metered; live QA not run (dev containers compile the main checkout).
8. **Video + AUTO orchestration** — chat assembles timestamped video context; routing receives attachment modalities.
   _Implemented (2026-09-25):_ `FileDeliveryMode.VIDEO_FRAMES_AND_TRANSCRIPT` (chat + frontend enum/label/count/tooltip, 13 locales); resolver order NATIVE_VIDEO (processed, measured duration ≤ 60 min and ≤ plan `maxVideoSeconds` read per turn; fails closed) → frames + transcript → FAILED (`video_plan_limit`) → STILL_PROCESSING; `VideoDeliveryManager` at both chokepoints after helper vision: `selectVideoFrameTimestamps` (question-biased, deterministic, case table), `VideoFramesClient` (one fetch per user/turn/video), seeing lane → labelled image parts capped by `nativeFrameCap`, blind lane → `VisionHelperManager.describeVideoFrames` (plan-gated, metered, `VIDEO_FRAME`), else transcript + honest note; framed `VIDEO:` block; transcript + descriptions share the file share with framing reserved; `videoDelivery` log line; `resolveVideoAttachmentCandidates` no longer throws or forces AUTO; file-service `/content` gains `media` + `includeContent=false`; `message.created` carries `attachmentMimeTypes` / `requiredModalities` / `transformableModalities` (`RequiredModality` in shared-types); routing ranks cloud candidates DIRECT → TRANSFORMED (→ DEGRADED last) after exposure/health/plan, prompt notes, `modalityFit:*` reason tag; AUTO research planner gets a ≤ 1 500-char attachment digest; judge rebuild keeps the video document; ADR-120 addendum, rule 42 item 16, rule 51 item 13. Open: only the cloud-router AUTO path ranks by fit; research digest is empty for a video still processing at send time; frame image tokens are estimated; live QA not run (dev containers compile the main checkout).
9. **Text-to-speech** — `textToSpeech` capability, endpoint, `PaygSurface.TTS`, player UI.
   _Implemented (2026-09-25):_ `AssistantModelRole.TTS_VOICE` (routing migration `20260925230000_add_tts_voice_role`, seeded Gemini `gemini-2.5-flash-preview-tts` then OpenAI `tts-1`, admin tab section, 13 locales); model-cost seed v6 (tts-1 15 µUSD/char, tts-1-hd 30, Gemini TTS $0.50 / $10 per 1M tokens); `PaygSurface.TTS` + ledger label (13 locales); chat-service `GET /chat-messages/speech/availability` → `{available, reason: SpeechUnavailableReason}` and `POST /chat-messages/:id/speech` (owner else 404 → plan gate 403 `PLAN_FEATURE_DISABLED` before any hold → replay stored audio of the same content hash free → speakable text, ≤ 4 000 code points, `truncated` flag → per-candidate reserve / call / finalize (OpenAI `ttsCharacters`, Gemini `usageMetadata`) or release; key-less provider skipped before any hold; rejection falls through under `tts:<msg>:<hash>:g<gen>:<n>`; 402 / clamp / meter down / deadline end the walk; none configured → 503 `TTS_UNAVAILABLE`); Gemini PCM wrapped in a RIFF/WAVE header; audio stored as the owner's file through file-service `POST /internal/files/store-generated-audio` (COMPLETED, spoken text as `extractedText`, never transcribed); `metadata.speech` records file + provider + model + characters + truncated + hash + generation, never bytes; frontend `MessageSpeechAction` (dimmed with a reason, not hidden) + `MessageSpeechPlayer` (authenticated blob, visible truncated note, localized error codes, 13 locales); ADR-120 addendum. Open: live QA not run (dev containers compile the main checkout); the connector's base URL is not used for speech (fixed provider hosts); one voice per provider (no voice picker). Fixed 2026-09-25: the hold stays open across the store and is released when the store fails, so a user is never charged for audio that was not saved.
10. **Frontend** — recorder dims on transcription availability, not chat-model audio; video flag; chat image-generation card fixes.
    - 10a **Image card: supersession, turn ids, reference reuse, runtime progress.** _Implemented (2026-09-25):_ `ImageGeneration.supersededById` (indexed) + `ImageAssetRole {OUTPUT, REFERENCE}` on `ImageGenerationAsset.role`, migration `20260925235000_add_image_supersession_and_reference_role`; `ImageGenerationRepository.createSuccessor` is the one writer (new row + link + reference copy, one transaction); AUTO fallback spawns and links its successor BEFORE the FAILED event, which carries `supersededById`; retry-alternate links and emits a superseded event; retry / retry-alternate of a non-head row → 409 `IMAGE_GENERATION_SUPERSEDED`; `GET /images/:id` → `latest` (≤ 8 hops, owner-checked every hop, foreign/missing link reads null); chat sends `threadId` / `userMessageId` / `referenceFileId` (`ImageGenerateRequest`); reference stored as a REFERENCE asset (file id only) and re-read on retry via file-service `/internal/files/:id/content` (owner-checked) or failed `IMAGE_REFERENCE_UNAVAILABLE`; ComfyUI `onEvent` forwarded and SD WebUI progress polled (bounded) into the existing SSE as `runtimeProgress` (stage + observed metrics, percent only when measured); frontend listener follows `supersededById` live and `latest` after refresh (≤ 8 hops), retries target the shown row, bounded status polling (150), card stage line `chat.imageStage.*` (13 locales, `aria-live="polite"`). Open: `assistantMessageId` stays null (the assistant message is stored after dispatch); bare-base64 references without a file id are not stored; `ImageGenerationProgressPanel` / ComfyUI timeline and runtime cancel are still not rendered/wired on the chat card; the pre-existing English `getImageStatusLabel` strings are unchanged; live QA not run (dev containers compile the main checkout).
    - 10b **Recorder, picker badges, attachment chips, reason/status i18n, video thumbnail.** _Implemented (2026-09-25):_ `useModelMediaCapabilities()` (no args; `useCompareMediaCapabilities` deleted) → `resolveMediaCapabilities`: mic enabled while any `available-models` row has `supportsAudio` or the list is empty/unknown (reason `mediaUi.recorder.noTranscription`), camera enabled unless plan `maxVideoSeconds === 0` via the existing `useEntitlements` query (reason `mediaUi.recorder.videoDisabledByPlan`), never tied to the selected model; picker rows carry `capabilities` from the row's own `supportsVision`/`supportsAudio`/`supportsVideoInput` (+ `ImageOutput` on image entries), rendered by `ModelCapabilityBadges` (glyph + localized title + sr-only); `ComposerAttachmentChips` in the chat composer (uploading → uploaded → processing → ready / failed with reason / unsupported on 415 or schema refusal; state from the existing `useFiles` poll, `aria-live=polite`, send while processing still allowed); all 15 chat-service `file_delivery.reason.*` keys + unknown fallback localized in the delivery tooltip (test reads chat-service's constants file); `getImageStatusLabelKey` replaces English `getImageStatusLabel`; processed-video thumbnail + length from the owner's `GET /files/:id` `extractionMetadata.media` (no backend change; validated data URL, fallback to the play card); `mediaUi` namespace in 13 locales (`media-ui-translations.ts`); stale `chat.recorder.*NotSupportedByModel` keys removed. Open: chips only on the main chat composer (labs/Compare keep count + progress bar); ingestion `extractionError` detail is backend English; a video processed after the message rendered shows its thumbnail only after the file-meta cache refreshes; live QA / device-matrix screenshots not run (dev containers compile the main checkout).
11. **QA automation + knowledge** — `qa/test-multimodal.sh`, capability matrix, skills, runbooks.
    _Implemented (2026-09-25):_ `qa/test-multimodal.sh` (tracked via a `.gitignore` exception; no credentials — admin from env, free + paid users created with random unprinted passwords, paid on `QA_PAID_PLAN_SLUG` + a $2 admin credit adjustment, or reused from env) covers image → blind model (`DERIVED_IMAGE_TEXT` paid / `OMITTED_NO_VISION` free), TTS (fileId, replay same fileId `cached=true` with no new `TTS` CONSUMPTION row, free 403), voice → transcription + ledger `TRANSCRIPTION` RESERVATION/CONSUMPTION, video job (`extractionMetadata.media`, `[00:` timestamps), frames route unreachable through nginx, video chat (`VIDEO_FRAMES_AND_TRANSCRIPT` / `NATIVE_VIDEO`), chat image generation (paid COMPLETED / free `plan_feature_disabled`), non-owner retry/retry-alternate/GET 404, image + chat SSE without auth 401, text-as-`.mp4` and oversized rejections, and the `mediaDelivery` / `visionHelper` / `videoDelivery` / transcription reserve-finalize / `videoProcessed` log lines; fixtures built at runtime (PNG constant, ffmpeg inside file-service), every wait deadline-bounded, explicit SKIP lines, exit = FAIL count. `scripts/qa-lab/multimodal-capability-matrix.mjs` + pure `multimodal-matrix.mjs` print the per-model matrix from the connector `models-snapshot` (or `available-models` through nginx) + `routing/assistant-models/{VISION_HELPER,TTS_VOICE}`, with `--fixture` offline mode and `tools/__tests__/multimodal-capability-matrix.test.mjs`. Skill `verify-multimodal-routing-live.md`. The script was syntax-checked and its jq filters dry-run offline; **it has not been run against a stack** (see Completion status).

Each batch ships its own knowledge delta (rule 33) and scoped gates (rule 34).

## Deviations from the pack

- Pack §140 batch split: security hardening moved first because the audit found an IDOR.
- Pack §101 names `qa/test-multimodal.sh`; created in batch 11.
- Live QA: dev containers compile the **main checkout's** `src`, so worktree code runs live only after it reaches `main` and the main checkout is updated. The main checkout carries unrelated uncommitted WIP, which is not touched.

## Completion status (pack §147, 2026-09-25)

**Live lanes: all NOT RUN.** The dev stack compiles the **main checkout's** `src`
(bind mount + `tsgo --watch`), and the main checkout is being edited by another
session and is 34+ commits behind this branch, so the running containers do not
serve this program's code. Every "code" status below is backed by scoped unit
gates per batch, not by a live run. The live evidence comes from
[`qa/test-multimodal.sh`](../../qa/test-multimodal.sh) and the capability
matrix once the stack runs this code
([skills/verify-multimodal-routing-live.md](../../skills/verify-multimodal-routing-live.md)).

| Capability          | Code status     | Live    | Evidence / what is missing                                                                                                               |
| ------------------- | --------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Image analysis      | IMPLEMENTED     | NOT RUN | Per-model vision (2b); blind lanes get helper vision (5, paid) or OCR + honest note (free, ADR-122).                                     |
| Image generation    | IMPLEMENTED     | NOT RUN | Chat → image-service, plan gate (6), OpenAI per-image price (3), supersession/progress (10a). `assistantMessageId` stays null.           |
| Image editing       | PARTIAL         | NOT RUN | Reference-image generation only (Gemini, SD img2img, reference reuse on retry). No masks, no inpainting, no OpenAI edits endpoint.       |
| Audio transcription | IMPLEMENTED     | NOT RUN | Voice notes + video audio track, metered on `PaygSurface.TRANSCRIPTION` (4). Local STT has no path; gpt-4o-(mini-)transcribe not seeded. |
| Native audio        | NOT IMPLEMENTED | NOT RUN | No provider payload carries audio; every chat model receives the transcript.                                                             |
| TTS                 | IMPLEMENTED     | NOT RUN | `TTS_VOICE` role, `PaygSurface.TTS`, replay free, player UI (9). One voice per provider; a failed store releases the hold.               |
| Video upload        | IMPLEMENTED     | NOT RUN | Allowlist, magic bytes, chunked upload, recorder (pre-existing); plan `maxVideoSeconds` enforced (7).                                    |
| Video analysis      | IMPLEMENTED     | NOT RUN | ffmpeg probe, thumbnail, audio-track transcript with `[mm:ss]` lines (7); question-biased frames (8).                                    |
| Native video        | IMPLEMENTED     | NOT RUN | `VIDEO_INPUT` models (snapshot) when processed, ≤ 60 min and ≤ plan limit (8); static Gemini set only as UNKNOWN fallback.               |
| Video fallback      | IMPLEMENTED     | NOT RUN | Frames + transcript → helper-described frames → transcript + note; `STILL_PROCESSING` / `FAILED_PROCESSING` honest modes (8).            |
| AUTO routing        | PARTIAL         | NOT RUN | `message.created` carries modalities; only the cloud-router AUTO path ranks by modality fit (8). Research digest empty while processing. |
| Compare             | IMPLEMENTED     | NOT RUN | Per-lane media resolution and per-window budget (2b, 8). Attachment chips only on the main composer; Compare keeps count + progress bar. |
| Judge               | IMPLEMENTED     | NOT RUN | Judge/critic resolve delivery against their own model; judge rebuild keeps the video document (2b, 8).                                   |
| PAYG                | IMPLEMENTED     | NOT RUN | IMAGE per-image, TRANSCRIPTION, VISION_HELPER, TTS surfaces, unit metering (3). ffmpeg CPU unmetered; frame image tokens estimated.      |
| Local models        | PARTIAL         | NOT RUN | Local vision heuristic (gemma3 / qwen-vl / llama4 / mistral-small), local-only helper on LOCAL_ONLY/PRIVACY_FIRST. No local STT or TTS.  |
| Responsive UX       | IMPLEMENTED     | NOT RUN | 10a/10b components; the device matrix (≥ 3 widths per platform, both orientations, RTL) was not captured.                                |
| Accessibility       | IMPLEMENTED     | NOT RUN | `aria-live` status lines, sr-only capability badges, localized titles (10a/10b); no axe / Lighthouse pass on these surfaces.             |

### Open gaps collected across batches

- **Deploy order is load-bearing:** auth → routing → file → image → chat; dev
  containers need `service:rebuild` (shared packages, file-service `ffmpeg`), not a restart.
- Transcription (4): local STT has no path; gpt-4o-(mini-)transcribe unseeded.
- Video (7/8): no audit-service consumer for the `file.video_process_*` events;
  ffmpeg CPU not PAYG-metered (so `unlimited` stays capped at 600 s); frame image
  tokens estimated; research digest empty for a video still processing at send.
- AUTO (8): modality-fit ranking only on the cloud-router path.
- TTS (9): connector base URL not used for speech; no voice picker. (Fixed
  2026-09-25: a paid synthesis whose store fails now RELEASES its hold.)
- Image card (10a): `assistantMessageId` null; bare-base64 references without a
  file id not stored; `ImageGenerationProgressPanel` / ComfyUI timeline and
  runtime cancel not wired on the chat card.
- Frontend (10b): chips only on the main composer; `extractionError` detail is
  backend English; a video processed after render shows its thumbnail only after
  the file-meta cache refreshes.
- Image editing: masks, inpainting and OpenAI edits not built.
- Native audio into chat models: not built.

## Live QA 2026-09-25

The first live run against `https://claw.local` (main checkout at `9448bd178`).
Evidence: [`docs/16-quality-engineering/evidence/2026-09-25-multimodal/`](../16-quality-engineering/evidence/2026-09-25-multimodal/README.md).

| Lane                                                  | Result                                                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API (`curl`, paid + free throwaway users)             | 41/41                                                                                                                                                               |
| Browser (Playwright, 11 scenarios)                    | voice/video buttons, capability badges, image generation, read-aloud replay, RTL pass; single-chat delivery note, video state and 740×360 fail (below); one TTS 504 |
| Device matrix (15 viewports, both orientations)       | 14 pass; 740×360 landscape fail                                                                                                                                     |
| RTL (Arabic at 390×844, 820×1180, 1440×900)           | pass, except English role labels                                                                                                                                    |
| axe-core 4.13.0 (chat with image, player, attachment) | 0 violations                                                                                                                                                        |
| Console / network                                     | only `llamacpp/catalog` and `ollama/models` 502 (those containers are down), plus the one TTS 504                                                                   |

### Fixed after the run (not yet re-run live)

1. **No delivery note in single chat.** `metadata.fileDelivery` was right, but
   `AttachmentDeliveryChip` was mounted only on compare/parallel cards.
   `message-bubble.tsx` now mounts it with `showDetails`: the mode badges plus one
   visible line per file (mode, helper, localized reason). No chip when the
   metadata is absent. Test: `message-bubble-file-delivery.test.tsx` (real en + ar dictionaries).
2. **Video "Ready" before its job finished.** The internal `getIngestionState`
   reported `PROCESSING` for a placeholder row, but the owner-facing list and
   `GET /files/:id` returned the stored `COMPLETED`. One function,
   `resolveEffectiveIngestionStatus` (`effective-ingestion.utility.ts`), now
   serves all three. The stored column never changes. The owner view stops
   saying `PROCESSING` after `OWNER_PLACEHOLDER_PROCESSING_CEILING_MS` (30 min),
   so a lost job cannot keep the file list polling forever (rule 42 item 10).
   Tests: `effective-ingestion.utility.spec.ts`, `files.service-extraction.spec.ts`
   "owner-facing list and detail", frontend `composer-attachment.utility.test.ts`.
3. **740×360: send/record under the bottom nav.** The topbar and bottom nav took
   128 of 360 px, and the tray could grow to 240 px. A new `short-viewport:`
   variant (`max-height: 500px`) hides the bottom nav (the topbar hamburger still
   opens the drawer) and sets `--mobile-bottom-nav-height` to 0. It also keeps
   page padding at `p-3`, makes the tray one sideways-scrolling row capped at
   `22dvh`, and caps the textarea at `30dvh`. CSS only (rule 40 §22). Test:
   `chat-surface-layout-contract.test.ts`.
4. **TTS 504.** The TTS provider timeout (60 s) equalled nginx's read timeout
   for `/api/v1/chat-messages` (the http-level 60 s). The request now has ONE
   end-to-end deadline, `SPEECH_REQUEST_BUDGET_MS` = nginx − 10 s = 50 s, for the
   provider walk AND the audio store. 10 s of it is reserved for the store and
   5 s for settling the hold, so no paid attempt starts unless both still fit
   after it (provider window 35 s, 5 s floor). A store that times out after a
   paid call is the service's own `TTS_FAILED` 504, not a raw error, and its
   hold is RELEASED (the hold now settles only after the audio is stored). Tests: `speech-gateway-timeout.spec.ts`
   reads `infra/nginx/*.conf` and asserts budget < nginx;
   `message-speech.service.spec.ts` (spent budget, store slice, store failure after
   a paid call); `speech-clients.spec.ts` (store timeout → 504, unreachable → 502).
5. **Role labels in English under Arabic.** `MESSAGE_ROLE_LABELS` became
   `MESSAGE_ROLE_LABEL_KEYS` (`chat.messageRole.*`) and is resolved with `t()`,
   with keys in all 13 locales and `i18n.types.ts`.

### Open gaps after this run

- The five fixes above are unit-gated only. The browser lane must be re-run
  once the stack serves this code (the dev containers compile the main checkout).
- On phones the floating feedback rail (− / +) and "Jump to latest" cover
  assistant text (`08-matrix-mobile-390x844-portrait.png`). This was already
  there before this program and is out of scope here.
- The file list's `?ingestionStatus=` filter still matches the stored column, so
  a placeholder video appears under `COMPLETED` while it is shown as `PROCESSING`.
- ~~A paid synthesis whose store fails is charged with no audio saved.~~ Fixed
  2026-09-25: the hold stays open across the store; a failed store releases it.
- ~~image-service finalized the hold before `storeImage`, so a failed image
  store was charged.~~ Fixed 2026-09-25: the hold settles after the asset row
  is written; a failed store or asset row releases it (`IMAGE_STORAGE_FAILED`).
- A saved language preference does not switch a tab that is already open, and
  `/ar/…` URLs stayed `lang=en` in the harness (evidence README, "Limits").

### Production deploy blocker (not this program's code)

Firecrawl's `nuq.*` tables are missing in production, so the research stack
fails its health check since ADR-121. It blocks a clean prod rollout of any
batch until fixed; nothing in this program touches Firecrawl.
