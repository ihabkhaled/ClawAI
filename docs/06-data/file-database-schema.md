# File Database Schema (claw_files)

PostgreSQL database for the file service (port 5446). Stores file metadata and text chunks.

---

## Connection

```
Database: claw_files
Port: 5446 (host) / 5432 (container)
URL: postgresql://claw:claw_secret@pg-files:5432/claw_files?schema=public
Prisma schema: apps/claw-file-service/prisma/schema.prisma
```

---

## Tables

### files

Stores uploaded file metadata and optionally the full content.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | File identifier |
| user_id | String | NO | - | - | Owning user ID |
| filename | String | NO | - | - | Original filename |
| mime_type | String | NO | - | - | MIME type (e.g., text/plain) |
| size_bytes | Int | NO | - | - | File size in bytes |
| storage_path | String | NO | - | - | Path on disk (FILE_STORAGE_PATH) |
| content | String | YES | - | - | Full text content (for text files) |
| ingestion_status | FileIngestionStatus | NO | `COMPLETED` | - | Processing status |
| created_at | DateTime | NO | `now()` | - | Upload timestamp |
| updated_at | DateTime | NO | auto | - | Last update timestamp |

**Indexes**:
- `user_id` — files by user
- `ingestion_status` — find pending/failed files

**Relations**:
- `chunks` — one-to-many with FileChunk (cascade delete)

### file_chunks

Stores chunked text content for large files. Used for context assembly.

| Column | Type | Nullable | Default | Constraints | Description |
|--------|------|----------|---------|-------------|-------------|
| id | String (CUID) | NO | `cuid()` | PK | Chunk identifier |
| file_id | String | NO | - | FK -> files.id | Parent file |
| chunk_index | Int | NO | - | - | Chunk sequence number (0-based) |
| content | String | NO | - | - | Chunk text content |
| created_at | DateTime | NO | `now()` | - | Creation timestamp |

**Indexes**:
- `file_id` — chunks for a file
- `chunk_index` — ordered retrieval

---

## Enums

### FileIngestionStatus
```
PENDING    — File uploaded, not yet processed
PROCESSING — Chunking/parsing in progress
COMPLETED  — Processing done, chunks available
FAILED     — Processing failed
```

---

## Supported File Types

The file service supports chunking for:
- **JSON** — parsed and chunked by structure
- **CSV** — chunked by rows
- **Markdown** — chunked by headers/sections
- **Plain text** — chunked by line count

---

## File Storage

Physical files are stored on disk at `FILE_STORAGE_PATH` (default: `/data/files`).
The `storage_path` column stores the relative path within that directory.
The `content` column stores the full text content for text-based files (for quick access without disk I/O).

---

## Cascade Delete

```
File (delete)
  -> FileChunk (cascade)
```

Deleting a file removes all its chunks. The physical file on disk is also deleted by the service.

---

## Internal API

The file service exposes internal endpoints for other services:

- `GET /internal/files/:id/chunks` — used by chat-service for context assembly
- `GET /internal/files/:id/content` — used by chat-service for file content
- `GET /internal/files/download/:id` — used by image/file-gen services
- `POST /internal/files/store-image` — used by image-service to store generated images
