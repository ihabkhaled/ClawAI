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
[ADR-094](../docs/13-adr/adr-094-attachment-text-extraction-pipeline.md).

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

## How this is enforced

| Rule    | Mechanism                                                                                                                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1, 5, 6 | `context-assembly-attachments.spec.ts` — asserts extracted text is preferred, and that unfinished and failed states are distinguished                                            |
| 2, 3, 4 | `files.service-extraction.spec.ts` — asserts both upload paths start extraction, that the upload does not wait, and that text and status land together                           |
| 7       | `file-delivery.utility.spec.ts` — asserts the extractable documents record as `EXTRACTED_TEXT` and that `OMITTED_UNSUPPORTED` stays reserved for formats with no extraction path |
| 8       | `ooxml-parser.utility.spec.ts`, `rtf-parser.utility.spec.ts` — real containers, not mocks                                                                                        |
| 9       | `ooxml-parser.utility.spec.ts` "archive bounds" — entry count and inflation caps                                                                                                 |
| 11      | `context-assembly-ingestion-wait.spec.ts` — asserts the deadline holds and that expiry resolves                                                                                  |
| 10      | The migration carries no backfill, and says why in its own comment                                                                                                               |

## Runbook

[`skills/debug-an-attachment-the-model-cannot-read.md`](../skills/debug-an-attachment-the-model-cannot-read.md)
