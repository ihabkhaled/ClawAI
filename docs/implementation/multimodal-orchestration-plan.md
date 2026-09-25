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
7. **Video processing** — ffmpeg in file-service; probe metadata into `extractionMetadata`; audio track into the existing transcription path; bounded, time-biased frame sampling.
8. **Video + AUTO orchestration** — chat assembles timestamped video context; routing receives attachment modalities.
9. **Text-to-speech** — `textToSpeech` capability, endpoint, `PaygSurface.TTS`, player UI.
10. **Frontend** — recorder dims on transcription availability, not chat-model audio; video flag; chat image-generation card fixes.
11. **QA automation + knowledge** — `qa/test-multimodal.sh`, capability matrix, skills, runbooks.

Each batch ships its own knowledge delta (rule 33) and scoped gates (rule 34).

## Deviations from the pack

- Pack §140 batch split: security hardening moved first because the audit found an IDOR.
- Pack §101 names `qa/test-multimodal.sh`; created in batch 11.
- Live QA: dev containers compile the **main checkout's** `src`, so worktree code runs live only after it reaches `main` and the main checkout is updated. The main checkout carries unrelated uncommitted WIP, which is not touched.
