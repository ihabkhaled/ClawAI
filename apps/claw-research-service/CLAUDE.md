# Claw Research Service — Development Rules

## Service Overview

Dynamic search, fetch, scrape, repo-clone, and evidence orchestration service. Owns the DB-backed SearchProvider registry so every provider can be managed via admin UI instead of `.env`. Runs on port **4016** with its own PostgreSQL database (`claw_research`).

## Tech Stack

- NestJS 10 + TypeScript (strict)
- PostgreSQL + Prisma
- Redis (cache and rate-limit state)
- RabbitMQ (event publishing)
- Zod (DTO validation)
- AES-256-GCM for secret-at-rest (shared encryption key)
- JWT via `@claw/shared-auth`

## Architecture

```
Controller → Service → Repository (data access)
                     → Manager (orchestration, multi-step flows)
                     → Adapter (provider-specific HTTP)
```

## Owned Tables

- `SearchProvider` — DB-backed provider definition (Tavily, SearXNG, Ollama Web, …).
- `SearchRun` — one search execution with its normalized results.
- _(future)_ `FetchJob`, `PageCache`, `EvidenceBundle`, `ScrapeProfile`, `CloneJob`.

## Key Environment Variables

- `RESEARCH_DATABASE_URL`, `RESEARCH_PORT` (default 4016)
- `REDIS_URL`, `RABBITMQ_URL`
- `JWT_SECRET`, `ENCRYPTION_KEY` (shared 64-char hex)

No per-provider env keys — secrets are stored encrypted in `search_providers.encryptedSecret`.

## Docker Rebuild

```bash
docker compose -f docker-compose.dev.yml stop research-service
docker compose -f docker-compose.dev.yml rm -f research-service
docker rmi claw-research-service
docker compose -f docker-compose.dev.yml up -d --build research-service
```

## API (Phase 1)

| Method | Path                                         | Notes                       |
| ------ | -------------------------------------------- | --------------------------- |
| GET    | `/api/v1/research/search-providers`          | List configured providers   |
| POST   | `/api/v1/research/search-providers`          | Admin-only. Encrypts secret |
| GET    | `/api/v1/research/search-providers/:id`      |                             |
| PATCH  | `/api/v1/research/search-providers/:id`      | Admin-only                  |
| DELETE | `/api/v1/research/search-providers/:id`      | Admin-only                  |
| POST   | `/api/v1/research/search-providers/:id/test` | Admin-only. Updates status  |
| POST   | `/api/v1/research/search`                    | Execute a search run        |
| GET    | `/api/v1/research/search/runs`               | Current user's runs         |
| GET    | `/api/v1/research/search/runs/:id`           | Single run                  |

Future phases add: `/research/fetch`, `/research/evidence`, `/research/workflows`, `/research/runs` (research run, not just search).

## Rules That Apply (per root CLAUDE.md)

- No `any`, no `!`, no `eslint-disable`, no `console.log`.
- All DTOs validated with Zod.
- Controllers: 3-line methods, no try/catch, no throw.
- Services: ≤ 30 lines per method, extract helpers.
- Managers: ≤ 80 lines per method, complexity ≤ 15.
- Repositories: pure data access, no throw.
- No inline types/enums/constants in logic files.
- Every third-party library wrapped in `src/common/utilities/<name>.utility.ts`.
- Secrets never echoed in API responses (`SanitizedSearchProvider` strips `encryptedSecret`).
