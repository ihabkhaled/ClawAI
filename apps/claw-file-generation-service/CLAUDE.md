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

## Absolute Rules

1. **NEVER use `any`** -- use `unknown`, generics, or proper types.
2. **NEVER disable ESLint rules**.
3. **NEVER use `console.log`** -- use the NestJS `Logger` service.
4. **NEVER use `!` non-null assertion**.
5. **NEVER use `process.env` directly** -- use `AppConfig`.
6. **NEVER put business logic in controllers**.
7. **NEVER put Prisma calls outside repositories**.
8. **EVERY function must have an explicit return type**.
9. **Service methods max 30 lines**.
10. **Controllers are 3-line methods**.
11. **All errors use BusinessException with a code**.
12. **No default exports**.

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
