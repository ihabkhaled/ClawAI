# Service Guide: claw-file-service

## Overview

| Property    | Value                     |
| ----------- | ------------------------- |
| Port        | 4006                      |
| Database    | PostgreSQL (`claw_files`) |
| ORM         | Prisma 5.20               |
| Env prefix  | `FILES_`                  |
| Nginx route | `/api/v1/files/*`         |

The file service handles file uploads, local storage, content extraction, and chunking. Files are split into chunks for inclusion in LLM prompts during context assembly.

## Database Schema

### File

| Column          | Type                | Notes                                  |
| --------------- | ------------------- | -------------------------------------- |
| id              | String              | CUID primary key                       |
| userId          | String              | Owner                                  |
| filename        | String              | Original filename                      |
| mimeType        | String              | MIME type (e.g., text/plain)           |
| sizeBytes       | Int                 | File size in bytes                     |
| storagePath     | String              | Local filesystem path                  |
| content         | String?             | base64 of the ORIGINAL bytes — NOT text |
| extractedText   | String?             | The readable text a model is shown      |
| extractionError | String?             | Why extraction failed, when it did      |
| ingestionStatus | FileIngestionStatus | PENDING, PROCESSING, COMPLETED, FAILED |

> `content` and `extractedText` are not interchangeable, and the difference is
> the whole of ADR-093. `content` is base64 of the bytes as uploaded — correct
> for a vision model looking at an image, meaningless to a text model looking at
> a PDF. `extractedText` is what the parsers produced. This table used to
> describe `content` as "extracted text content", and a reader who believed it
> would wire a PDF's base64 into a prompt. That is exactly what happened, and it
> is why every model answered "I can't read the attached file".

### FileChunk

| Column     | Type   | Notes                         |
| ---------- | ------ | ----------------------------- |
| id         | String | CUID primary key              |
| fileId     | String | FK to File (cascading delete) |
| chunkIndex | Int    | Sequential chunk number       |
| content    | String | Chunk text content            |

## Supported File Types

| Format   | MIME Type        | Chunking Strategy       |
| -------- | ---------------- | ----------------------- |
| JSON     | application/json | Key-value flattening    |
| CSV      | text/csv         | Row-based chunking      |
| Markdown | text/markdown    | Section-based splitting |
| Text     | text/plain       | Fixed-size chunking     |
| PDF      | application/pdf  | Page-based extraction   |

## API Endpoints

| Method | Path          | Auth   | Description                       |
| ------ | ------------- | ------ | --------------------------------- |
| POST   | /             | Bearer | Upload file (multipart/form-data) |
| GET    | /             | Bearer | List user's files (paginated)     |
| GET    | /:id          | Bearer | Get file metadata                 |
| GET    | /:id/download | Bearer | Download file content             |
| GET    | /:id/chunks   | Bearer | Get file chunks                   |
| DELETE | /:id          | Bearer | Delete file and chunks            |

### Internal API (service-to-service)

| Method | Path                                | Description                                            |
| ------ | ----------------------------------- | ------------------------------------------------------ |
| GET    | /internal/files/:id/content         | The payload chat-service attaches to a turn            |
| GET    | /internal/files/:id/ingestion-state | Cheap readiness poll — status and text length, no text |
| GET    | /internal/files/:id/chunks          | Chunks, for retrieval                                  |

`/content` is the attachment path. `/chunks` serves retrieval and performs no
ownership check, which is a second reason not to route attachment content
through it.

## Upload and Chunking Flow

1. **Upload** -- file is received and saved to `FILE_STORAGE_PATH`
2. **Record creation** -- File row created with `ingestionStatus: PENDING`
3. **Extraction starts** -- `FilesService.startExtraction` calls
   `FileProcessingManager.processFile`, **unawaited**. The upload response does
   not wait: OCR on a scanned PDF runs to `OCR_TIMEOUT_MS` (30s)
4. **Content extraction** -- text is extracted per MIME type (see the table below)
5. **Chunking** -- the text is split into chunks and stored as FileChunk rows
6. **Result** -- `extractedText` and the terminal `ingestionStatus` are written
   in a single update, so a row never claims COMPLETED with no text
7. **Events** -- publishes `file.uploaded` and `file.chunked`

Step 3 is the one that did not exist. `processFile` was written, correct, and
called by nothing on the upload path; its only caller was `ZipExpansionManager`.
Measured before the fix: nine uploads produced zero chunks. See ADR-093.

**Reading the result.** A caller must consult `ingestionStatus` before deciding
a file has no text. `PENDING`/`PROCESSING` means "not yet", not "empty" —
chat-service waits, bounded, rather than telling the model the file was blank.

