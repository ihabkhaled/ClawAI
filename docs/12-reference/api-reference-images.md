# API Reference — Image Service

Base URL: `http://localhost:4000/api/v1` (via nginx) or `http://localhost:4012/api/v1` (direct)

---

## GET /images

List the current user's image generations.

**Auth**: Bearer token
**Query Parameters**:
- `page` (int, default: 1)
- `limit` (int, default: 20, max: 100)
- `status` (enum) — QUEUED, STARTING, GENERATING, FINALIZING, COMPLETED, FAILED, TIMED_OUT, CANCELLED

**Response 200**:
```json
{
  "data": [
    {
      "id": "climg...",
      "userId": "cluser...",
      "threadId": "clthread...",
      "prompt": "A sunset over mountains",
      "revisedPrompt": "A beautiful sunset...",
      "provider": "openai",
      "model": "dall-e-3",
      "width": 1024,
      "height": 1024,
      "quality": "standard",
      "style": "vivid",
      "status": "COMPLETED",
      "latencyMs": 15000,
      "assets": [
        {
          "id": "classet...",
          "url": "/api/v1/files/download/clfile...",
          "downloadUrl": "/api/v1/files/download/clfile...",
          "mimeType": "image/png",
          "width": 1024,
          "height": 1024,
          "sizeBytes": 2500000
        }
      ],
      "createdAt": "2026-04-11T10:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

**curl**:
```bash
curl http://localhost:4000/api/v1/images \
  -H "Authorization: Bearer $TOKEN"
```

---

## GET /images/:id

Get a specific image generation with assets.

**Auth**: Bearer token (must own generation)
**Response 200**: ImageGeneration with assets and events
**Errors**: `404 ENTITY_NOT_FOUND`, `403 FORBIDDEN`

---

## POST /images/:id/retry

Retry a failed image generation with the same provider/model.

**Auth**: Bearer token (must own generation)
**Response 200**:
```json
{
  "generationId": "climg...",
  "status": "QUEUED"
}
```

---

## POST /images/:id/retry-alternate

Retry with a different provider or model.

**Auth**: Bearer token (must own generation)
**Request Body** (optional):
```json
{
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

**Response 200**:
```json
{
  "generationId": "climg_new...",
  "status": "QUEUED",
  "provider": "gemini",
  "model": "gemini-2.0-flash"
}
```

---

## GET /images/:id/events (SSE)

Stream real-time generation events.

**Auth**: Public (generation ID required)
**Response**: SSE event stream
```
data: {"status":"STARTING","generationId":"climg..."}
data: {"status":"GENERATING","generationId":"climg...","progress":50}
data: {"status":"FINALIZING","generationId":"climg..."}
data: {"status":"COMPLETED","generationId":"climg...","assets":[...]}
```

Error event:
```
data: {"status":"FAILED","generationId":"climg...","error":"Provider returned 429"}
```

---

## Internal Endpoints (Not Exposed via Nginx)

### POST /internal/images/generate

Enqueue a new image generation. Used by chat-service when it detects an image generation request.

**Auth**: Public (internal)
**Request Body**:
```json
{
  "userId": "cluser...",
  "threadId": "clthread...",
  "userMessageId": "clmsg...",
  "assistantMessageId": "clmsg_asst...",
  "prompt": "A sunset over mountains",
  "provider": "openai",
  "model": "dall-e-3",
  "width": 1024,
  "height": 1024,
  "quality": "standard",
  "style": "vivid"
}
```

**Response 201**:
```json
{
  "generationId": "climg...",
  "status": "QUEUED",
  "provider": "openai",
  "model": "dall-e-3"
}
```

### GET /internal/images/:generationId
Get generation status. Used by chat-service for polling.

### POST /internal/images/:generationId/retry
Retry generation.

### POST /internal/images/:generationId/retry-alternate
Retry with alternate model.

### GET /internal/images/:generationId/events (SSE)
Stream events.

---

## Generation Status Flow

```
QUEUED -> STARTING -> GENERATING -> FINALIZING -> COMPLETED
                                               -> FAILED
                                               -> TIMED_OUT
       -> CANCELLED
```

## Supported Providers

| Provider | Models | Notes |
|----------|--------|-------|
| OpenAI | dall-e-3, dall-e-2 | Cloud, requires OPENAI connector |
| Gemini | gemini-2.0-flash (imagen) | Cloud, requires GEMINI connector |
| ComfyUI | FLUX.2, FLUX.1, SD 3.5, SDXL-Lightning | Local, requires ComfyUI runtime |
| Stable Diffusion | SD models | Local, requires SD WebUI |
