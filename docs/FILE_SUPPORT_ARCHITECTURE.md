# File Support Architecture Audit

## Overview

The file-service (port 4006) handles file upload, validation, storage, chunking, and retrieval. It uses PostgreSQL (`claw_files`) with Prisma ORM and communicates via RabbitMQ for async processing events.

---

## File Upload Pipeline

```
User Upload → Validate (type/size) → Store (local disk) → Chunk (by MIME type) → Retrieve (internal API)
     │              │                       │                      │                      │
     ▼              ▼                       ▼                      ▼                      ▼
  Frontend     ZodValidation          file-storage         FileProcessing          /internal/files
  file picker   pipe + DTO            utility.ts            Manager               :id/chunks
```

### Step 1: Upload
- `FilesController` accepts multipart file upload
- DTO validation via `upload-file.dto.ts` with Zod pipe
- Auth guard enforces JWT authentication

### Step 2: Validate
- MIME type checking at controller level
- File size limits enforced
- Supported types: JSON, CSV, Markdown, plain text

### Step 3: Store
- `file-storage.utility.ts` wraps `fs` operations (follows library wrapping rule)
- Files written to local disk at `storagePath`
- File metadata persisted to PostgreSQL via `FilesRepository`

### Step 4: Chunk
- `FileProcessingManager` reads file from disk, splits by MIME type
- JSON: splits by top-level keys (objects) or array items
- CSV: splits into 50-row batches, preserving header row
- Markdown: splits by heading boundaries (`# ## ###`)
- Plain text: splits by paragraph (double newline)
- Chunks stored via `FileChunksRepository.createMany()`
- `FILE_CHUNKED` event published to RabbitMQ on success
- `file.failed` event published on error

### Step 5: Retrieve
- `FilesInternalController` at `/internal/files/:id/chunks` — public (no auth), service-to-service only
- Returns all `FileChunk[]` for a given file ID
- Used by chat-service during context assembly to inject file content

---

## Current File Types Supported

| MIME Type | Chunking Strategy | Status |
|---|---|---|
| `application/json` | Top-level keys or array items | Working |
| `text/csv` | 50-row batches with header | Working |
| `text/markdown` | Section boundaries (headings) | Working |
| `text/plain` (default) | Paragraph splits | Working |
| PDF | Not implemented | Missing |
| Images (PNG/JPG) | Not implemented | Missing |
| DOCX/XLSX | Not implemented | Missing |

---

## What Is REAL

1. **Chunking pipeline works end-to-end** — `FileProcessingManager.processFile()` reads files, splits by type, stores chunks in DB
2. **Internal retrieval endpoint exists** — `/internal/files/:id/chunks` returns chunks for context assembly
3. **File IDs in message DTO** — chat-service accepts `fileIds` in message payloads
4. **File attachment picker in chat UI** — frontend has file upload UI component
5. **Ingestion status tracking** — `FileIngestionStatus` enum (PENDING/PROCESSING/COMPLETED/FAILED) with real state transitions
6. **RabbitMQ events** — `FILE_CHUNKED` and `file.failed` events are published
7. **Per-file-type parsing logic** — JSON, CSV, Markdown, and text each have dedicated splitters
8. **Error handling** — failed processing updates status to FAILED and publishes error event

## What Is MISSING

1. **No vector embeddings** — chunks are stored as raw text, no embedding generation, no similarity search
2. **No PDF parsing** — no `pdf-parse` or equivalent library, PDF uploads will fall through to plain text splitter
3. **No image/vision support** — no OCR, no vision model integration, no image description pipeline
4. **No semantic search** — file chunks are retrieved by file ID only, no query-based retrieval
5. **No chunk size limits** — JSON objects or CSV batches could produce arbitrarily large chunks
6. **No overlap between chunks** — no sliding window, context can be lost at chunk boundaries
7. **No file deduplication** — same file can be uploaded multiple times
8. **No file deletion cascade** — unclear if deleting a file removes its chunks
9. **No streaming for large files** — `readFile` loads entire file into memory
10. **No DOCX/XLSX/HTML parsers** — only 4 MIME types handled

---

