# Claw Ollama Service - Development Rules

## Service Overview

This is the Ollama microservice for the Claw platform. It proxies requests to the local Ollama runtime. No database — Redis cache only.

## Ownership

- **Ollama Proxy**: List models, generate completions, pull models, check status

## Tech Details

- **Port**: 4008
- **Database**: NONE (Redis cache only)
- **Cache**: Redis (shared)
- **Message Broker**: RabbitMQ (shared)
- **Upstream**: Ollama API at OLLAMA_BASE_URL

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
```
