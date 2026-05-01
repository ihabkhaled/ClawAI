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

## Docker Container Rebuild Procedure

When rebuilding this service (especially after shared package changes):

```bash
./scripts/claw.sh stop file-generation-service
./scripts/claw.sh rm -f file-generation-service
docker rmi claw-file-generation-service
./scripts/claw.sh up -d --build file-generation-service
```

**NEVER skip steps.** See root CLAUDE.md for full explanation.

## Workflow Phase Requirements

All work on this service MUST follow the phases defined in the root `CLAUDE.md`:

- **Phase 0** (Planning Gate): Document impacted areas, risks, acceptance criteria before coding
- **Phase 0g** (Business Framing): Define user problem, success metrics, UAT seed for user-facing changes
- **Phase 1-3** (Implementation): Follow backend architecture rules above
- **Phase 4** (SSE rules if applicable): Apply SSE-specific patterns from root CLAUDE.md
- **Phase 5** (Error handling): All async errors stored + SSE emitted
- **Phase 8** (Validation): typecheck + lint + test + build before any commit
- **Phase 9** (API testing): Verify all new endpoints with curl/Postman before claiming done
- **Phase 12** (QE Gates): All phases from docs/16-quality-engineering/ must pass

## Pre-Implementation Checklist (this service)

Before writing code for this service:

- [ ] Read root CLAUDE.md
- [ ] Read this service CLAUDE.md
- [ ] Read existing service code for the area being changed
- [ ] Read current Prisma schema (if DB changes)
- [ ] Identify all RabbitMQ events published/consumed by this service
- [ ] Check if shared packages need updating

## Post-Implementation Checklist (this service)

After implementing any change to this service:

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run lint` → 0 errors
- [ ] `npm run test` → all pass
- [ ] `npm run build` → success
- [ ] All new Zod DTOs have: max() on strings, max() on arrays, required fields explicit
- [ ] All new service methods are ≤ 30 lines
- [ ] All new manager methods are ≤ 80 lines
- [ ] All new controllers are 3-line methods
- [ ] No try/catch in controllers
- [ ] No Prisma calls outside repositories
- [ ] All new events published using RabbitMQService
- [ ] All new messageKeys added to error catalog
- [ ] All background tasks use fire-and-forget with `void`
- [ ] All fire-and-forget error paths: `emitError` → `storeErrorMessage` in nested try-catch
- [ ] All poll-detected flows store metadata `{ error: true }` on failure

## Required Output Format

After completing any implementation task on this service, produce:

1. **Files changed** (list with purpose of each change)
2. **Tests added/updated** (list with what each test covers)
3. **API changes** (new endpoints, changed contracts)
4. **Infrastructure changes** (env vars, Docker, Nginx, CI)
5. **Known gaps or follow-up items**
6. **Evidence**: typecheck output, lint output, test output