## Ingestion Pipeline Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                     FILE SERVICE (4006)                        │
│                                                               │
│  POST /files/upload                                           │
│       │                                                       │
│       ▼                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│  │  Validate    │───▶│  Store to    │───▶│  Persist metadata│ │
│  │  (Zod DTO)  │    │  local disk  │    │  (PostgreSQL)    │ │
│  └─────────────┘    └──────────────┘    └──────────────────┘ │
│                                                │              │
│                                                ▼              │
│                                         ┌──────────────┐     │
│                                         │  Process File │     │
│                                         │  (async)      │     │
│                                         └──────┬───────┘     │
│                                                │              │
│                           ┌────────────────────┼──────────┐  │
│                           ▼                    ▼           ▼  │
│                     ┌──────────┐       ┌──────────┐ ┌──────┐ │
│                     │ splitJson│       │ splitCsv │ │split │ │
│                     │          │       │          │ │Text  │ │
│                     └────┬─────┘       └────┬─────┘ └──┬───┘ │
│                          │                  │          │      │
│                          ▼                  ▼          ▼      │
│                    ┌──────────────────────────────────────┐   │
│                    │   FileChunksRepository.createMany()  │   │
│                    └──────────────────────────────────────┘   │
│                                     │                         │
│                                     ▼                         │
│                          RabbitMQ: FILE_CHUNKED               │
│                                                               │
│  GET /internal/files/:id/chunks  ◄── chat-service calls this  │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## Parser/Chunker Design

### Current Architecture
```
FileProcessingManager
├── processFile(file)           — orchestrator
├── splitIntoChunks(content)    — filters empties, assigns indices
├── splitByType(content, mime)  — dispatcher by MIME type
├── splitJson(content)          — JSON-specific logic
├── splitCsv(content)           — CSV-specific logic (50-row batches)
├── splitMarkdown(content)      — heading-based splitting
└── splitText(content)          — paragraph-based fallback
```

### Design Strengths
- Clean separation of concerns (repository/manager/controller)
- Each MIME type has a dedicated splitting strategy
- Follows the library wrapping rule (file I/O wrapped in utility)
- Ingestion status provides visibility into pipeline state

### Design Weaknesses
- All parsing logic in a single manager class — should extract per-type parsers
- No pluggable parser interface — adding new types requires modifying the switch statement
- No chunk metadata (line numbers, section titles, byte offsets)
- No configurable chunk sizes

---

## Signs File Support Is Fake — Checklist

| # | Check | Status | Notes |
|---|---|---|---|
| 1 | Can a user upload a file and see it in the UI? | REAL | Upload endpoint + file picker exist |
| 2 | Are uploaded files actually stored on disk? | REAL | `file-storage.utility.ts` writes to disk |
| 3 | Are files chunked after upload? | REAL | `FileProcessingManager.processFile()` chunks them |
| 4 | Can chat-service retrieve chunks? | REAL | `/internal/files/:id/chunks` endpoint exists |
| 5 | Do file chunks influence AI responses? | PARTIAL | Chunks are fetched during context assembly, but no semantic relevance filtering |
| 6 | Can users search within uploaded files? | FAKE | No search endpoint, no embeddings, no similarity query |
| 7 | Does the UI show file processing status? | UNKNOWN | Ingestion status tracked in DB, unclear if frontend polls it |
| 8 | Are PDF files supported? | FAKE | No PDF parser, falls through to plain text |
| 9 | Do large files get processed correctly? | RISKY | Entire file loaded into memory, no streaming |
| 10 | Are chunks relevant to the user's query? | NO | All chunks for a file are injected, no relevance filtering |

### Verdict
File support is **partially real**. The upload-store-chunk pipeline works. The critical gap is the absence of vector embeddings and semantic search — files are chunked but all chunks are dumped into context regardless of relevance, which means file grounding is brute-force rather than intelligent.

---

## Recommended Improvements (Priority Order)

1. **Add chunk size limits + overlap** — prevent context overflow, maintain coherence
2. **Add vector embeddings** — use pgvector (already available in PG images) for semantic retrieval
3. **Add relevance filtering** — only inject chunks that match the user's query
4. **Add PDF parser** — `pdf-parse` or similar, most commonly uploaded file type
5. **Extract parser interface** — make parsers pluggable for new MIME types
6. **Add chunk metadata** — section titles, line numbers, byte ranges for attribution
7. **Stream large files** — avoid loading entire file into memory
8. **Add file deduplication** — hash-based detection of duplicate uploads
