# Service Guide: Research Service

## What It Is

`claw-research-service` (port **4016**, DB `claw_research`) owns the dynamic search/fetch/scrape/clone/evidence layer described in `.claude/clawai_full_search_orchestration_prompt_pack/`. Phase 1 lands the **dynamic search provider registry** and **search execution**; later phases layer fetch, evidence bundles, workflows, and chat/router integration on top.

## Why a new service

The existing chat-service calls models directly. Search/fetch/scrape/clone are orthogonal to that — they are stateful (runs, cache), policy-gated (SSRF, domain rules, robots), and shared across workflows. Keeping them in chat-service would hard-wire research into one path. A dedicated service lets any other service (chat, agent, workspace) consume the same research primitives through a versioned API.

## Phase 1 — what shipped

### Data model

- `SearchProvider` — kind (`TAVILY`/`OLLAMA_WEB`/`SEARXNG`/`GENERIC_HTTP`), name, baseUrl, `encryptedSecret` (AES-256-GCM), `publicConfig`, priority, allow/block domain lists, timeout, status.
- `SearchRun` — per execution: user, query, status (`RUNNING`/`COMPLETED`/`FAILED`), result count, latency, error message, normalized results payload.

Both tables plus enums are defined in `apps/claw-research-service/prisma/schema.prisma` and seeded via the initial migration in `prisma/migrations/20260420100000_init_search/`.

### Adapters

`SearchAdapter` interface: `kind`, `healthCheck(context)`, `search(request, context)`. Three implementations:

| Kind         | Adapter                  | Notes                                                                                                    |
| ------------ | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `TAVILY`     | `TavilyAdapter`          | `apiKey` credential required. POST `/search`; honours `searchDepth`, `includeDomains`, `excludeDomains`. |
| `OLLAMA_WEB` | `OllamaWebSearchAdapter` | Optional `apiKey` Bearer. POST `/api/web_search`. Scores by result index (no native score in response).  |
| `SEARXNG`    | `SearxngAdapter`         | Optional basic auth. GET `/search?format=json`. Respects `language` + `timeRange` filters.               |

Every adapter returns the same normalized `SearchResult` shape (`id`, `title`, `url`, `snippet`, `publishedAt`, `freshness`, `score`, `providerKind`) so the service layer can merge or re-rank results across providers.

### Services

- `SearchProviderService` — CRUD, secret encryption/decryption, `testConnection()` that runs the adapter's `healthCheck` and records `lastValidatedAt`/`validationError` on the provider row.
- `SearchExecutionService` — resolves provider (explicit id or first enabled by priority), creates a `SearchRun`, invokes the adapter, applies domain allow/block policy, updates the run row with results and latency.

### API

All under `/api/v1/research/…`:

- `search-providers` CRUD + `:id/test` (admin-only write).
- `search` (POST) to execute.
- `search/runs` (GET list, GET one) for the caller's history.

Secrets are never echoed: `SanitizedSearchProvider` replaces `encryptedSecret` with `hasSecret: boolean`.

### Security (Phase 1)

- Auth enforced via the shared `AuthGuard`; admin-only writes via `RolesGuard` + `@Roles(UserRole.ADMIN)`.
- SSRF/URL safety utility and pino redaction are scaffolded from the workspace-service pattern. `baseUrl` in provider creation is zod-validated as a URL; future phases will add per-request URL safety checks in the fetch layer.
- Per-provider `allowlistDomains`/`blocklistDomains` filter results before they hit the response body.

### Tests

- `search-adapter.factory.spec.ts` — provider mapping + error codes (3 tests).
- `tavily.adapter.spec.ts` — health + normalization + error paths (6 tests).
- `ollama-web.adapter.spec.ts` — health + ranked results (3 tests).
- `searxng.adapter.spec.ts` — normalization + error paths + missing baseUrl guard (3 tests).
- Shared `search-adapter-contract.ts` enforces the minimum surface of every adapter.

Total: **22/22 green** on the new service.

## Nginx + Health + Env

- Nginx: `/api/v1/research/*` → `http://research-service:4016`.
- `claw-health-service` aggregator now checks the research-service `/api/v1/health` endpoint.
- All 7 Docker compose files (all-in-one dev, all-in-one prod, dev/prod split databases, dev/prod split services) register `pg-research` (port **5452**) and `research-service` (port **4016**).
- `.env.example`, `.env`, `scripts/install.sh`, `scripts/install.ps1` seed `PG_RESEARCH_*`, `RESEARCH_PORT`, `RESEARCH_DATABASE_URL`, and `RESEARCH_SERVICE_URL`.
- `packages/shared-constants` exports `RESEARCH_SERVICE` and `RESEARCH_SERVICE_PORT`.

## What's next (phases 2-5)

Documented in `.claude/Integrations/search-orchestration__MASTER_PLAN.md`. Summary:

- **Phase 2** — `FetchAdapter`, `PageCache`, `EvidenceBundle` schema + builder.
- **Phase 3** — chat-service integration; router preserves the user-requested model while running helper tool chains first.
- **Phase 4** — frontend: `/research/providers`, `/research/runs`, `/research/runs/[id]`; tool-trace viewer in the chat bubble.
- **Phase 5** — scrape profiles, repo clone + analyze, workflow registry + presets, cross-workspace hybrid research, full QA + UAT pack.

## Known gaps in Phase 1

- No fetch layer yet — search returns URLs, not page content.
- No evidence bundle — chat-service cannot yet consume research output in prompt assembly.
- No frontend admin UI for providers; API is the only surface.
- `GENERIC_HTTP` provider kind is declared but not implemented (returns 501).
