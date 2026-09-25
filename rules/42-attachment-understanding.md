# 42 — Attachment Understanding

## Purpose

When a user attaches a file, the model must be given the **readable text of that
file**, or an honest statement of why it was not — never the raw bytes, and
never silence dressed up as an empty document.

This rule exists because ClawAI shipped the opposite for months and the symptom
was blamed on the models. Users attached a CV and every provider answered some
version of _"I can't access the attached PDF — the file content isn't
extractable in this chat."_ Ollama said it. Gemini said it. OpenAI said it.
Three independent vendors agreeing is not three vendors failing.

They were not refusing. **chat-service put that sentence in the prompt and the
models paraphrased it back.** `decodeFileContent` could not decode a PDF as
text, so it emitted `[Binary file "x.pdf" — content not extractable as text]`,
and a well-behaved model relayed it.

Underneath sat two more defects, each sufficient alone. `processFile` was
complete, correct, and **called by nothing on the upload path** — nine files
uploaded through the real API on 2026-09-12 produced zero chunks and zero
extraction log lines. And `ingestionStatus` defaulted to `COMPLETED`, so every
row claimed to be processed, which also disabled the frontend poller that
existed to show the truth.

Full reasoning:
[ADR-095](../docs/13-adr/adr-095-attachment-text-extraction-pipeline.md).

## Applies to

- `claw-file-service` — upload, extraction, the internal content endpoint.
- `claw-chat-service` — context assembly, file delivery records, judge and
  critic prompts.
- Any service or surface that reports what an attachment did.

## Mandatory rules

1. **`content` is bytes. `extractedText` is text. They are never
   interchangeable.** `files.content` holds base64 of the original upload —
   correct for a vision model looking at an image, meaningless to a text model
   looking at a PDF. Every reader chooses by modality. A reader that reaches for
   `content` to produce prompt text is rebuilding the original bug.

2. **Every upload path starts extraction.** `FilesService.startExtraction` is
   called from `uploadFile` and `createInternalFile`, and once more from
   `healLegacyRowIfNeeded` for a row that predates the pipeline. A new entry
   point must call it too. A row created without it stays `PENDING` forever and
   keeps the file-list poller running against a 4.2 MB endpoint.

3. **Extraction is started, not awaited.** OCR on a scanned PDF runs to
   `OCR_TIMEOUT_MS` (30s). Holding the upload response open for that long breaks
   the picker. The upload returns; the status carries the progress.

4. **Write the text and the terminal status together.** `saveExtractionResult`
   does both in one update. A row reading `COMPLETED` with no text, or carrying
   text while still `PROCESSING`, is a state no reader can interpret.

5. **`PENDING` and `PROCESSING` mean "not yet", never "empty".** A reader that
   treats an unfinished row as a blank file produces a confidently wrong answer,
   which is worse than an honest wait. chat-service waits, bounded, then tells
   the model the file is still being read.

6. **A failure is reported with its reason.** `extractionError` reaches the
   model, so the user hears _"this PDF is password protected"_ rather than a
   generic shrug. A placeholder that does not say why is how this defect hid.

7. **Never claim a file was delivered when it was not, and never claim it could
   not be when it was.** `FileDeliveryMode` is the record of what actually
   reached each lane. PDF, DOCX, XLSX, PPTX and RTF are `EXTRACTED_TEXT`;
   `OMITTED_UNSUPPORTED` is for formats with no extraction path at all.

8. **Accepting a format for upload obliges you to extract it.** PPTX sat in
   `ALLOWED_MIME_TYPES` with no extractor, and XLSX had one that ran
   `buffer.toString('utf-8')` over a ZIP container. Both silently produced
   garbage. Adding a MIME type to the allowlist and adding a branch to
   `extractText` are one change, not two.

9. **Every archive this service opens is bounded.** An `.xlsx` is a ZIP and is
   user input. `zip-extraction.utility.ts` guards the expand-to-disk path and
   `ooxml-parser.utility.ts` guards the in-memory path; both check the declared
   size before inflating. A third way to open an archive without bounds of its
   own is a hole in ADR-053, not a new feature.

