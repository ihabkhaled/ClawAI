# Claw Memory Service - Development Rules

## Service Overview

This is the Memory microservice for the Claw platform. It owns memory records and context packs.

## Ownership

- **Memory Records**: CRUD operations for user memories (summaries, facts, preferences, instructions)
- **Context Packs**: CRUD operations for context packs and their items

## Tech Details

- **Port**: 4005
- **Database**: PostgreSQL (`claw_memory`) with pgvector extension
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)

## Tables Owned

- `memory_records`
- `context_packs`
- `context_pack_items`

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
