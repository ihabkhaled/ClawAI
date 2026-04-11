# Service Guide: claw-file-service

## Overview

| Property       | Value                          |
| -------------- | ------------------------------ |
| Port           | 4006                           |
| Database       | PostgreSQL (`claw_files`)      |
| ORM            | Prisma 5.20                    |
| Env prefix     | `FILES_`                       |
| Nginx route    | `/api/v1/files/*`              |

The file service handles file uploads, local storage, content extraction, and chunking. Files are split into chunks for inclusion in LLM prompts during context assembly.

## Database Schema

### File

| Column          | Type                  | Notes                        |
| --------------- | --------------------- | ---------------------------- |
| id              | String                | CUID primary key             |
| userId          | String                | Owner                        |
| filename        | String                | Original filename            |
| mimeType        | String                | MIME type (e.g., text/plain) |
| sizeBytes       | Int                   | File size in bytes           |
| storagePath     | String                | Local filesystem path        |
| content         | String?               | Extracted text content       |
| ingestionStatus | FileIngestionStatus   | PENDING, PROCESSING, COMPLETED, FAILED |

### FileChunk

| Column     | Type   | Notes                              |
| ---------- | ------ | ---------------------------------- |
| id         | String | CUID primary key                   |
| fileId     | String | FK to File (cascading delete)      |
| chunkIndex | Int    | Sequential chunk number            |
| content    | String | Chunk text content                 |

## Supported File Types

| Format   | MIME Type              | Chunking Strategy         |
| -------- | ---------------------- | ------------------------- |
| JSON     | application/json       | Key-value flattening      |
| CSV      | text/csv               | Row-based chunking        |
| Markdown | text/markdown          | Section-based splitting   |
| Text     | text/plain             | Fixed-size chunking       |
| PDF      | application/pdf        | Page-based extraction     |

## API Endpoints

| Method | Path                         | Auth   | Description                      |
| ------ | ---------------------------- | ------ | -------------------------------- |
| POST   | /                            | Bearer | Upload file (multipart/form-data)|
| GET    | /                            | Bearer | List user's files (paginated)    |
| GET    | /:id                         | Bearer | Get file metadata                |
| GET    | /:id/download                | Bearer | Download file content            |
| GET    | /:id/chunks                  | Bearer | Get file chunks                  |
| DELETE | /:id                         | Bearer | Delete file and chunks           |

### Internal API (service-to-service)

| Method | Path                         | Description                         |
| ------ | ---------------------------- | ----------------------------------- |
| GET    | /internal/files/:id/chunks   | Fetch chunks for context assembly   |

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

| Event         | Direction | Notes                              |
| ------------- | --------- | ---------------------------------- |
| file.uploaded | Publish   | After file saved to disk           |
| file.chunked  | Publish   | After chunks created               |

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
