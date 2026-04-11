# Image Database Schema (claw_images)

PostgreSQL database for the image service (port 5448). Stores image generation records, assets, and events.

---

## Connection

```
Database: claw_images
Port: 5448 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-images:5432/claw_images?schema=public
Prisma schema: apps/claw-image-service/prisma/schema.prisma
```

---

## Tables

### image_generations

Tracks image generation requests and their lifecycle.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Generation identifier |
| user_id | String | NO | - | - | Requesting user ID |
| thread_id | String | YES | - | - | Chat thread (if triggered from chat) |
| user_message_id | String | YES | - | - | User message that triggered generation |
| assistant_message_id | String | YES | - | - | Assistant message containing result |
| prompt | String | NO | - | - | Generation prompt |
| revised_prompt | String | YES | - | - | Provider-revised prompt (DALL-E) |
| provider | String | NO | - | - | Provider used (openai, gemini, comfyui, sd) |
| model | String | NO | - | - | Model used (dall-e-3, gemini-2.0-flash, etc.) |
| width | Int | NO | `1024` | - | Image width in pixels |
| height | Int | NO | `1024` | - | Image height in pixels |
| quality | String | YES | - | - | Quality setting (standard, hd) |
| style | String | YES | - | - | Style setting (vivid, natural) |
| status | ImageGenerationStatus | NO | `QUEUED` | - | Current status |
| error_code | String | YES | - | - | Error code if failed |
| error_message | String | YES | - | - | Error message if failed |
| started_at | DateTime | YES | - | - | Processing start time |
| completed_at | DateTime | YES | - | - | Completion time |
| latency_ms | Int | YES | - | - | Total processing time |
| created_at | DateTime | NO | `now()` | - | Request timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `user_id` — generations by user
- `thread_id` — generations for a thread
- `(status, created_at)` — find active/recent generations
- `assistant_message_id` — link to chat message

**Relations**:
- `assets` — one-to-many with ImageGenerationAsset (cascade delete)
- `events` — one-to-many with ImageGenerationEvent (cascade delete)

### image_generation_assets

Generated image files.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Asset identifier |
| generation_id | String | NO | - | FK -> image_generations.id | Parent generation |
| storage_key | String | NO | - | - | Storage key/path |
| url | String | NO | - | - | Public URL |
| download_url | String | NO | - | - | Direct download URL |
| mime_type | String | NO | - | - | Image MIME type |
| width | Int | YES | - | - | Image width |
| height | Int | YES | - | - | Image height |
| size_bytes | Int | YES | - | - | File size |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |

**Indexes**:
- `generation_id` — assets for a generation

### image_generation_events

Status change events for SSE streaming.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Event identifier |
| generation_id | String | NO | - | FK -> image_generations.id | Parent generation |
| status | ImageGenerationStatus | NO | - | - | Status at this event |
| payload_json | Json | YES | - | - | Event payload data |
| created_at | DateTime | NO | `now()` | - | Event timestamp |

**Indexes**:
- `(generation_id, created_at)` — ordered events for a generation

---

## Enums

### ImageGenerationStatus
```
QUEUED      — Request received, waiting to process
STARTING    — Processing has begun
GENERATING  — Image is being generated
FINALIZING  — Post-processing, storing assets
COMPLETED   — Generation succeeded, assets available
FAILED      — Generation encountered an error
TIMED_OUT   — Generation exceeded time limit
CANCELLED   — Generation was cancelled by user
```

---

## Status Flow

```
QUEUED -> STARTING -> GENERATING -> FINALIZING -> COMPLETED
                                               -> FAILED
                                               -> TIMED_OUT
       -> CANCELLED (at any point)
```

Each transition creates an `ImageGenerationEvent` record and emits an SSE event.

---

## Cascade Delete

```
ImageGeneration (delete)
  -> ImageGenerationAsset (cascade)
  -> ImageGenerationEvent (cascade)
```
