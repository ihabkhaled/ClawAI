# ADR-120: ClawAI owns multimodal orchestration — the selected model is not the media executor

**Status**: Accepted (batch 2b implements the capability read, the per-lane resolver and provenance; helper vision, video processing and TTS follow in batches 3–8)
**Date**: 2026-09-25
**Plan**: [multimodal-orchestration-plan.md](../implementation/multimodal-orchestration-plan.md)
**Rule**: [rules/42](../../rules/42-attachment-understanding.md) item 14

## Context

Before this decision chat-service assumed the model the user picked could read
whatever was attached:

1. **Images went to every model.** `buildMultimodalUserParts` added an
   `image_url` part for every provider. A text-only model (DeepSeek chat, a
   local `llama3.1`, an OpenAI audio deployment) either errored or answered
   about a picture it never saw. The only gate was LOCAL_ONLY / PRIVACY_FIRST.
2. **Per-model capability was never read.** connector-service knows, per model,
   whether it accepts images, audio and video (batch 2a made it the source of
   truth), but chat-service decided from a provider-level list
   (`VISION_CAPABLE_PROVIDERS`) that calls every OpenAI model vision-capable.
   `buildFileDeliveryEntries` accepted per-model metadata that no caller passed.
3. **The record lied.** `FileDeliveryMode` had no audio or video modes, so a
   voice note whose transcript the model received was recorded as
   `OMITTED_UNSUPPORTED`; `TRUNCATED_TEXT` was never emitted; single chat
   recorded nothing at all; compare classified after the fact from the
   provider list, independent of what was actually sent.
4. **A placeholder reached the model as content.** file-service writes
   `[Video file: x]` into a video row's `extractedText`; the extracted-text
   branch won and the model paraphrased our placeholder back.
5. **Video eligibility was a hardcoded set** (`GEMINI_VIDEO_CAPABLE_MODELS`)
   while routing-service already had real `supportsVideoInput` data.
6. **Compare budgeted every lane at 8k** — it named no model when it built
   the shared context.

## Decision

1. **The selected conversational model is not assumed to be the media
   executor.** For each lane (single chat, each compare lane, judge, critic)
   ClawAI decides how every attachment reaches THAT model.
2. **Capability source of truth = the connector catalog.**
   `ModelCapabilityClient` reads `GET /internal/connectors/models-snapshot`
   (60 s cache, 2.5 s timeout, never throws), keyed by the one shared
   normalizer `modelMatchKey` in `@claw/shared-utilities` (lower-case, strip
   `models/` and `:cloud`) — the same one routing-service uses. Each modality
   resolves to the tri-state `MediaCapabilityState` (SUPPORTED / UNSUPPORTED /
   UNKNOWN).
3. **Strategies** — the vocabulary every batch of this program uses:

   | Strategy    | Meaning                                               | Where today                                         |
   | ----------- | ----------------------------------------------------- | --------------------------------------------------- |
   | NATIVE      | the bytes ride the provider payload                   | images to vision lanes, video to Gemini             |
   | PREPROCESS  | ClawAI turns media into text first                    | OCR, audio transcript (file-service)                |
   | DELEGATE    | a helper model reads the media for a lane that cannot | batch 3 (`VISION_HELPER`)                           |
   | HYBRID      | native plus preprocessed context                      | batch 6–7 (video frames + transcript)               |
   | UNSUPPORTED | nothing can read it; the model is told so honestly    | video to non-video lanes, formats with no extractor |

4. **`FileDeliveryMode` is the one provenance record.** The pure resolver
   `resolveAttachmentDelivery(files, capabilities, options)` returns, per file,
   a mode and `sendNative`. The SAME decision drives the payload builders
   (`isSentNatively`) and the record, so they cannot disagree. New modes:
   `TRANSCRIPT`, `STILL_PROCESSING`, `FAILED_PROCESSING`, `NATIVE_VIDEO`;
   `TRUNCATED_TEXT` is now emitted. Single chat writes `metadata.fileDelivery`
   (compare's shape); compare records per lane from the lane's own model.
5. **A lane that cannot see gets no image bytes.** It gets the OCR text framed
   as extracted text ("The user attached an image this model cannot view
   directly. Text extracted from it (OCR): …") or a plain statement that it
   cannot see the image. `OMITTED_NO_VISION` is the seam batch 3's helper
   vision upgrades.
6. **Billing: one paid call, one surface.** The resolver spends nothing. Every
   helper that does (vision helper, transcription, TTS) gets its own
   `PaygSurface` and is metered at its own chokepoint — never folded into the
   chat call's hold.
7. **Fallback classification.** When a lane falls back to another candidate,
   the plan is re-resolved for the new model at the chokepoint; the recorded
   `fileDelivery` is always the answering model's.
8. **Unknown-capability policy.** Snapshot row → its answer. Local runtime
   (OLLAMA / LLAMACPP) with no row → the connector's own name heuristic
   (`isLocalVisionModel`). Cloud model with no row, or snapshot down →
   UNKNOWN, which falls back to the pre-existing provider-level behaviour
   (`VISION_CAPABLE_PROVIDERS` for images, `GEMINI_VIDEO_CAPABLE_MODELS` for
   video). A catalog outage never regresses a turn that used to work.
9. **Video routing reads the catalog.** Native video requires `VIDEO_INPUT`
   AND a transport that carries video bytes (Gemini's native request today);
   the suggested alternatives are built from the same data and never include
   the rejected model.
10. **Compare budgets the shared context for its smallest lane**, and keeps the
    conservative window when any lane's window is unknown.

## Alternatives rejected

- **Keep the provider-level list.** It is the defect: it calls `gpt-4o-audio`
  and `o1-mini` vision-capable and cannot express "this Gemini model takes
  video, that one does not".
- **Let the provider reject and retry.** Burns a paid call, and several
  providers silently ignore the image instead of rejecting it.
- **Copy capability into chat-service's own table.** A second source of truth
  that drifts; rule 51 item 3 forbids the same thing for context windows.
- **Fail closed on UNKNOWN.** Would strip images from every lane whenever
  connector-service is slow — a regression for the common case to protect a
  rare one.
- **Duplicate the id normalizer per service.** Rule 42 item 13 is precisely a
  normalization drift between two correct pieces of data.

## Consequences

- Operators must keep connector heuristics accurate; a wrong
  `supportsVision=false` now withholds images (visible in the `mediaDelivery`
  log line and `metadata.fileDelivery`).
- The frontend enum lags the new modes until batch 9. `readFileDeliveryFromMetadata`
  drops unknown values (single chat shows no chip for them), but the compare
  chip's `getFileDeliveryModeLabel` falls through to "truncated" for any
  unknown mode — a known mislabel until batch 9 adds the four modes and their
  13-locale labels.
- `@claw/shared-utilities` gained `modelMatchKey` / `bareModelKey`.

## Reversal conditions

Revisit if providers expose input modalities on their list endpoints (then the
catalog syncs facts instead of heuristics), or if routing-service becomes the
per-request capability authority (then chat-service reads it from the routed
decision instead of the snapshot).
