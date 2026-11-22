# API Reference — File Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4006/api/v1` (direct)

---

## POST /files/upload

Upload a file. The file is stored on disk and chunked for context assembly.

**Auth**: Bearer token
**Request Body**:

```json
{
  "filename": "readme.md",
  "mimeType": "text/markdown",
  "content": "# My Project\n\nThis is the readme content...",
  "sizeBytes": 1234
}
```

**Response 201**:

```json
{
  "id": "clfile...",
  "userId": "cluser...",
  "filename": "readme.md",
  "mimeType": "text/markdown",
  "sizeBytes": 1234,
  "storagePath": "/data/files/cluser.../readme.md",
  "content": "# My Project\n...",
  "ingestionStatus": "COMPLETED",
  "createdAt": "2026-04-11T10:00:00.000Z",
  "updatedAt": "2026-04-11T10:00:00.000Z"
}
```

**curl**:

```bash
curl -X POST http://localhost:4000/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.txt","mimeType":"text/plain","content":"Hello world","sizeBytes":11}'
```

---

## GET /files

List the current user's files.

**Auth**: Bearer token
**Query Parameters**:

- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `search` (string) — search by filename

**Response 200**: `PaginatedResult<File>`

---

## GET /files/:id

Get file metadata.

**Auth**: Bearer token (must own file)
**Response 200**: File object
**Errors**: `404 ENTITY_NOT_FOUND`, `403 FORBIDDEN`

---

## DELETE /files/:id

Delete a file and its chunks.

**Auth**: Bearer token (must own file)
**Response 200**: Deleted File

---

## GET /files/download/:id

Download a file's content as a binary stream.

**Auth**: Bearer token (must own file)
**Response**: Binary stream with appropriate Content-Type and Content-Disposition headers

**curl**:

```bash
curl http://localhost:4000/api/v1/files/download/clfile... \
  -H "Authorization: Bearer $TOKEN" \
  -o downloaded_file.md
```

---

## GET /files/:id/chunks

Get all text chunks for a file.

**Auth**: Bearer token (must own file)
**Response 200**:

```json
[
  {
    "id": "clchunk0...",
    "fileId": "clfile...",
    "chunkIndex": 0,
    "content": "# My Project\n\nFirst section...",
    "createdAt": "2026-04-11T10:00:00.000Z"
  },
  {
    "id": "clchunk1...",
    "fileId": "clfile...",
    "chunkIndex": 1,
    "content": "## Second Section\n\nMore content...",
    "createdAt": "2026-04-11T10:00:00.000Z"
  }
]
```

---

## Supported File Types for Chunking

| MIME Type          | Extension | Chunking Strategy   |
| ------------------ | --------- | ------------------- |
| `text/plain`       | .txt      | By line count       |
| `text/markdown`    | .md       | By headers/sections |
| `application/json` | .json     | By structure        |
| `text/csv`         | .csv      | By rows             |

---

## Internal Endpoints (Not Exposed via Nginx)

### GET /internal/files/:id/chunks

Get chunks without auth. Used by chat-service for context assembly.

### GET /internal/files/:id/content

Get file content without auth. Returns `{ id, filename, mimeType, content }`.

### GET /internal/files/download/:id

Download without auth. Used by image/file-gen services.

### POST /internal/files/store-image

Store a base64-encoded image as a file. Used by image-service.

```json
{
  "userId": "cluser...",
  "filename": "generated-image.png",
  "mimeType": "image/png",
  "base64Data": "iVBORw0KGgoAAAANSUhEUg..."
}
```

Response: `{ "fileId": "clfile..." }`

### POST /internal/files/transcribe-chunk

Live Intelligence ([ADR-221](../13-adr/adr-221-live-intelligence-shared-live-stream-analysis.md)).
Service token (`Authorization: Service <INTER_SERVICE_AUTH_TOKEN>`). Transcribes one audio chunk
at the **platform's** cost: the same ranked provider walk as uploads (Gemini, OpenAI, free LOCAL
last), with **no user wallet hold**. Nothing is stored and no event is published.

```json
{
  "contentBase64": "UklGR...",
  "mimeType": "audio/wav",
  "languageHint": "en",
  "requestId": "live:<runId>:<chunkIndex>"
}
```

Limits: decoded audio up to 2 MiB, measured length up to 30 s; `languageHint` is optional.
Response 200:

```json
{
  "text": "hello world",
  "language": null,
  "provider": "GEMINI",
  "model": "gemini-2.5-flash",
  "durationSeconds": 6,
  "costMicroUsd": 320,
  "costKnown": true,
  "noSpeech": false
}
```

- No speech: 200 with `noSpeech: true` and `text: ""`. The empty answer is not retried and is not passed to another paid provider.
- `costMicroUsd` is an estimate priced from routing-service's rate card, the way the PAYG meter would have priced it: per second for OpenAI, tokens for Gemini, and 0 for LOCAL. `costKnown: false` (cost 0) means the rate card could not be read.
- Errors (`code`): 400 `TRANSCRIBE_CHUNK_EMPTY_AUDIO` (or a Zod 400 for a non-`audio/*` type), 413 `TRANSCRIBE_CHUNK_TOO_LARGE`, 422 `TRANSCRIBE_CHUNK_TOO_LONG`, 502 `TRANSCRIBE_CHUNK_FAILED` (every candidate failed), 503 `TRANSCRIBE_CHUNK_UNAVAILABLE` (no candidate, or the capability lookup failed).
