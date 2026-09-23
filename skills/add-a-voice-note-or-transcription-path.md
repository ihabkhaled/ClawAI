# Skill — Transcribe audio, or add a provider that can

**When you need this**: audio is uploaded and something must read it, or a new
connector gains speech-to-text and should be usable for it.

**Related**: [`rules/17-rabbitmq-events-and-jobs.md`](../rules/17-rabbitmq-events-and-jobs.md) ·
[`rules/42-attachment-understanding.md`](../rules/42-attachment-understanding.md) ·
[`docs/04-backend/service-guide-file.md`](../docs/04-backend/service-guide-file.md)

---

## The shape of it

```
upload  →  magic-byte check  →  stored, extractedText = "[Audio file: x.mp3]"
        →  FILE_TRANSCRIBE_REQUESTED  (publishConfirmed)
        →  file-service's own queue, 3 retries then DLQ
        →  capable connector resolved  →  provider call
        →  saveExtractionResult(transcript)  →  FILE_TRANSCRIBE_COMPLETED
```

The work stays **inside file-service** on purpose. `extractedText` is written by
exactly one method, `FilesRepository.saveExtractionResult`, and there is no
endpoint that writes it from outside. Keeping the transcription there means one
writer, not two, and follows the OCR fallback that was already there.

The queue is still real: the job goes through RabbitMQ, so it retries, dead-letters
and runs concurrently with the service's prefetch, rather than blocking the upload.

## Adding a provider

1. Write an adapter in `apps/claw-file-service/src/modules/files/adapters/`, a
   plain exported function `(baseUrl, apiKey, base64, mimeType, model)` →
   transcript. Match the existing two.
2. Add the provider to `TRANSCRIPTION_PROVIDER_PRIORITY`. Order is preference,
   first capable wins.
3. Make sure the connector's adapter reports `supportsAudio: true` in
   **connector-service** — that flag is what the capability client filters on.
   OpenAI's said `false` while routing already listed it as an audio provider;
   the two sources of truth disagreed and the fallback was unreachable.

## The rules that do not bend

- **No capable connector is a refusal, not a silent pass.** If nothing can
  transcribe, `FILE_TRANSCRIBE_FAILED` is published and `extractionError`
  explains why. Never invent a transcript and never leave the user guessing.
- **A failed transcription does not downgrade the row.** The file already
  reached `COMPLETED` with usable metadata at upload; flipping it to `FAILED`
  because an optional enrichment failed loses the attachment entirely.
- **The job is published with `publishConfirmed`, not `publish`.** A dropped
  transcription job is silent — the file just never gains text.
- **Subscribe in `onModuleInit`.** The topic exchange discards a routing key
  with no bound queue, and queues are asserted by the consumer. Publishing
  before the consumer has ever run loses the message with no DLQ entry.
- **`content` is the audio, `extractedText` is the transcript.** Same rule as
  every other attachment ([ADR-095](../docs/13-adr/adr-095-attachment-text-extraction-pipeline.md)):
  handing base64 audio to a text model is how "I can't read the attached file"
  happened the first time.

## The recorder, and why a control is dimmed

`VoiceVideoRecorder` sits in the composer — once, in `OrchestrationPageShell`
and in chat's toolbar, so all nine lab pages, Compare, and chat get it
together. It hands the recorded `File` to the composer's `ingestFiles`, which
is the same upload pipeline the paperclip uses: antivirus, magic bytes, chunked
transport above the threshold. There is no second upload path and there must
not be one.

While recording, `VoiceVideoRecorder` renders `RecordingSurface`
(`components/chat/recording-surface.tsx`) instead of the old inline bar: a
full-screen sheet with a live camera preview (video notes) or a large
`RecordingWaveform` (voice notes), an elapsed timer, and a rounded pill bar —
cancel (X), a compact live waveform, stop (square), send (arrow). The waveform
is driven by `useRecordingWaveform`, an `AnalyserNode` on the SAME
`MediaStream` `useMediaRecorder` is already capturing (now exposed as
`stream`/`activeKind` on its return value) — never a second `getUserMedia`
call. Stop and Send both call the recorder's `stop()`; Send is the immediate-
intent affordance the reference UI calls for, but nothing here auto-submits
the chat message itself — that remains the composer's own Send button, same as
every other attachment. A browser with no `AnalyserNode` just shows flat bars;
recording, upload, and the timer are unaffected.

## Reliable upload — chunked transport for anything above 4MB

`useComposerAttachments` no longer POSTs the whole file as one JSON body. It
calls `useChunkedUpload`, which:

