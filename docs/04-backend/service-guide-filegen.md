# Service Guide: claw-file-generation-service

## Overview

| Property       | Value                                  |
| -------------- | -------------------------------------- |
| Port           | 4013                                   |
| Database       | PostgreSQL (`claw_file_generations`)   |
| ORM            | Prisma 5.22                            |
| Env prefix     | `FILE_GENERATION_`                     |
| Nginx route    | `/api/v1/file-generations`             |

The file generation service converts AI-generated content into downloadable files in 7 formats: PDF, DOCX, CSV, HTML, Markdown, plain text, and JSON. It uses a two-phase approach: first generating structured content via an LLM, then converting it to the requested format.

## Database Schema

### FileGeneration

| Column             | Type                   | Notes                          |
| ------------------ | ---------------------- | ------------------------------ |
| id                 | String                 | CUID primary key               |
| userId             | String                 | Requesting user                |
| threadId           | String?                | Associated chat thread         |
| userMessageId      | String?                | Triggering user message        |
| assistantMessageId | String?                | Response message ID            |
| prompt             | String                 | User's file generation prompt  |
| content            | String? (Text)         | Generated content before conversion |
| format             | FileFormat             | TXT, MD, PDF, DOCX, CSV, JSON, HTML |
| filename           | String?                | Output filename                |
| provider           | String                 | LLM provider used              |
| model              | String                 | LLM model used                 |
| status             | FileGenerationStatus   | QUEUED through COMPLETED/FAILED|
| latencyMs          | Int?                   | Total generation time          |

### FileGenerationAsset

| Column      | Type   | Notes                          |
| ----------- | ------ | ------------------------------ |
| generationId| String | FK to FileGeneration           |
| storageKey  | String | Local storage path             |
| url         | String | Serve URL                      |
| downloadUrl | String | Direct download URL            |
| mimeType    | String | application/pdf, etc.          |
| sizeBytes   | Int?   | File size                      |

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

The raw content is converted to the target format using dedicated adapters:

| Format | Library      | Notes                              |
| ------ | ------------ | ---------------------------------- |
| PDF    | pdfkit 0.15  | Text layout, headings, paragraphs  |
| DOCX   | docx 9.0     | Paragraphs, headings, tables       |
| CSV    | csv-stringify 6.5 | Structured data to CSV         |
| HTML   | markdown-it 14.1 | Markdown-to-HTML conversion      |
| MD     | Direct write | Content is already Markdown        |
| TXT    | Direct write | Plain text, no conversion needed   |
| JSON   | JSON.parse   | Validate and pretty-print          |

## Content Extraction

Each format adapter includes a content extraction strategy for parsing LLM output:

- **CSV adapter**: Extracts tabular data, handles headers and rows
- **JSON adapter**: Parses JSON from LLM output, strips markdown fences
- **PDF adapter**: Splits content into paragraphs, detects headings
- **DOCX adapter**: Maps markdown-style structures to Word paragraphs

## API Endpoints

| Method | Path                    | Auth   | Description                       |
| ------ | ----------------------- | ------ | --------------------------------- |
| POST   | /                       | Bearer | Create file generation request    |
| GET    | /                       | Bearer | List user's file generations      |
| GET    | /:id                    | Bearer | Get generation details + assets   |
| GET    | /:id/status             | Bearer | Poll generation status            |
| GET    | /:id/download           | Bearer | Download generated file           |
| DELETE | /:id                    | Bearer | Cancel/delete generation          |

## Events

| Event                  | Direction | Consumers |
| ---------------------- | --------- | --------- |
| file.generated         | Publish   | audit     |
| file_generation.failed | Publish   | audit     |

## Key NPM Dependencies

- `pdfkit` -- PDF generation with text layout and styling
- `docx` -- Microsoft Word DOCX generation
- `csv-stringify` -- CSV formatting from structured data
- `markdown-it` -- Markdown to HTML conversion
