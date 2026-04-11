# API Reference — File Generation Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4013/api/v1` (direct)

---

## GET /file-generations

List the current user's file generations.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `status` (enum) — QUEUED, STARTING, GENERATING_CONTENT, CONVERTING, FINALIZING, COMPLETED, FAILED, TIMED_OUT, CANCELLED
- `format` (enum) — TXT, MD, PDF, DOCX, CSV, JSON, HTML

**Response 200**:
```json
{
  "data": [
    {
      "id": "clfgen...",
      "userId": "cluser...",
      "threadId": "clthread...",
      "prompt": "Create a CSV of top 10 programming languages",
      "content": "Language,Year,Creator\nPython,1991,...",
      "format": "CSV",
      "filename": "programming-languages.csv",
      "provider": "local-ollama",
      "model": "qwen3:7b",
      "status": "COMPLETED",
      "latencyMs": 5000,
      "assets": [
        {
          "id": "classet...",
          "url": "/api/v1/files/download/clfile...",
          "downloadUrl": "/api/v1/files/download/clfile...",
          "mimeType": "text/csv",
          "sizeBytes": 450
        }
      ],
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 3, "totalPages": 1 }
}
```

**curl**:
```bash
curl http://localhost:4000/api/v1/file-generations \
  -H "Authorization: Bearer $TOKEN"
```

---

## GET /file-generations/:id

Get a specific file generation with assets.

**Auth**: Bearer token (must own generation)
**Response 200**: FileGeneration with assets and events
**Errors**: `404 ENTITY_NOT_FOUND`, `403 FORBIDDEN`

---

## POST /file-generations/:id/retry

Retry a failed file generation.

**Auth**: Bearer token (must own generation)
**Response 200**:
```json
{
  "generationId": "clfgen...",
  "status": "QUEUED"
}
```

---

## GET /file-generations/:id/events (SSE)

Stream real-time generation events.

**Auth**: Public (generation ID required)
**Response**: SSE event stream
```
data: {"status":"STARTING","generationId":"clfgen..."}
data: {"status":"GENERATING_CONTENT","generationId":"clfgen..."}
data: {"status":"CONVERTING","generationId":"clfgen..."}
data: {"status":"FINALIZING","generationId":"clfgen..."}
data: {"status":"COMPLETED","generationId":"clfgen...","assets":[...]}
```

---

## Internal Endpoints (Not Exposed via Nginx)

### POST /internal/file-generations/generate

Enqueue a new file generation. Used by chat-service.

**Auth**: Public (internal)
**Request Body**:
```json
{
  "userId": "cluser...",
  "threadId": "clthread...",
  "userMessageId": "clmsg...",
  "assistantMessageId": "clmsg_asst...",
  "prompt": "Create a CSV of programming languages with name, year, and creator",
  "format": "CSV",
  "filename": "programming-languages.csv",
  "provider": "local-ollama",
  "model": "qwen3:7b"
}
```

**Response 201**:
```json
{
  "generationId": "clfgen...",
  "status": "QUEUED",
  "format": "CSV"
}
```

### GET /internal/file-generations/:generationId
Get generation status.

### POST /internal/file-generations/:generationId/retry
Retry generation.

### GET /internal/file-generations/:generationId/events (SSE)
Stream events.

---

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING_CONTENT -> CONVERTING -> FINALIZING -> COMPLETED
                                                                     -> FAILED
                                                                     -> TIMED_OUT
       -> CANCELLED
```

The GENERATING_CONTENT step calls the LLM to produce text content.
The CONVERTING step transforms text into the target format (e.g., Markdown to PDF).

---

## Supported Formats

| Format | MIME Type | Description |
|--------|-----------|-------------|
| TXT | text/plain | Plain text |
| MD | text/markdown | Markdown |
| PDF | application/pdf | PDF document |
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document | Word document |
| CSV | text/csv | Comma-separated values |
| JSON | application/json | JSON data |
| HTML | text/html | HTML document |