**Legacy rows heal on use.** Files uploaded before this was wired sit at
COMPLETED with no text, because the old schema default was COMPLETED. There is
no bulk backfill: `getFileContent` re-extracts one such row when it is actually
attached, and reports PROCESSING. A migration would have left the whole table
PENDING forever, and the file list polls a 4.2 MB endpoint while any row is
unfinished.

**Stranded rows are reaped.** Extraction is in-process, so a restart mid-run
leaves PROCESSING with no owner. The retention sweeper closes out rows older
than `STALE_PROCESSING_TIMEOUT_MS` (10 min) as FAILED.

### What each format extracts with

| MIME / extension        | Extractor                                             |
| ----------------------- | ----------------------------------------------------- |
| `application/pdf`       | `pdf-parse`, falling back to OCR when the text layer is shorter than `SCANNED_PDF_CHAR_THRESHOLD` |
| `.docx`                 | `mammoth`                                             |
| `.xlsx`                 | `ooxml-parser.utility` — sharedStrings + sheet parts, one TSV line per row, grouped by sheet name |
| `.pptx`                 | `ooxml-parser.utility` — slide parts in numeric order, plus speaker notes |
| `.rtf`                  | `rtf-parser.utility` — strips control words, font and colour tables |
| `image/*`               | tesseract OCR when `OCR_ENABLED`, else a filename placeholder |
| `video/*`               | A filename placeholder; the bytes go to the model natively where supported |
| everything else         | UTF-8 decode                                          |

XLSX used to be `buffer.toString('utf-8')` over a ZIP container, and PPTX was
accepted for upload with no extractor at all.

## Storage

Files are stored on the local filesystem at the path configured by `FILE_STORAGE_PATH`. The directory structure uses user ID subdirectories:

```
FILE_STORAGE_PATH/
  {userId}/
    {fileId}_{filename}
```

## Events

| Event         | Direction | Notes                    |
| ------------- | --------- | ------------------------ |
| file.uploaded | Publish   | After file saved to disk |
| file.chunked  | Publish   | After chunks created     |

## Download Proxy

The download endpoint streams the file from local storage with appropriate `Content-Type` and `Content-Disposition` headers. Files are scoped to the requesting user -- ownership is verified before serving.

## How chat-service attaches a file

chat-service calls `GET /internal/files/:id/content` — not the chunks API — from
`context-assembly.manager.ts`. It chooses by modality: `extractedText` for a text
model, `content` (base64) for a vision model looking at an image.

Chunks exist for retrieval and are a poor reconstruction of a document: chunking
trims, drops empty chunks, and repeats the header row on every CSV chunk. That,
plus the missing ownership check on the chunks route, is why `extractedText` is
its own column rather than a rejoin of chunk rows.

## File retention

Uploaded files are not stored forever. A nightly cron sweeper deletes rows whose `createdAt` is older than `FILE_RETENTION_DAYS` (default 30) and cascades the deletion to their `FileChunk` rows and the underlying blob on disk. The sweeper is implemented as a NestJS scheduled task driven by `FILE_RETENTION_SWEEP_CRON` (default `'0 2 * * *'` — every day at 02:00 server local time).

| Env var                            | Default       | Purpose                                                                                         |
| ---------------------------------- | ------------- | ----------------------------------------------------------------------------------------------- |
| `FILE_RETENTION_DAYS`              | `30`          | Days after `createdAt` before a file is eligible for deletion. Set to `0` to disable retention. |
| `FILE_RETENTION_SWEEP_CRON`        | `'0 2 * * *'` | 5-field cron expression for the sweeper.                                                        |
| `FILE_RETENTION_SWEEP_BATCH_LIMIT` | `100`         | Max rows removed per sweep tick (keeps DB locks short and bounded).                             |

Each sweep run:

1. Queries up to `FILE_RETENTION_SWEEP_BATCH_LIMIT` rows where `createdAt < now() - FILE_RETENTION_DAYS days` and `ingestionStatus IN (COMPLETED, FAILED)`.
2. For each row: removes the blob at `storagePath`, deletes `FileChunk` rows (Prisma cascade), then deletes the `File` row.
3. Emits a structured log event per deleted file with `requestId=retention-sweep-<runId>` for traceability.
4. Surfaces the i18n key `files.retention.expired` to the UI when a thread later tries to reference the removed file.

Failures (e.g., blob already missing on disk) are logged as `warn` and do NOT abort the sweep — the DB row is still removed so the table doesn't grow unbounded with orphan rows.

## ZIP archive expansion

Uploads sent as an archive (`application/zip`, `application/x-zip-compressed`)
are expanded inside a hardened sandbox before chunking. The expansion guards against four well-known archive attacks: ZIP bombs (extreme compression ratios), entry-count exhaustion, deeply nested archives, and disk-fill attacks.