10. **Never bulk-migrate attachment rows to `PENDING`.** Nothing reprocesses
    history, so they stay `PENDING` forever, and the file list polls while any
    row is unfinished. A data migration that does this creates a permanent poll
    loop for every existing user. History heals one file at a time, on use.

11. **A wait on another service inside the chat turn is bounded by a deadline,
    and degrades rather than throws.** An attempt count turns a slow dependency
    into an unbounded wait; a throw turns a degraded reply into no reply.

12. **`COMPLETED` can mean "the row is coherent", not "the text is final" —
    and a reader that assumes the second reading is how a voice note reaches
    the model as nothing.** An audio upload reaches `FileIngestionStatus.COMPLETED`
    the instant it is stored, with `extractedText` set to the
    `[Audio file: …]` placeholder (`AUDIO_PLACEHOLDER_PREFIX` in file-service's
    `transcription.constants.ts`, mirrored as `AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX`
    in chat-service's `voice-note.constants.ts` — see that file for why it is a
    deliberate two-copy literal, not a shared-package export) — the row is
    downloadable and usable immediately,
    and the real transcript lands later, out of band, over
    `FILE_TRANSCRIBE_REQUESTED`. `getIngestionState` reports this case as
    `PROCESSING` (never touching the persisted column) specifically so rule 5's
    bounded wait applies to it too; `decodeFileContent` never hands the
    placeholder string to the model as if it were the transcript. See
    [`skills/add-a-voice-note-or-transcription-path.md`](../skills/add-a-voice-note-or-transcription-path.md#solved-a-voice-note-reaching-the-model-as-nothing-2026-09-23).
    **The owner-facing responses report the same effective status.** The file
    list and `GET /files/:id` go through the same function as
    `getIngestionState`: `resolveEffectiveIngestionStatus` in file-service's
    `effective-ingestion.utility.ts`. A second copy of the mapping is how the
    composer showed "Ready" for a video whose job was still running (found live
    2026-09-25). The owner view alone has a ceiling
    (`OWNER_PLACEHOLDER_PROCESSING_CEILING_MS`, 30 min since the row's last
    write). Past it, the view reports the stored status again, so a lost job
    cannot keep the file list polling forever (item 10). The internal check has
    no ceiling. The list's `?ingestionStatus=` filter matches the same effective
    status through a query-level condition (`effectiveIngestionStatusWhere`),
    never by rewriting the column.

13. **A capability check and the alternatives it recommends must read the same
    identifier shape as the payload it validates, or it will reject the exact
    model it just suggested.** `resolveVideoAttachmentCandidates`
    (`video-attachment-routing.utility.ts`) compared `payload.selectedModel`
    against `GEMINI_VIDEO_CAPABLE_MODELS`, a bare-keyed set
    (`gemini-2.5-flash`, `gemini-2.5-pro`) — correct, and matching
    routing-service's real `supportsVideoInput` data for both models. But the
    Gemini connector catalog keys every model with a `models/` prefix (see
    `image-generation-target.constants.ts`'s `^(models/)?...` pattern), and the
    frontend passes that catalog id straight through. A user told to "Choose
    Gemini/gemini-2.5-flash" who did exactly that got rejected for the same
    reason, because `models/gemini-2.5-flash` never matched the bare-keyed set.
    This was not stale or wrong capability data (root cause (a) in the
    2026-09-24 triage) — it was a normalization gap between two correct pieces
    of data (root cause (b)): the check's own id-shape handling had drifted
    from a normalization pattern the same codebase already applies elsewhere.
    Two independent fixes close this class of bug for good: normalize the
    incoming id the same way before comparing, and build the suggested
    alternatives FROM the same set the rejection just consulted rather than as
    a separately hardcoded string — so the two can never disagree again, even
    if the underlying model list changes.

14. **Media is never silently dropped and never sent to a model that cannot
    read it; the payload matches the recorded `FileDeliveryMode`.** The model
    the user picked is not assumed to be the media executor (ADR-120). Each
    lane's attachments are resolved against THAT lane's catalog capability
    (`ModelCapabilityClient` → connector `models-snapshot`) by one pure
    resolver, `resolveAttachmentDelivery`, and the same decision drives both
    the provider payload (`isSentNatively`) and the record
    (`metadata.fileDelivery`). A lane whose model cannot see receives no
    `image_url` part and no `images[]` bytes — it receives the OCR text framed
    as extracted text, or a plain statement that it cannot see the image, and
    the record says `OMITTED_NO_VISION`. Audio is `TRANSCRIPT` /
    `STILL_PROCESSING` / `FAILED_PROCESSING`, never `OMITTED_UNSUPPORTED`;
    video is `NATIVE_VIDEO` only where the bytes really ride the payload. A
    file-service placeholder (`[Video file: …]`, `[Image file: …]`,
    `[Audio file: …]`) is never handed to a model as content. When the catalog
    cannot answer, capability is UNKNOWN and the pre-existing provider-level
    behaviour applies, so an outage never strips a working flow. A new payload
    builder or a new provider path reads the plan; it never re-derives "can
    this model see" on its own. When a helper vision model (the
    `VISION_HELPER` assistant role, ADR-120 batch 5) describes the image for
    such a lane, the record is `DERIVED_IMAGE_TEXT` with `helperProvider` /
    `helperModel`, and the lane receives the description only inside the
    framed "DERIVED IMAGE OBSERVATIONS … not seen directly by you" block —
    never as if the model saw the image, and never as instructions
    (`vision-helper.manager.spec.ts`, `vision-helper.utility.spec.ts`).

15. **A video is `PROCESSING` until its timestamped document lands, and its
    cost is bounded by MEASURED duration, not bytes.** A video upload reaches
    `COMPLETED` with the `[Video file: …]` placeholder (`VIDEO_PLACEHOLDER_PREFIX`,
    mirrored as chat-service's `VIDEO_FILE_PLACEHOLDER_PREFIX`); file-service's
    `VideoProcessingManager` (multimodal batch 7) probes it with ffprobe,
    checks the uploader's `Plan.maxVideoSeconds` against the probed duration
    BEFORE any paid step, transcribes the audio track through the metered
    transcription path, and writes the header + `[mm:ss–mm:ss] text` document,
    status and `extractionMetadata.media` in ONE `saveVideoExtractionResult`.
    Until then `getIngestionState`, the file list and `GET /files/:id` all
    report `PROCESSING`, exactly as item 12 does for audio. A video over the plan limit is `FAILED` with a message
    naming the limit, never silently truncated; a video with no audio track
    or an untranscribed one says so in the document. A track ffmpeg
    `volumedetect` measures as silent (peak below -50 dBFS,
    `VIDEO_SILENCE_MAX_VOLUME_DB`) is `VideoAudioStatus.NO_SPEECH` — "No speech
    detected in the audio track.", checked BEFORE the paid step, so no
    transcription call and no hold; a failed measurement fails open to
    transcription, and an empty transcript of audible audio stays
    `TRANSCRIPTION_FAILED`. ffmpeg runs only through
    `media-process.utility.ts` (argument arrays, no shell, protocol + format
    whitelists before every input, SIGKILL budget, temp dir removed), and
    frames are never persisted. Runbook:
    [`skills/debug-a-video-the-model-cannot-read.md`](../skills/debug-a-video-the-model-cannot-read.md).

16. **A video a lane cannot watch reaches it as its timestamped transcript
    PLUS sampled frames — `VIDEO_FRAMES_AND_TRANSCRIPT` — and never as
    silence.** Multimodal batch 8. Native video only where the transport
    carries bytes, the model accepts video, AND file-service has finished: the
    duration is MEASURED and inside both the provider limit and the uploader's
    `maxVideoSeconds` read for this turn (null unlimited, 0 disabled). Still
    processing → `STILL_PROCESSING`, never bytes; plan unreadable → no bytes
    (fails closed). A plan limit is never bypassed by picking a video model. Otherwise, once the
    document exists, the lane gets the framed `VIDEO:` block (header,
    `TRANSCRIPT (timestamped)`, frames by time) and the frames themselves: as
    labelled image parts for a lane that can see, as the VISION_HELPER's
    `FRAME AT mm:ss` derived observations for one that cannot (plan-gated,
    metered, one description per frame per turn, the per-turn helper cap
    shared with images), or — no helper, plan without helper vision, frames
    endpoint down — the transcript with the note "the video's frames could not
    be viewed; only its transcript was used". Which moments are sampled is
    `selectVideoFrameTimestamps`: deterministic, biased to times named in the
    question, uniform otherwise; its case table (false positives included) is
    the contract. Frames are fetched once per (user, turn, video) and shared by
    every lane, the judge and the critic. The record says what happened:
    `frameDelivery`, `frameTimestampsMs`, helper, reason; helper calls are
    `VIDEO_FRAME` executions. Choosing a model that cannot watch video is no
    longer an error — `resolveVideoAttachmentCandidates` does not throw.

17. **The user must be able to open what they sent — and the CSP is part of
    that path.** A sent attachment's bytes are fetched with a Bearer header and
    handed to the page as a `blob:` URL, so every in-page consumer of that URL
    is gated by a CSP directive that `'self'` does NOT satisfy.
    `media-src 'self' blob:` is required for `<audio>`/`<video>`: without it
    the browser falls back to `default-src 'self'` and rejects the note with
    `MEDIA_ELEMENT_ERROR 4 "URL safety check"` while Download still works —
    the 2026-09-25 "video note stuck at 0:00" report. Text previews read the
    `Blob` with `blob.text()`; they never `fetch(blobUrl)`, which is a
    `connect-src` request, and `blob:` stays out of `connect-src` and
    `frame-src`. A working download proves nothing about playback:
    `<a download>` is a navigation that no CSP directive governs.
    **A PDF is never framed inline.** `<iframe src=blob:>` needs `blob:` in
    `frame-src`, `<object>`/`<embed>` needs it in `object-src` (which stays
    `'none'` — Lighthouse's `csp-xss` audit and every strict-CSP baseline
    require it). Either would let any same-origin blob, including one minted
    from an attacker-sent inbox attachment, be framed on every page, because
    Next's client navigation keeps the first document's policy and so a
    route-scoped exception is not possible. The workspace file viewer
    (`FileViewerModal`) shows a translated "PDFs open in your browser's PDF
    viewer in a new tab" line with **Open in new tab** (`openBlobInNewTab`, a
    top-level navigation no fetch directive governs) beside **Download** —
    the same path chat attachments already use.

18. **An attachment sent with no words is a request, and the model is told so.**
    A voice note sent with "." as its text got _"Is there something I can help
    you with?"_ from gemini-2.5-pro on 2026-09-25. The transcript was in the
    prompt, framed as speech (§12) — but in the system message, while the final
    user turn, the part a model answers, said ".". When the user's text is empty
    or only whitespace/punctuation (`isTrivialUserText`) and at least one file
    is attached, `ContextAssemblyManager` replaces **that turn, for that request
    only**, with `buildAttachmentOnlyInstruction`
    (`utilities/attachment-only-turn.utility.ts`): answer what a voice note
    SAID, describe/respond to an image or video, summarize a document and offer
    next steps, and reply in the attachment's language. It lives in the three
    builders (`buildChatMessages`, `buildGeminiChatMessages`,
    `buildPromptString`) because every surface — chat, the three compare lanes,
    all seven labs — reaches a model through `callProvider`, which uses them.
    A per-mode copy is the defect this rule exists to prevent. The **stored**
    message stays empty: never persist invented text; the UI shows the
    attachments alone.
    The builders only see the FINAL user turn, and a lab appends its own
    prompt after it — so two more places carry the same resolution:
    (a) `ChatContextGatewayManager.build` rewrites the latest USER row of the
    bundle's `threadMessages` (`withAttachmentOnlyUserTurn`), so a stage never
    reads an empty user message (which Anthropic/Gemini reject) and the
    compare judge and critic see the request; `ModeExecutionGatewayManager`
    does not re-append a prompt equal to that row. (b) Every lab that QUOTES
    the user's text in its own prompt (Cost-Ensemble `Task:`, Verify
    `Question:`, Decompose plan/merge, Pipeline stage 1, Role Pack, Best-of-N,
    Repair, the Consensus synthesis, the judge's `User question:`) quotes
    `resolveContextTurnText(content, bundle.context)` instead of `content`.
    Lab user rows store `metadata.fileIds` so the bubble shows the files.
    Video: one line covers both paths — the Gemini lane that watches the video
    and the transcript + sampled-frames lane — and forbids guessing when the
    content has not reached the model. When files were attached but NONE had
    readable content (a video still processing, a failed extraction), the
    turn becomes `ATTACHMENT_ONLY_UNREADABLE_INSTRUCTION` (via
    `AssembledContext.requestedAttachmentCount`): the model tells the user it
    could not open the file yet, instead of greeting an empty message. The
    old `VIDEO_ATTACHMENT_*` refusals are not raised any more (§16); the
    frontend still maps them to translated text.

19. **Every send surface accepts empty text when files ride with it, and still
    refuses it when nothing does.** Each send schema drops its `min(1)` for
    `requireContentOrAttachments(minLength)`
    (`validators/content-or-attachments.validator.ts`), and every file list is
    `attachmentFields` (`MAX_ATTACHMENTS_PER_REQUEST = 10`). The frontend
    mirrors the cap as `MAX_ATTACHMENTS_PER_MESSAGE` and refuses the eleventh
    file in the composer with a translated message — a server "Validation
    failed" is not an answer a user can act on. An attachment-only send also
    (a) publishes `ATTACHMENT_ONLY_ROUTING_HINT` as the `message.created`
    content, because routing-service drops an event with empty content and the
    turn would never be answered, and (b) runs no web research: there is no
    text to search for.

20. **Transcription tries a ranked, bounded list of models — and the user is
    never told a status code.** `selectTranscriptionCandidates` (file-service)
    orders providers by `TRANSCRIPTION_PROVIDER_PRIORITY`, offers up to two
    models per provider (OpenAI once: its model is always `whisper-1`), puts
    stable `flash-lite` then `flash` first, and drops preview / image / tts /
    live / embedding / non-transcription product lines whenever anything
    stable exists. The walk in `TranscriptionManager#runCandidates` moves on
    after a model refusal (modality 400, 404) — to the next model of the SAME
    provider first — and after a 429, because a 429 was not processed; a
    transient 429 gets ONE short backoff retry per job, OpenAI
    `insufficient_quota` gets none, and a provider that 429s twice is skipped.
    `TRANSCRIPTION_MAX_PROVIDER_CALLS` (4) bounds the whole job, each call is
    its own PAYG hold (`…:PROVIDER`, then `…:PROVIDER:2`), and a 5xx /
    network error / content-policy block (Gemini `SAFETY`, `RECITATION`, …)
    still stops the walk. A 200 with no transcript text (empty, or only
    `thought: true` parts) gets ONE same-model retry per job under the next
    request id, then the next model; a `MAX_TOKENS` cut-off goes straight to
    the next model. Gemini transcription is sent `temperature: 0` and, only
    for models that accept it (2.5 Flash / Flash-Lite), `thinkingBudget: 0`
    (added 2026-09-25 after a 200 with 0 characters). `extractionError`
    carries a fixed sentence ("busy — try again in a minute", "temporarily
    unavailable", "no configured model accepted this recording"), never
    axios's "Request failed with status code 429". connector-service's
    snapshot re-applies the Gemini audio/video heuristic on read, so a row
    synced before that heuristic cannot advertise audio. Found live
    2026-09-25: every voice note went to `models/antigravity-preview-05-2026`
    (400), then `whisper-1` (429), and users read the raw status code.
21. **A video whose processing the owner stopped is FAILED
    `PROCESSING_CANCELLED` — never a COMPLETED row with a note.** `POST
/files/:id/processing/cancel` (owner-only, idempotent, 200) sets a Redis
    flag every replica's job reads between steps (and every second while an
    ffmpeg child runs, which is SIGKILLed), and writes the failure result only
    while the placeholder is still there; a late job's save is conditional on
    the placeholder, so it can never overwrite the cancel or publish
    "completed". A COMPLETED-with-note row would tell chat-service the
    document is ready and hand the note to models as content; FAILED keeps the
    one effective-status mapping (item 15) and the honest
    `FAILED_PROCESSING` delivery, with its own reason
    `file_delivery.reason.video_processing_cancelled` — and a cancelled video
    is never sent natively. The upload stays stored and attachable; the
    composer tile reads "Cancelled". A transcription hold in flight is
    released (rule 37 item 20).

## How this is enforced

| Rule    | Mechanism                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 5, 6 | `context-assembly-attachments.spec.ts` — asserts extracted text is preferred, and that unfinished and failed states are distinguished                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2, 3, 4 | `files.service-extraction.spec.ts` — asserts both upload paths start extraction, that the upload does not wait, and that text and status land together                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7       | `file-delivery.utility.spec.ts` — asserts the extractable documents record as `EXTRACTED_TEXT` and that `OMITTED_UNSUPPORTED` stays reserved for formats with no extraction path                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 8       | `ooxml-parser.utility.spec.ts`, `rtf-parser.utility.spec.ts` — real containers, not mocks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 9       | `ooxml-parser.utility.spec.ts` "archive bounds" — entry count and inflation caps                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 11      | `context-assembly-ingestion-wait.spec.ts` — asserts the deadline holds and that expiry resolves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 10      | The migration carries no backfill, and says why in its own comment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12      | `files.service-extraction.spec.ts` "an audio row still carrying the transcription placeholder" — asserts `PROCESSING`/`FAILED` reporting without touching the row; `context-assembly-attachments.spec.ts` "voice notes" — asserts the placeholder never leaks and a real transcript is framed as spoken words                                                                                                                                                                                                                                                                                                                     |
| 12, 15  | `effective-ingestion.utility.spec.ts` (the one mapping: placeholder → PROCESSING, error → FAILED, finished → COMPLETED, owner ceiling) and `files.service-extraction.spec.ts` "owner-facing list and detail report the effective status": list and detail agree with `getIngestionState` for placeholder video/audio, failed (with its reason) and finished rows, and the row is never written. Found live 2026-09-25.                                                                                                                                                                                                            |
| 13      | `video-attachment-routing.utility.spec.ts` — accepts the connector catalog's `models/`-prefixed id (bare and prefixed ids of every video-capable model go native); since batch 8 no model is rejected at all, so there is no suggestion text to contradict                                                                                                                                                                                                                                                                                                                                                                        |
| 13      | `exposure-pair.utility.spec.ts` (connector-service) — `models/validate-exposed` matches a bare id to a `models/`-keyed catalog row and answers in the caller's spelling. Found live 2026-09-25: the VISION_HELPER role (`gemini-2.5-flash`) was refused as unexposed while `models/gemini-2.5-flash` was EXPOSED.                                                                                                                                                                                                                                                                                                                 |
| 15      | `video-processing.manager.spec.ts` (plan 59/60/61 s, 0, null, auth down; no-audio; refused transcription; idempotent redelivery; temp dir removed; probe failure matrix); `files.service-extraction.spec.ts` "a video row still carrying its placeholder"; `media-args.utility.spec.ts` + `media-process.utility.spec.ts` (whitelists, no shell, SIGKILL, stdout cap)                                                                                                                                                                                                                                                             |
| 16      | `attachment-delivery.utility.spec.ts` "video" (strategy per state, plan refusal, duration limit); `video-frame-selection.utility.spec.ts` (timestamp case table); `video-context.utility.spec.ts` (block format, delimiters); `video-delivery.manager.spec.ts` (seeing / blind / plan-off / no helper / frames down / one fetch per turn / helper cap / 8k window / content-free log); `context-assembly-window-fit.spec.ts` (8k blind lane with transcript + 4 frame descriptions fits); `judge-referee-attachments.spec.ts` (judge rebuild keeps the video document); `video-attachment-routing.utility.spec.ts` (never throws) |
| 14      | `attachment-delivery.utility.spec.ts` (resolver matrix); `context-assembly-media-delivery.spec.ts` (non-vision payload has no `image_url` and carries the honest note; video placeholder never in a prompt); `chat-execution-media-delivery.spec.ts` (the chokepoint's body and `fileDelivery` agree); `parallel-execution-media-delivery.spec.ts` (two lanes, two records)                                                                                                                                                                                                                                                       |
| 17      | `content-security-policy.test.ts` "lets <audio>/<video> play an attachment from a blob: URL", "keeps blob: out of connect-src and frame-src" and "keeps object-src 'none'"; `file-viewer-modal.test.tsx` (no iframe/object/embed, Open in new tab + Download); `use-attachment-file-preview.test.ts` and `use-file-viewer.test.ts` assert the text preview never calls `fetch`                                                                                                                                                                                                                                                    |
| 18      | `context-assembly-attachment-only-turn.spec.ts` — all three builders rewrite only the final trivial turn, only with files attached, a video on both paths, the unreadable case; `chat-context-gateway.manager.spec.ts` + `mode-execution-gateway.manager.spec.ts` (bundle rewrite, no duplicate turn); `attachment-only-labs.spec.ts` (7 labs) + `consensus-execution.manager.spec.ts` (synthesis); `attachment-only-turn.utility.spec.ts` pins what counts as "no words" and each kind's instruction                                                                                                                             |
| 19      | `attachment-only-send.dto.spec.ts` — every send schema × (empty + files → valid, empty + no files → invalid, 11 files → invalid, whitespace fuzz); `chat-messages.service.spec.ts` "stores an attachment-only send empty but routes it on a hint"; frontend `composer-attachment.constants.test.ts` pins the cap to chat-service's constant; `use-*-page-attachments.spec.ts` (all 9 labs), `use-parallel-compare-page-attachments.spec.ts` and `use-in-thread-compare.test.tsx` send files with empty text and refuse empty text alone                                                                                           |
| 21      | file-service video cancellation specs (flag between steps, child kill, conditional save, stale re-queue skips a cancelled row); chat `attachment-delivery.utility.spec.ts` (cancelled video → `FAILED_PROCESSING`, reason `video_processing_cancelled`, never native); frontend `composer-attachment.utility.test.ts` (Cancelled state)                                                                                                                                                                                                                                                                                           |
| 20      | `transcription-candidates.utility.spec.ts` (a 19-row sample of prod's GEMINI rows → stable flash-lite first, preview never first, OpenAI once, preview only when nothing stable); `transcription-error.utility.spec.ts` "classifyTranscriptionFailure" (real 429 / 404 / modality bodies); `transcription.manager.spec.ts` "bounded candidate walk" (same-provider fall-through, prod replay, one backoff, provider skip, busy message, call ceiling, one hold per call); connector `models-snapshot.manager.spec.ts` "stale GEMINI rows synced before the fail-closed heuristic"                                                 |

## Runbook

[`skills/debug-an-attachment-the-model-cannot-read.md`](../skills/debug-an-attachment-the-model-cannot-read.md) ·
voice notes: [`docs/11-runbooks/runbook-voice-note-transcription-failed.md`](../docs/11-runbooks/runbook-voice-note-transcription-failed.md)