- sends a file at or below `CHUNKED_UPLOAD_THRESHOLD_BYTES` (4MB) through the
  original single-shot `/files/upload`;
- above that, splits it into `CHUNKED_UPLOAD_CHUNK_BYTES` (2MB) pieces and
  calls the four endpoints file-service added under `/files/upload/chunked/`:
  `init` → `chunks/:index` (repeated) → `complete`, with `status` for resuming;
- retries a failed chunk with capped exponential backoff
  (`CHUNKED_UPLOAD_MAX_RETRIES_PER_CHUNK` = 4 attempts, never unbounded — see
  "No Infinite Polling"), and if the whole session still fails, a second
  `upload()` call for the SAME `File` resumes via `getChunkedUploadStatus`
  instead of re-sending chunks the server already has;
- reports `percent`/`bytesPerSecond`/`etaSeconds`/`elapsedSeconds` at least
  once a second (`UploadProgressSnapshot`, rendered by the shared
  `UploadProgressIndicator` — main chat composer and every
  `OrchestrationPageShell` lab both use it, not a copy each).

Server-side, `ChunkedUploadManager`
(`apps/claw-file-service/.../managers/chunked-upload.manager.ts`) holds each
session as a manifest + per-chunk file under
`<FILE_STORAGE_PATH>/.chunk-sessions/<uploadId>/` — deliberately NOT a new
Prisma model, since a chunked-upload session is transient (minutes) and this
change had no live DB connection to prove a migration safe against. `complete`
is the ONLY place that concatenates the chunks and runs `FileSecurityManager`
(magic bytes, zip-bomb, ClamAV) against the WHOLE reassembled buffer — a
payload split across chunk boundaries is scanned whole, never bypassable
per-chunk. `FilesService.uploadFile` and `completeChunkedUpload` now share one
`persistUploadedFile` tail so both paths run the identical pipeline.

Three decisions that will look arbitrary later:

- **A model that cannot take audio gets a DIMMED button, not a hidden one.**
  Hiding a control teaches nothing; a dimmed one with a reason in its
  `title`/`aria-label` says why the model in front of you will not listen.
- **Unknown capability means ENABLED.** A local Ollama model is not a connector
  row at all, so its flags are absent rather than false. Dimming on absence
  would disable the button for most local setups for no visible reason; a clear
  server error beats a control that is greyed out and unexplained.
- **`canSendVideo` comes from `supportsVision`.** There is no `supportsVideo`
  anywhere in the stack — native video understanding rides on the vision flag,
  which is already how routing treats it.

**The recording length is capped** (`MEDIA_RECORDING_MAX_MS`, 5 minutes). That
cap is the only thing standing between a voice-note button and a four-hour
transcription bill, because the server's 50MB limit is measured in bytes and
four hours of Opus fits inside it comfortably.

**Every exit path releases the tracks.** Stop, cancel, hitting the cap, a
recorder error, a failed constructor, unmount, and unmount while the permission
prompt is still open. A leaked microphone or camera is the worst outcome this
feature can produce, and it is the one a test will not notice unless it asserts
on the tracks.

## What is NOT solved yet

- **Duration is uncapped.** `MAX_FILE_SIZE` is 50MB, which is roughly four
  hours of browser-default Opus — and four hours of audio is four hours of
  transcription billed. The limit that matters for voice is duration, not
  bytes, and it does not exist yet.
- **Modality naming disagrees.** connector-service emits the modality string
  `'AUDIO'`; routing-service's `ModalityKind` uses `'AUDIO_INPUT'`. The
  capability client matches what is actually emitted. Reconciling them is a
  routing-owned change.

## Solved: a voice note reaching the model as nothing (2026-09-23)

The live bug: a user sent a voice note to Gemini and the model answered from
prior chat context as though nothing was attached. Root cause was two bugs
stacked, both in the read path, not the write path:

1. **The race chat-service's own bounded wait was built to prevent, hiding
   inside a status check that couldn't see it.** An audio row reaches
   `FileIngestionStatus.COMPLETED` the instant the upload lands —
   `TranscriptionManager` writes the `[Audio file: x.mp3]` placeholder there
   on purpose (see "The shape of it" above), because the row is a coherent,
   downloadable attachment before a single word is transcribed. But
   `FilesService#getIngestionState` — the endpoint
   `ContextAssemblyManager#waitForIngestion` polls before assembling a turn —
   reported that persisted `COMPLETED` verbatim. Chat-service's wait loop only
   waits while the state is `PENDING`/`PROCESSING`, so it never waited at all:
   it saw `COMPLETED` on the very first poll and moved on, seconds or minutes
   before the real transcription job (dispatched over
   `FILE_TRANSCRIBE_REQUESTED`) had even started.
