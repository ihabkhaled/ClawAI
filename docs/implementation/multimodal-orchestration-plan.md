# Multimodal Orchestration — Intake Audit and Batch Plan

**Started:** 2026-09-25 · **Branch:** `feat/multimodal-orchestration` (worktree), each batch pushed to `origin/main`
**Source:** the "ClawAI Multimodal Orchestration Expansion" prompt pack (151 sections), run
through [rules/26](../../rules/26-prompt-pack-intake-protocol.md).
**Decision record:** ADR-119 "ClawAI owns multimodal orchestration" (lands with batch 2).

## Owner decisions (2026-09-25)

| Question                     | Decision                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transcription billing        | **Meter it.** New `PaygSurface.TRANSCRIPTION`; file-service reserves / finalizes / releases per paid transcription, charged to the uploader.                           |
| Selected model has no vision | **Helper vision.** A `VISION_HELPER` assistant role describes the image, framed as derived observations, metered on its own surface; OCR + honest note when no helper. |
| ffmpeg for video             | **Yes.** file-service image gets Debian `ffmpeg`; bounded spawn, argument arrays, no network protocols, temp frames garbage-collected.                                 |
| Landing                      | Each gated batch is pushed to `origin/main`.                                                                                                                           |
| Text-to-speech               | **Out of scope.** Audited as MISSING; not built. Routing's `supportsAudioOutput` stays unused.                                                                         |

## Audit (against code, 2026-09-25)

| Capability                   | Status               | Evidence / gap                                                                                                                                          |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image generation (service)   | PARTIAL              | Core flow + PAYG (`PaygSurface.IMAGE`) done. `POST /images/:id/retry(-alternate)` had **no ownership check**; `/images/:id/events` SSE was `@Public()`. |
| Image generation from chat   | PARTIAL              | Keyword path works end to end. Routing's OpenAI default is retired `dall-e-3`; thread/message ids never sent; a fallback that succeeds stays invisible. |
| Image editing / variation    | PARTIAL              | Reference image works for Gemini + SD img2img. OpenAI edits, masks, inpainting: MISSING.                                                                |
| Image understanding          | PARTIAL / WRONG      | `image_url` parts go to every model with no per-model vision check. No helper path.                                                                     |
| Voice notes / transcription  | DONE (unmetered)     | Full pipeline wired; no `PaygSurface` — rule 37 violation.                                                                                              |
| Native audio into chat model | MISSING              | No provider payload carries audio.                                                                                                                      |
| TTS                          | MISSING              | Out of scope (owner decision).                                                                                                                          |
| Video upload                 | DONE                 | Allowlist, magic bytes, chunked upload, recorder.                                                                                                       |
| Native video                 | PARTIAL              | Gemini only, via a hardcoded chat-service model set; routing's `supportsVideoInput` is populated but read by nothing.                                   |
| Video → frames + transcript  | MISSING              | No ffmpeg, no probe, no audio-track transcription. `[Video file: x]` placeholder reaches the model as content.                                          |
| Capability source of truth   | WRONG                | Three `ModelCapability` enums; chat-service never reads per-model flags; OpenAI vision heuristic marks gpt-5 / o-series non-vision.                     |
| AUTO modality awareness      | MISSING              | Routing sends `attachmentMimeTypes: []`.                                                                                                                |
| Compare                      | PARTIAL              | Every lane budgeted at an 8k window; no per-lane media resolution; delivery recorded after the fact from a provider list.                               |
| Judge                        | DONE (compare judge) | Rebuilds context with its own model; critic gets snippets.                                                                                              |
| Delivery provenance          | PARTIAL              | `FileDeliveryMode` has no audio/video modes; single chat records nothing; `TRUNCATED_TEXT` never emitted.                                               |

## Batches

1. **Image-service hardening** — ownership on retry/retry-alternate, authenticated SSE, retired default model in routing.
2. **Capability foundation** — chat-service reads per-model capability from connector-service; `FileDeliveryMode` gains transcript / video / processing / failed modes; single chat records delivery; OpenAI vision heuristic; video placeholder leak; ADR-119.
3. **Helper vision** — `VISION_HELPER` role + `PaygSurface.VISION_HELPER`; derived-observation framing; compare lanes resolve per model.
4. **Transcription metering** — `PaygSurface.TRANSCRIPTION` in file-service.
5. **Video processing** — ffmpeg in file-service; probe metadata into `extractionMetadata`; audio track into the existing transcription path; bounded, time-biased frame sampling.
6. **Video + AUTO orchestration** — chat assembles timestamped video context; routing receives attachment modalities.
7. **Frontend** — recorder dims on transcription availability, not chat-model audio; video flag; chat image-generation card fixes.
8. **QA automation + knowledge** — `qa/test-multimodal.sh`, capability matrix, skills, runbooks.

Each batch ships its own knowledge delta (rule 33) and scoped gates (rule 34).

## Deviations from the pack

- Pack §15 TTS: not built, owner decision.
- Pack §140 batch split: security hardening moved first because the audit found an IDOR.
- Pack §101 names `qa/test-multimodal.sh`; created in batch 8.
- Live QA: dev containers compile the **main checkout's** `src`, so worktree code runs live only after it reaches `main` and the main checkout is updated. The main checkout carries unrelated uncommitted WIP, which is not touched.
