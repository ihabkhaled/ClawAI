# Claw File Generation Service - Development Rules

## Service Overview

File generation microservice for the Claw platform. Converts LLM-generated text content into downloadable files (PDF, DOCX, CSV, HTML, Markdown, JSON, TXT). Runs on port 4013 with its own PostgreSQL database (claw_file_generations).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode enabled)
- **Database**: PostgreSQL with Prisma ORM (claw_file_generations database, port 5449)
- **Cache**: Redis (ioredis)
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod (NOT class-validator, NOT class-transformer)
- **Auth**: JWT (jsonwebtoken) for token verification
- **Logging**: nestjs-pino / pino structured logging
- **Format Libraries**: pdfkit (PDF), docx (DOCX), csv-stringify (CSV), markdown-it (HTML)

## Baseline rules

Baseline rules for every backend service (commands, absolute rules, declarations, library wrapping, Docker rebuild, workflow phases, checklists, output format): [docs/04-backend/backend-service-baseline.md](../../docs/04-backend/backend-service-baseline.md). This file adds only what is specific to `claw-file-generation-service`.

## Architecture

```
Controller -> Service -> Repository
                      -> FileExecutionManager -> Format Adapters (PDF, DOCX, CSV, HTML, MD, TXT, JSON)
```

## Owned Tables

- FileGeneration
- FileGenerationAsset
- FileGenerationEvent

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
npm run prisma:generate  # Regenerate Prisma client
```

## Downloads and expiry (ADR-104)

- Users download only through `GET /file-generations/:id/assets/:assetId/download`
  (owner guard, streamed). Never return `storageKey` to a user; use
  `toGenerationView`.
- Assets expire after `FILE_ASSET_TTL_MS` (1 h). The 5-minute sweep deletes
  the bytes and keeps the row and text. `POST :id/rebuild` rebuilds them.
- **Schema changes need a migration.** This service ran without migrations
  until 2026-09-19, and production had no tables at all.

## Answer export and request bounds (ADR-105)

- `POST /file-generations/export` turns an answer the user already has into
  HTML, DOCX or PDF. It records `provider: 'EXPORT'` and calls no model.
- **The JSON body limit is `JSON_BODY_LIMIT_BYTES` (8 MB), not Express's
  100 kB.** Raising a DTO `.max()` means checking `http.constants.spec.ts`
  still passes (rules/11 §8). Under the old default, every file over about
  100k characters failed as a 500.
- The internal `generate` prompt must accept chat's whole message (100k). A
  `format` is `z.nativeEnum(FileFormat)` everywhere.

## Rendering (ADR-107)

- Every format is rendered from `parseMarkdownDocument`. Never add a converter
  that reads Markdown syntax itself.
- **PDF is Typst.** Answer text reaches the Typst source ONLY through
  `typstString` (a string literal). A new block or mark that writes text any
  other way is an injection hole; `document-render.spec.ts` compiles hostile
  input for real.
- New scripts need a font in the image (`fonts-noto-*` in both Dockerfiles).
- **CSV cells always pass `csvSafeCell`** (formula injection), and XLSX cells are
  inline strings, never formulas. Zip paths from the model always pass
  `safeBundlePath` (zip-slip). ADR-108.
- `parseMarkdownDocument` first runs `repairPipeTables`: a pipe table a model
  wrote without its `|---|` row gets one, or markdown-it reads it as a
  paragraph and the CSV is one column (ADR-119).

## Access (ADR-103)

- Every user route is owner-scoped:
  - `retryGenerationForUser` for retry;
  - `FileGenerationOwnerGuard` on `:id/events`, which refuses before a stream
    opens.
- `internal/file-generations/*` needs the service token (`ServiceTokenGuard`).
- Never make a route `@Public()` here.