| Env var                           | Default                    | Purpose                                                                                                            |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ZIP_MAX_EXTRACTED_SIZE_MB`       | `500`                      | Hard cap on total uncompressed bytes across all entries.                                                           |
| `ZIP_MAX_ENTRY_COUNT`             | `10000`                    | Hard cap on entries (files + directories) inside the archive.                                                      |
| `ZIP_MAX_NESTING_DEPTH`           | `5`                        | Max archive-inside-archive nesting depth before rejection.                                                         |

**OOXML is a second archive reader, under the same policy.** `.xlsx` and `.pptx`
are ZIP containers and are user input, but they are read in memory rather than
expanded to disk, so they do not route through the table above. They carry their
own equivalent bounds in `ooxml.constants.ts` — entry count, per-entry inflated
bytes (checked against the declared size *before* inflating), and a total text
budget across the whole document. Every archive this service opens is bounded;
there is no ungated path.
| `ZIP_COMPRESSION_RATIO_THRESHOLD` | `1000`                     | `uncompressed / compressed` ratio above which the upload is rejected as a likely ZIP bomb.                         |
| `ZIP_TEMP_EXTRACTION_PATH`        | `/tmp/claw-zip-extraction` | Sandbox directory. Mounted as a 1 GB `tmpfs` in dev + prod docker compose so extraction cannot fill the host disk. |

Validation order (a violation at any step aborts the upload and surfaces `files.zip.bombRejected` to the user):

1. **Nesting depth** — central directory inspected without full extraction; depth > `ZIP_MAX_NESTING_DEPTH` rejects immediately.
2. **Entry count** — central directory header count > `ZIP_MAX_ENTRY_COUNT` rejects.
3. **Compression ratio** — per-entry `uncompressedSize / compressedSize` is computed from the central directory; any entry exceeding `ZIP_COMPRESSION_RATIO_THRESHOLD` rejects.
4. **Extracted size** — sum of central-directory `uncompressedSize` across all entries > `ZIP_MAX_EXTRACTED_SIZE_MB × 1024 × 1024` rejects.
5. **Path traversal** — every entry name normalized; any entry that escapes `ZIP_TEMP_EXTRACTION_PATH` (absolute path, `..` segments, drive letters) rejects.

Only after all five checks pass is the archive streamed into the sandbox for chunking. The sandbox is cleaned up after every upload regardless of outcome.

## OCR pipeline (Slice D foundation 3)

When `OCR_ENABLED=true`, the file-service runs a tesseract worker pool that extracts text from images and scanned PDFs so non-vision chat lanes can still receive the content. The pipeline activates in two cases:

1. **Scanned PDFs.** After the normal PDF text-extraction pass, if the extracted text contains fewer than `SCANNED_PDF_CHAR_THRESHOLD` characters (default `100`) the file is treated as a scanned PDF. Each page is rasterised to an image and OCR'd. This catches the common "letter-of-employment.pdf" case where the PDF wraps a single page-image with no real text layer.
2. **Image attachments for text-only models.** Before Slice D the AttachmentResolver in `claw-chat-service` marked these as `OMITTED_NO_VISION`. With OCR enabled it instead asks file-service for OCR text and routes the file as `EXTRACTED_TEXT`, so the non-vision lane still receives the content.

| Env var                      | Default | Purpose                                                                                                      |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `OCR_ENABLED`                | `false` | Master switch. Default-OFF so existing installs keep Slice A behaviour.                                      |
| `OCR_TIMEOUT_MS`             | `30000` | Per-file timeout. A worker that exceeds this returns `OCR_FAILED` and the lane falls back to its prior mode. |
| `OCR_CONFIDENCE_MIN`         | `0.5`   | Minimum tesseract confidence accepted. Below this we tag the FileDelivery metadata `lowConfidenceOcr=true`.  |
| `OCR_LANGUAGE`               | `eng`   | Tesseract language pack. Use combinations like `eng+ara` for multi-language uploads.                         |
| `OCR_WORKER_THREADS`         | `2`     | Parallel tesseract workers per file-service container. Increase for high-throughput installs; watch memory.  |
| `SCANNED_PDF_CHAR_THRESHOLD` | `100`   | Char count below which a PDF's extracted text is treated as "scanned" and routed to OCR.                     |

OCR output lands on `File.extractedText`, alongside every other extractor's
output, and `ingestionStatus` moves to COMPLETED in the same write. The work is
done once per upload, not per attachment use.

Failure modes:

- Worker timeout → emit `OCR_FAILED` on the FileDelivery; the FE renders the i18n key `compare.delivery.ocrFailed`.
- Zero-confidence output → treated as failure, same path as timeout.
- Worker pool exhausted → enqueue and serve in FIFO order; the FE renders `compare.delivery.ocrProcessing` until the worker frees up.
