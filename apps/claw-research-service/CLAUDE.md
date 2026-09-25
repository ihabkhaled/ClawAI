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
- `FetchJob`, `PageCache` — `FetchService`'s job ledger (incl. `servedBy`,
  `archivedAt`) and 15-minute page cache.
- `FetchStrategyConfig`, `HostStrategyMemory` — the fetch escalation chain
  (ADR-121): per-tier enable/tier/timeout/base URL, and per-host "what last
  worked" memory.

## Fetch invariants (ADR-121 — every fetch, every tier)

- `FetchService.fetchPage` is the only fetch path: domain policy → robots.txt
  (RFC 9309, a Disallow is a 403 before anything is fetched or billed) → cache
  → `FetchStrategyOrchestratorService`.
- Tiers: official API → plain → impit (TLS impersonation) → Patchright →
  Crawl4AI/FlareSolverr/Firecrawl sidecars (compose profiles via
  `CLAW_SCRAPER_PROFILES`, DB-disabled by default) → Jina Reader → Wayback.
- Crawl4AI needs `CRAWL4AI_API_TOKEN` (AppConfig) — the same secret the
  `crawl4ai` container gets. It is sent as `Authorization: Bearer`, never
  logged; missing → `supports()` false, the tier is skipped with one warning.
- 401/451 stop the chain; captcha/429/404/robots-unreachable → archive only;
  FlareSolverr only after a JS interstitial. ≤ 6 attempts, ≤ 60 s.
- Any HTTP an adapter does itself goes through `followRedirectsSafely` (each
  hop SSRF-checked before it is sent). HTML ends in `extractPageContent`.
- Third parties (reader, archive) get public, token-free URLs only.
- Log lines: `fetch.attempt`, `fetch.served`, `fetch.failed`, `fetch.refused`.
- How to add/enable/prove a tier: `skills/add-a-fetch-strategy.md`.
- _(future)_ `EvidenceBundle`, `ScrapeProfile`, `CloneJob`.

## Key Environment Variables

- `RESEARCH_DATABASE_URL`, `RESEARCH_PORT` (default 4016)
- `REDIS_URL`, `RABBITMQ_URL`
- `JWT_SECRET`, `ENCRYPTION_KEY` (shared 64-char hex)

No per-provider env keys — secrets are stored encrypted in `search_providers.encryptedSecret`.

## Docker Rebuild

```bash
./scripts/claw.sh stop research-service
./scripts/claw.sh rm -f research-service
docker rmi claw-research-service
./scripts/claw.sh up -d --build research-service
```

## API (Phase 1)

| Method | Path                                         | Notes                                         |
| ------ | -------------------------------------------- | --------------------------------------------- |
| GET    | `/api/v1/research/search-providers`          | List configured providers                     |
| POST   | `/api/v1/research/search-providers`          | Admin-only. Encrypts secret                   |
| GET    | `/api/v1/research/search-providers/:id`      |                                               |
| PATCH  | `/api/v1/research/search-providers/:id`      | Admin-only                                    |
| DELETE | `/api/v1/research/search-providers/:id`      | Admin-only                                    |
| POST   | `/api/v1/research/search-providers/:id/test` | Admin-only. Updates status                    |
| POST   | `/api/v1/research/search`                    | Execute a search run                          |
| GET    | `/api/v1/research/search/runs`               | Current user's runs                           |
| GET    | `/api/v1/research/search/runs/:id`           | Single run                                    |
| GET    | `/api/v1/research/fetch-strategies`          | Admin-only. Escalation-layer status (ADR-121) |
| PATCH  | `/api/v1/research/fetch-strategies/:kind`    | Admin-only. Enable/tune a strategy            |

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

## Sidecar health in /health (ADR-121 addendum, 2026-09-25)

- `/api/v1/health` = `ResearchHealthService` → `SidecarHealthService.report()`:
  `services.crawl4ai|flaresolverr|firecrawl` = `up`/`down`/`disabled`, read from
  `fetch_strategy_configs` (disabled rows are never probed). Probe routes and
  timeout live in `SIDECAR_HEALTH_PROBES` / `SIDECAR_HEALTH_TIMEOUT_MS` (2 s);
  15 s cache. health-service reads these exact keys and values (contract specs
  on both sides) — renaming one breaks its status-page row.
- A down sidecar makes `status: 'degraded'`, never an error: keep HTTP 200.
- A new sidecar strategy: add it to `SIDECAR_HEALTH_PROBES` here AND to
  health-service `DEPENDENCY_PROBES` + `COMPONENT_MEMBERS` + the frontend
  `StatusComponent` + 13 locales.
