# Claw File Service - Development Rules

## Service Overview

This is the File microservice for the Claw platform. It owns file upload, storage, and chunking.

## Ownership

- **Files**: Upload, list, get, delete operations for user files
- **File Chunks**: Chunked file content for processing and retrieval

## Tech Details

- **Port**: 4006
- **Database**: PostgreSQL (`claw_files`)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Tables Owned

- `files`
- `file_chunks`

## All Standard Backend Rules Apply

See the root CLAUDE.md for the full set of architecture rules, naming conventions, and code quality requirements. Key points:

- NEVER use `any` — use `unknown`, generics, or proper types
- NEVER disable ESLint rules
- NEVER use `console.log` — use NestJS Logger
- NEVER use `process.env` directly — use AppConfig (Zod-validated)
- Controllers are 3-line methods: extract params, call ONE service, return
- Service methods max 30 lines
- Repositories are pure data access only
- All Zod schemas must have `.max()` on every string and array field
- All errors use `BusinessException` with a `messageKey`
- Every function must have an explicit return type

## Commands

```bash
npm run dev              # Start with hot reload
npm run build            # Production build
npm run typecheck        # Type check
npm run lint             # ESLint
npm run test             # Unit tests
npm run migrate          # Run migrations (production)
npm run migrate:dev      # Create + run migration (dev)
npm run prisma:generate  # Regenerate Prisma client
```
