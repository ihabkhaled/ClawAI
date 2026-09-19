# Service Guide: claw-file-generation-service

## Overview

| Property    | Value                                |
| ----------- | ------------------------------------ |
| Port        | 4013                                 |
| Database    | PostgreSQL (`claw_file_generations`) |
| ORM         | Prisma 5.22                          |
| Env prefix  | `FILE_GENERATION_`                   |
| Nginx route | `/api/v1/file-generations`           |

The file generation service converts AI-generated content into downloadable files in 7 formats: PDF, DOCX, CSV, HTML, Markdown, plain text, and JSON. It uses a two-phase approach: first generating structured content via an LLM, then converting it to the requested format.

## Database Schema

### FileGeneration

| Column             | Type                 | Notes                               |
| ------------------ | -------------------- | ----------------------------------- |
| id                 | String               | CUID primary key                    |
| userId             | String               | Requesting user                     |
| threadId           | String?              | Associated chat thread              |
| userMessageId      | String?              | Triggering user message             |
| assistantMessageId | String?              | Response message ID                 |
| prompt             | String               | User's file generation prompt       |
| content            | String? (Text)       | Generated content before conversion |
| format             | FileFormat           | TXT, MD, PDF, DOCX, CSV, JSON, HTML |
| filename           | String?              | Output filename                     |
| provider           | String               | LLM provider used                   |
| model              | String               | LLM model used                      |
| status             | FileGenerationStatus | QUEUED through COMPLETED/FAILED     |
| latencyMs          | Int?                 | Total generation time               |

### FileGenerationAsset

| Column       | Type   | Notes                 |
| ------------ | ------ | --------------------- |
| generationId | String | FK to FileGeneration  |
| storageKey   | String | Local storage path    |
| url          | String | Serve URL             |
| downloadUrl  | String | Direct download URL   |
| mimeType     | String | application/pdf, etc. |
| sizeBytes    | Int?   | File size             |

### FileGenerationEvent

Status change audit trail for each generation.

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING_CONTENT -> CONVERTING -> FINALIZING -> COMPLETED
                                                                     -> FAILED
                                                                     -> TIMED_OUT
                                                                     -> CANCELLED
