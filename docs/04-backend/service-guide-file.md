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
| content         | String?             | Extracted text content                 |
| ingestionStatus | FileIngestionStatus | PENDING, PROCESSING, COMPLETED, FAILED |

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

| Method | Path                       | Description                       |
| ------ | -------------------------- | --------------------------------- |
| GET    | /internal/files/:id/chunks | Fetch chunks for context assembly |

## Upload and Chunking Flow

1. **Upload** -- file is received via multipart form-data and saved to `FILE_STORAGE_PATH`
2. **Record creation** -- File record created with `ingestionStatus: PENDING`
3. **Content extraction** -- raw text is extracted based on MIME type
4. **Chunking** -- content is split into manageable chunks (default ~2000 chars per chunk)
5. **Storage** -- chunks are stored as FileChunk records
6. **Status update** -- `ingestionStatus` updated to COMPLETED (or FAILED)
7. **Events** -- publishes `file.uploaded` and `file.chunked` events

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

## Chunk Assembly

When the chat service needs file content for a prompt, it calls the internal chunks API. The chunks are assembled in order and injected into the prompt with a file header:

```
--- File: example.csv ---
[chunk 1 content]
[chunk 2 content]
--- End File ---
```

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

ZIP-format uploads (`.zip`, `.docx`, `.xlsx`, `.pptx`, `.odt`, …) are expanded inside a hardened sandbox before chunking. The expansion guards against four well-known archive attacks: ZIP bombs (extreme compression ratios), entry-count exhaustion, deeply nested archives, and disk-fill attacks.

| Env var                           | Default                    | Purpose                                                                                                            |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ZIP_MAX_EXTRACTED_SIZE_MB`       | `500`                      | Hard cap on total uncompressed bytes across all entries.                                                           |
| `ZIP_MAX_ENTRY_COUNT`             | `10000`                    | Hard cap on entries (files + directories) inside the archive.                                                      |
| `ZIP_MAX_NESTING_DEPTH`           | `5`                        | Max archive-inside-archive nesting depth before rejection.                                                         |
| `ZIP_COMPRESSION_RATIO_THRESHOLD` | `1000`                     | `uncompressed / compressed` ratio above which the upload is rejected as a likely ZIP bomb.                         |
| `ZIP_TEMP_EXTRACTION_PATH`        | `/tmp/claw-zip-extraction` | Sandbox directory. Mounted as a 1 GB `tmpfs` in dev + prod docker compose so extraction cannot fill the host disk. |

Validation order (a violation at any step aborts the upload and surfaces `files.zip.bombRejected` to the user):

1. **Nesting depth** — central directory inspected without full extraction; depth > `ZIP_MAX_NESTING_DEPTH` rejects immediately.
2. **Entry count** — central directory header count > `ZIP_MAX_ENTRY_COUNT` rejects.
3. **Compression ratio** — per-entry `uncompressedSize / compressedSize` is computed from the central directory; any entry exceeding `ZIP_COMPRESSION_RATIO_THRESHOLD` rejects.
4. **Extracted size** — sum of central-directory `uncompressedSize` across all entries > `ZIP_MAX_EXTRACTED_SIZE_MB × 1024 × 1024` rejects.
5. **Path traversal** — every entry name normalized; any entry that escapes `ZIP_TEMP_EXTRACTION_PATH` (absolute path, `..` segments, drive letters) rejects.

Only after all five checks pass is the archive streamed into the sandbox for chunking. The sandbox is cleaned up after every upload regardless of outcome.
