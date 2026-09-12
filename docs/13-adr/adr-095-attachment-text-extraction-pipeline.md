# ADR-095: Attachments are extracted to text, and the text is a column

- **Status**: Accepted
- **Date**: 2026-09-12
- **Deciders**: Platform / Backend
- **Related**: [service-guide-file](../04-backend/service-guide-file.md) ·
  [ADR-053](adr-053-file-retention-and-zip-guardrails.md) ·
  [ADR-054](adr-054-file-delivery-records-extracted-from-json.md) ·
  [ADR-077](adr-077-chat-service-horizontal-scaling.md) ·
  [compare-file-attachments](../03-architecture/compare-file-attachments.md)

## Context

Users attached a PDF and every model answered the same way: _"the file content
is not extractable in this chat."_ It happened across providers — Ollama,
Gemini, OpenAI — which ruled out any one model's capabilities and pointed at
the platform.

Three things were true at once, and each alone was enough to cause it.

**Extraction never ran.** `FileProcessingManager.processFile` was complete and
correct, with working PDF, DOCX and OCR branches. Nothing on the upload path
ever called it; its only caller was `ZipExpansionManager`, for entries inside an
archive. Measured before the fix: nine files uploaded through the real API
produced zero `file_chunks` rows and zero extraction log lines.

**The status column asserted otherwise.** `ingestionStatus` defaulted to
`COMPLETED`, so every row claimed to be processed. That default also disabled
the frontend's own safety net: `useFiles` polls while any file is
`PENDING`/`PROCESSING`, and no row was ever either.

**The wrong field was served.** `getFileContent` returned `files.content`,
which holds base64 of the _original bytes_. chat-service's `decodeFileContent`
found a mime it could not decode as text, and emitted
`[Binary file "x.pdf" (application/pdf) — content not extractable as text]`
into the prompt. The models were not refusing. They were reading our sentence
and paraphrasing it.

Two formats were also wrong on their own terms: XLSX "extraction" was
`buffer.toString('utf-8')` over a ZIP container, and PPTX was accepted for
upload with no extractor at all.

## Decision

**Upload starts extraction, and does not wait for it.** `FilesService` calls
`processFile` from both upload paths, unawaited. OCR on a scanned PDF runs to
`OCR_TIMEOUT_MS` (30s), and holding the upload response open for that long
breaks the picker. `ingestionStatus` now defaults to `PENDING` and the manager
drives it to `COMPLETED` or `FAILED`.

Fire-and-forget in-process, rather than a `FILE_UPLOAD_COMPLETED` consumer,
matches this service's existing convention. The cost is stated plainly below.

**Extracted text is a column on `files`, not a re-assembly of `file_chunks`.**
Two reasons, and the second is the stronger one:

- Chunking is lossy as a reconstruction. It trims, drops empty chunks, and
  `splitCsv` repeats the header row on every chunk. Rejoining chunks does not
  give back the document.
- `GET /internal/files/:id/chunks` performs no ownership check, while
  `/content` does. Routing attachment content through the chunks endpoint would
  put user documents on an IDOR-shaped route.

`content` and `extracted_text` are both kept and are not interchangeable:
`content` is what a vision model needs for an image, `extracted_text` is what a
text model needs for a document. The type that carries them says so.

**No bulk backfill of historical rows.** Flipping every pre-existing
`COMPLETED` row to `PENDING` is the obvious migration and it is a trap: nothing
reprocesses history, so those rows would sit at `PENDING` forever, and
`useFiles` polls a 4.2 MB endpoint on an uncapped interval for as long as any
row is unfinished. The migration would have created a permanent poll loop for
every existing user.

History heals lazily instead. When a legacy row is actually attached to a
message, `getFileContent` re-runs extraction for that one file and reports
`PROCESSING`, which routes it into the same bounded wait a fresh upload uses. A
file nobody opens again costs nothing.

**XLSX and PPTX are read with a small OOXML reader, not a workbook library.**
Both are ZIP containers of XML parts. `ooxml-parser.utility.ts` reads
`sharedStrings.xml` plus the sheet parts for XLSX, and the slide and notes parts
for PPTX, using the `node-stream-zip` dependency this service already has.

**That reader is bounded like any other archive path.** An `.xlsx` _is_ a ZIP
and _is_ user input. A 2 MB workbook whose `sharedStrings.xml` inflates to
several gigabytes is exactly the attack ADR-053 exists to stop, and a second
ungated way to open an archive would be a hole in that policy. Entry count,
per-entry inflated size, and total text bytes are all capped, and the declared
size is checked before inflating.

## Options considered

| Option                                                  | Why not                                                                                                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SheetJS (`xlsx`) for workbooks                          | The full workbook object model for a text slice of it, plus a licensing and advisory history this repo has no reason to take on. We need cells as text, never formulas, styles, charts or number formats. |
| `officeparser` / `node-xlsx`                            | Each pulls its own archive reader, giving the service a _third_ way to open a ZIP with its own bomb-guard story to audit. ADR-053 exists precisely to keep that count at one policy.                      |
| Reassemble text from `file_chunks`                      | Lossy, and the endpoint that serves them has no ownership check.                                                                                                                                          |
| Extract synchronously during upload                     | A 30s OCR inside the upload request.                                                                                                                                                                      |
| Extract via a `FILE_UPLOAD_COMPLETED` RabbitMQ consumer | Genuinely better for durability and would lift the replica constraint. Rejected for this change as a larger blast radius than the defect warrants; recorded as debt below.                                |
| Bulk-backfill history to `PENDING`                      | Creates a permanent uncapped poll against a 4.2 MB endpoint for every existing user.                                                                                                                      |

## Consequences

**Good.** PDF, DOCX, XLSX, PPTX, RTF and images all reach a model as readable
text. `ingestionStatus` becomes true, which activates the frontend poller that
was already written. Extraction failures now carry a _reason_ the user can act
on instead of a generic "not extractable".

**`file_delivery_records` changes meaning.** PDF/DOCX/XLSX/PPTX were stamped
`OMITTED_UNSUPPORTED` (ADR-054); they are now `EXTRACTED_TEXT`. Historical rows
and new rows disagree with no discriminator beyond their timestamp. Consumers
affected: audit-service, the admin file-usage page, the frontend delivery chips,
and the judge prompt, which is explicitly told not to penalise a lane for
`OMITTED_UNSUPPORTED`. Read any pre-2026-09-12 row as "the platform could not
deliver it", not as "this format cannot be delivered".

**file-service still cannot be replicated.** In-process fire-and-forget means
the row and its extractor live in one container. ADR-077 already records that
only chat-service scales; this adds a second reason file-service must not.

**A crashed extraction strands a row at `PROCESSING`.** The retention sweeper
reaps rows stuck past `STALE_PROCESSING_TIMEOUT_MS` to `FAILED`, so a restart
mid-extraction cannot leave a row unfinished forever — which would revive the
uncapped-poll problem this ADR spends a section avoiding.

**The OOXML reader is a reader, not a parser.** No number or date formatting, no
merged cells, no charts, no legacy `.xls`/`.doc`/`.ppt`. Regex over XML handles
the shapes Office actually emits and is not a general XML implementation.

## Revisit when

A user needs formulas, formatted dates, merged-cell layout, or legacy `.xls`.
At that point the hand-rolled reader loses and the right move is to buy the
library and wrap it per rules/13.

Also revisit if file-service needs to scale horizontally, or if extraction
durability across restarts starts mattering: both point at the RabbitMQ
consumer rejected above.