```

## Two-Phase Generation

### Phase 1: Content Generation

1. User prompt is sent to an LLM (typically the LOCAL_FILE_GENERATION role model)
2. The prompt is augmented with format-specific instructions:
   - CSV: "Generate data in CSV format with headers"
   - JSON: "Generate valid JSON structure"
   - Markdown: "Generate well-structured Markdown"
3. Raw content is stored in the `content` column

### Phase 2: Format Conversion

Every format except TXT and MD is rendered from the same parsed document:
`parseMarkdownDocument` (markdown-it → typed blocks) in
`utilities/markdown-document.utility.ts` (ADR-107).

| Format | How                                                                                           |
| ------ | --------------------------------------------------------------------------------------------- |
| PDF    | Typst (`PdfRenderer`, `utilities/typst-document.utility.ts`): every script, RTL, tables, code |
| DOCX   | docx 9 (`utilities/docx-document.utility.ts`): real runs, lists, tables, `bidi` paragraphs    |
| HTML   | markdown-it with `html: false`; `<title>` and `dir` from the answer                           |
| CSV    | the first Markdown table (csv-stringify); else pass-through / one column                      |
| JSON   | valid JSON pretty-printed; else the first table as records; else `{ content }`                |
| MD/TXT | written as received                                                                           |

**Answer text enters Typst only as escaped string literals** (`typstString`),
so Typst code written in an answer is printed, never run. The compiler's
workspace is an empty temp directory. Fonts come from `fonts-noto-core` and
`fonts-noto-cjk` in the image.

## Content Extraction

Each format adapter includes a content extraction strategy for parsing LLM output:

- **CSV adapter**: Extracts tabular data, handles headers and rows
- **JSON adapter**: Parses JSON from LLM output, strips markdown fences
- **PDF adapter**: Splits content into paragraphs, detects headings
- **DOCX adapter**: Maps markdown-style structures to Word paragraphs

## API Endpoints

All under `/api/v1/file-generations` (checked against the controllers
2026-09-19; the old table listed create, status, download and delete routes
that do not exist). Users never create a generation directly: chat-service does,
over the internal route.

| Method | Path                          | Auth    | Description                                         |
| ------ | ----------------------------- | ------- | --------------------------------------------------- |
| GET    | /                             | Bearer  | List the caller's generations                       |
| POST   | /export                       | Bearer  | Export an answer as a file, no model (ADR-105)      |
| GET    | /:id                          | Bearer  | One generation with its assets (owner only)         |
| POST   | /:id/retry                    | Bearer  | Retry a failed generation (owner only)              |
| SSE    | /:id/events                   | owner   | Status stream; refused before it opens for others   |
| GET    | /:id/assets/:assetId/download | owner   | Streamed download (ADR-104)                         |
| POST   | /:id/rebuild                  | owner   | Rebuild expired bytes from the saved text (ADR-104) |
| POST   | /internal/…/generate          | service | chat-service queues a model-written file            |
| GET    | /internal/…/:id, …/:id/events | service | chat-service polls and streams                      |
| POST   | /internal/…/:id/retry         | service | chat-service retries                                |

## Events

| Event                  | Direction | Consumers |
| ---------------------- | --------- | --------- |
| file.generated         | Publish   | audit     |
| file_generation.failed | Publish   | audit     |

## Key NPM Dependencies

- `@myriaddreamin/typst-ts-node-compiler` -- Typst typesetting for PDF (ADR-107)
- `docx` -- Microsoft Word DOCX generation
- `csv-stringify` -- CSV formatting from structured data
- `markdown-it` -- Markdown to HTML conversion

## Access and writers (ADR-103, 2026-09-19)

- `POST /file-generations/:id/retry` and `GET /file-generations/:id/events`
  are owner-only. The events stream is guarded before it opens, and the
  frontend uses the authenticated `connectSse`.
- `/internal/file-generations/*` needs `Authorization: Service <token>`.
- The content is written by the admin's FILE_WRITER models (Smart Router,
  Assistant models).

## Downloads, expiry and rebuild (ADR-104, 2026-09-19)

| Method | Route                                                   | Auth  | Notes                                                                              |
| ------ | ------------------------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| GET    | `/api/v1/file-generations/:id/assets/:assetId/download` | owner | streamed; attachment, `private, no-store`, `nosniff`; 410 `FILE_EXPIRED` after 1 h |
| POST   | `/api/v1/file-generations/:id/rebuild`                  | owner | rebuilds from the saved text; the new asset gets a new hour                        |

The expiry sweep runs every 5 min and deletes bytes via file-service
`DELETE /api/v1/internal/files/:id?userId=` (service token, owner-checked).

## Answer export and request bounds (ADR-105, 2026-09-19)

| Method | Route                             | Auth   | Notes                                                                                            |
| ------ | --------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| POST   | `/api/v1/file-generations/export` | Bearer | `{content ≤ 200k, format: FileFormat, title? ≤ 120}` → `{generationId, status}`; no model called |

An export is a generation with `provider: 'EXPORT'`, `model: 'none'`. It costs
no tokens and downloads through the ADR-104 link. The chat builds `.md` and
`.txt` itself; only HTML, DOCX and PDF come here.

| Bound                               | Value     | Why                                                                                              |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| `GENERATE_MAX_PROMPT_CHARS`         | 100,000   | the prompt is the user's whole chat message; chat allows 100k (it was 4,000)                     |
| `GENERATE_MAX_CONTENT_CHARS`        | 1,000,000 | model-written content; a file writer answers in at most 32k tokens                               |
| `EXPORT_MAX_CONTENT_CHARS`          | 200,000   | one chat answer                                                                                  |
| `JSON_BODY_LIMIT_BYTES` (`main.ts`) | 8 MB      | holds every bound above at 6 bytes per char; `http.constants.spec.ts` fails if it stops doing so |

`GlobalExceptionFilter` passes body-parser's 400, 413 and 415 errors through
(`isClientHttpError`: an `Error` with `expose: true` and a 4xx `status`).
Everything else stays a 500 with a generic message.