2. **The placeholder then reached the model as if it were the transcript.**
   `ContextAssemblyManager#decodeFileContent` had no audio-specific branch. An
   audio file's `extractedText` was non-empty and the file wasn't an image, so
   it fell into the generic "hand back the extracted text" branch — and handed
   the model the literal string `[Audio file: memo.mp3]`, framed as
   `ATTACHED FILE "memo.mp3" (use this to answer the user's questions): [Audio
file: memo.mp3]`. A model reading that sees nothing it can act on and,
   reasonably, answers as though no attachment exists — exactly the report.

Fixed both ends, without changing what the persisted `ingestionStatus` column
means anywhere else it's read:

- `FilesService#effectiveIngestionStatus` (in `files.service.ts`) is consulted
  by `getIngestionState` only. For an audio file whose `extractedText` still
  starts with `AUDIO_PLACEHOLDER_PREFIX`, it reports `PROCESSING` (or `FAILED`,
  if `extractionError` is already set) instead of the raw `COMPLETED` —
  routing a voice note into the same bounded wait every other async-extracted
  format already gets, at zero cost to what `COMPLETED` means to
  `getFileContent`, the file list, or anywhere else the real column is read.
  chat-service keeps its own copy of the same literal
  (`AUDIO_TRANSCRIPTION_PLACEHOLDER_PREFIX` in `voice-note.constants.ts`)
  rather than importing it from `@claw/shared-constants`: touching that shared
  package marks every one of the 18 services "affected" for the pre-commit
  gate, which then needs a generated Prisma client for services this change
  has nothing to do with — not worth it for a one-line string. Each copy is
  pinned by a test on its own side, so a future rename on one breaks a test
  instead of silently drifting.
- `ContextAssemblyManager#decodeAudioContent` (called from `decodeFileContent`
  before the generic extracted-text branch) now tells three states apart: a
  finished transcript is wrapped in `VOICE_NOTE_TRANSCRIPT_FRAME`
  (`voice-note.constants.ts`) — "The user sent this as a voice note, not typed
  text… answer as if you heard them say it" — so the model treats it as
  spoken words, not a pasted document; a transcription failure states the
  recorded reason; and a row still carrying the placeholder after the bounded
  wait says plainly that the voice note is still being transcribed, the same
  honest-degradation pattern already used for a still-extracting PDF.

**The stated tradeoff**: the bounded wait re-uses `FILE_INGESTION_WAIT_TIMEOUT_MS`
(12s) rather than a longer, audio-specific timeout. A short voice note
transcribes well inside that window; a long one (transcription itself is
allowed up to `TRANSCRIPTION_PROVIDER_TIMEOUT_MS`, 120s, on the file-service
side) may still be "still being transcribed" when the turn is assembled, and
the user has to send the message again a moment later — the same UX already
accepted for a slow-to-parse PDF, rather than making every message with an
attachment wait longer on the common case to cover the rare long recording.

Tests: `apps/claw-file-service/src/modules/files/services/__tests__/files.service-extraction.spec.ts`
(`getIngestionState` → `an audio row still carrying the transcription placeholder`)
and `apps/claw-chat-service/src/modules/chat-messages/managers/__tests__/context-assembly-attachments.spec.ts`
(`voice notes`).

## Verify

```bash
cd apps/claw-file-service
npx vitest run src/modules/files/managers/__tests__/transcription.manager.spec.ts \
  src/modules/files/clients/__tests__/transcription-capability.client.spec.ts \
  src/modules/files/managers/__tests__/chunked-upload.manager.spec.ts

cd ../claw-frontend
npx vitest run src/hooks/files/__tests__/use-chunked-upload.test.ts \
  src/hooks/files/__tests__/use-recording-waveform.test.ts \
  src/utilities/__tests__/chunked-upload.utility.test.ts \
  src/utilities/__tests__/recording-waveform.utility.test.ts \
  src/components/chat/__tests__/voice-video-recorder.test.tsx
```

Live, per [`rules/49`](../rules/49-qa-team-discipline-and-test-evidence.md):
upload a real voice recording with a Gemini key configured, and confirm from
the file-service log that `FILE_TRANSCRIBE_COMPLETED` carries a character count
that matches what was said. A transcript nobody read is not evidence.
