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

## What is NOT solved yet

- **Duration is uncapped.** `MAX_FILE_SIZE` is 50MB, which is roughly four
  hours of browser-default Opus — and four hours of audio is four hours of
  transcription billed. The limit that matters for voice is duration, not
  bytes, and it does not exist yet.
- **Modality naming disagrees.** connector-service emits the modality string
  `'AUDIO'`; routing-service's `ModalityKind` uses `'AUDIO_INPUT'`. The
  capability client matches what is actually emitted. Reconciling them is a
  routing-owned change.

## Verify

```bash
cd apps/claw-file-service
npx vitest run src/modules/files/managers/__tests__/transcription.manager.spec.ts \
  src/modules/files/clients/__tests__/transcription-capability.client.spec.ts
```

Live, per [`rules/49`](../rules/49-qa-team-discipline-and-test-evidence.md):
upload a real voice recording with a Gemini key configured, and confirm from
the file-service log that `FILE_TRANSCRIBE_COMPLETED` carries a character count
that matches what was said. A transcript nobody read is not evidence.
