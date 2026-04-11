# File Generation Database Schema (claw_file_generations)

PostgreSQL database for the file generation service (port 5449). Stores file generation records, assets, and events.

---

## Connection

```
Database: claw_file_generations
Port: 5449 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-file-generations:5432/claw_file_generations?schema=public
Prisma schema: apps/claw-file-generation-service/prisma/schema.prisma
```

---

## Tables

### file_generations

Tracks file generation requests and their lifecycle.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Generation identifier |
| user_id | String | NO | - | - | Requesting user ID |
| thread_id | String | YES | - | - | Chat thread (if triggered from chat) |
| user_message_id | String | YES | - | - | User message that triggered generation |
| assistant_message_id | String | YES | - | - | Assistant message containing result |
| prompt | String | NO | - | - | Generation prompt/instructions |
| content | String (TEXT) | YES | - | - | Generated text content |
| format | FileFormat enum | NO | - | - | Output file format |
| filename | String | YES | - | - | Output filename |
| provider | String | NO | - | - | LLM provider used |
| model | String | NO | - | - | LLM model used |
| status | FileGenerationStatus | NO | `QUEUED` | - | Current status |
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
- `assets` — one-to-many with FileGenerationAsset (cascade delete)
- `events` — one-to-many with FileGenerationEvent (cascade delete)

### file_generation_assets

Generated output files.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Asset identifier |
| generation_id | String | NO | - | FK -> file_generations.id | Parent generation |
| storage_key | String | NO | - | - | Storage key/path |
| url | String | NO | - | - | Public URL |
| download_url | String | NO | - | - | Direct download URL |
| mime_type | String | NO | - | - | File MIME type |
| size_bytes | Int | YES | - | - | File size |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |

**Indexes**:
- `generation_id` — assets for a generation

### file_generation_events

Status change events for SSE streaming.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Event identifier |
| generation_id | String | NO | - | FK -> file_generations.id | Parent generation |
| status | FileGenerationStatus | NO | - | - | Status at this event |
| payload_json | Json | YES | - | - | Event payload data |
| created_at | DateTime | NO | `now()` | - | Event timestamp |

**Indexes**:
- `(generation_id, created_at)` — ordered events for a generation

---

## Enums

### FileGenerationStatus
```
QUEUED              — Request received
STARTING            — Processing begun
GENERATING_CONTENT  — LLM generating text content
CONVERTING          — Converting to target format
FINALIZING          — Storing assets
COMPLETED           — Generation succeeded
FAILED              — Generation encountered an error
TIMED_OUT           — Generation exceeded time limit
CANCELLED           — Generation was cancelled
```

### FileFormat
```
TXT   — Plain text
MD    — Markdown
PDF   — Portable Document Format
DOCX  — Microsoft Word
CSV   — Comma-separated values
JSON  — JSON data
HTML  — HTML document
```

---

## Status Flow

```
QUEUED -> STARTING -> GENERATING_CONTENT -> CONVERTING -> FINALIZING -> COMPLETED
                                                                     -> FAILED
                                                                     -> TIMED_OUT
       -> CANCELLED (at any point)
```

The GENERATING_CONTENT step calls the LLM to produce text. The CONVERTING step transforms it into the target format (e.g., text to PDF via a converter library).

---

## Cascade Delete

```
FileGeneration (delete)
  -> FileGenerationAsset (cascade)
  -> FileGenerationEvent (cascade)
```
