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
- `ResearchRun` (now with `threadId`), `ResearchSource` — research runs and the
  evidence store (research engine B1, see below).
- `ResearchPlatform` — the platform registry (research engine B3, see below).

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
- **Provenance leaves the service (ADR-121 addendum 2).** `FetchResult.servedBy` + `attempts`
  (`FetchAttemptSummary`: kind + outcome ONLY — never a URL, status, body or error text) are
  copied onto `EvidenceItem.fetch` by `fetchProvenanceOf` (evidence-builder utility) in the
  three evidence converters (direct fetch, search fetch, site crawl). A cache hit has no
  `servedBy`, so its item has no `fetch`: not measured, not claimed. chat-service narrates it.
- **Render hint (ADR-121 addendum 3).** `render: 'js'|'stealth'` (`FetchRenderHint`) on the
  research DTO / `FetchRequestDto` reaches `EscalationOptions.renderHint`;
  `orderChainForHint` only reorders the enabled chain, AFTER `PINNED_FIRST_KINDS`
  (`OFFICIAL_API`, `HTTP_PLAIN`): an evasion-class tier never runs before plain. Never use it
  to enable a tier or skip a gate.
- **Tool fetch (ADR-121 addendum 4).** `POST /internal/research/fetch` (`FetchInternalController`,
  `ServiceTokenGuard`, `{userId, url, render?}`) -> `FetchService.fetchPageForTool`: same chain,
  returns `ToolFetchView` (no raw HTML). Caller is chat-service's `web_fetch` tool.
- **Thin content is not read (2026-11-22).** `isThinContent` (`thin-content.utility.ts`) marks a
  2xx/3xx HTML result `EMPTY_JS_SHELL` when its final text is a script shell, a social-card
  link-preview stub (what chatgpt.com serves a bot), a "enable JavaScript" wall, or tiny text on
  150 KB+ of scripts; the chain escalates to a rendering tier. All-thin → `markThinResult`
  (`[Page content not readable]` notice, `thinContent: true`, evidence `fetch.thin`). Never
  present a thin page as read.
- **Site adapters + embedded state.** `extractPageContent` tries `SITE_ADAPTERS` (one table,
  `constants/site-adapters.constants.ts`) and, for thin visible text, `extractEmbeddedStateText`
  (JSON-LD, `__NEXT_DATA__`, `__NUXT_DATA__`, JSON scripts, `window.__*STATE__` JSON, React Router
  stream). They parse the HTML already fetched only: no request, no eval, no credentials. Add a
  site by adding a row; keep it public-data only. `FetchResult.extraction`/`siteAdapter` record it.
- How to add/enable/prove a tier: `skills/add-a-fetch-strategy.md`.
- _(future)_ `EvidenceBundle`, `ScrapeProfile`, `CloneJob`.

## Search invariants (ADR-210)

- `POST /research/search` without `providerId` runs EVERY enabled + ACTIVE provider in parallel and returns only after all settled (success, failure or `min(timeoutMs, 20 s)`). No quorum, no early return, no hard-coded provider count.
- Never re-call providers after a total failure: one call per provider per search, then `SEARCH_FAILED`. A `SearchRun` always ends `COMPLETED` or `FAILED`.
- Response fields `mode` and `providers[]` and result `providers` are additive; do not rename the older fields (chat-service and threads-service read them).
- Merged scores are rank-based per provider. Explicit `providerId` keeps the provider's own scores and skips the merge and the breaker.
- Breaker decisions are per process, in memory (`SearchProviderHealthService`); an OPEN breaker is mirrored to Redis (`research:breaker:<id>`, TTL = cool-down) and read once per provider after a restart (B1). Adapter code inside a provider must also be parallel (Ollama DuckDuckGo + Bing).
- Each adapter network call records one `WEB_SEARCH` unit, so N units per search. That policy is the owner's; do not change counting silently.

## Parallel fetch batches (ADR-211, 2026-10-31)

- Page work in a research run is batched, never one page at a time: search hits (top 8, max 2 per host) and pasted URLs (max 6) go through `runFetchBatch` (`modules/research/utilities/fetch-batch.utility.ts`): 6 hosts at once, a host's URLs serial, one 30 s cap per phase, unfinished = `TIMEOUT`. Caps are constants (`EVIDENCE_FETCH_*`, `CRAWL_GLOBAL_WORKER_CAP`, `CRAWL_SITE_CONCURRENCY`), not env.
- New fetch loops use `runFetchBatch`, not a bare `for`/`Promise.all` over a list. Cap every batch input first.
- Crawl page fetches go through `SiteCrawlManager.pageSlots` (process-wide 12). Do not add a crawl path that bypasses it.
- Response fields are additive: `items[].fetchStatus`, `bundle.fetchReport`, `bundle.fetchSummary`. Never rename or remove existing fields (chat-service and threads-service read the bundle).
- Fetched-page snippet length comes from the shared 96 000-char budget in `buildEvidenceBundle` (floor 1 500); do not add a second truncation.
- SSRF, robots and size limits are unchanged and live in `FetchService`; a batch only reports them per URL.

## Evidence store, thread memory, multi-query (research engine B1+B2, 2026-11-28)

Plan: `docs/implementation/autonomous-research-engine-plan.md` §4 B1/B2.

- **Additive fields only.** The research DTO (user + internal route) takes optional `threadId`,
  `queries` (≤ 12 × ≤ 300), `languages` (≤ 6, `/^[a-z]{2,3}$/`), `depth` (0-5), `round` (1-5),
  `excludeUrls` (≤ 60). A request with NONE of them (threads-service today) runs the old pipeline
  byte for byte: one `execute()`, no cache, no thread memory, no `stats`, no new item fields
  (`isEngineRequest`, `ResearchRunState` = identity). Any one of them switches the run to engine mode.
- **Depth budget** `RESEARCH_DEPTH_BUDGETS` (`research-engine.constants.ts`): total queries
  1/2/4/6/10/14 and pages 8/8/8/12/16/20 for depth 0-5 (depth 1 never reads fewer than today's 8). Depth absent = today (1 query, 8 pages);
  extra `queries` without a depth are ignored (trace `search.expansion skipped`).
- **Cost rule.** The PRIMARY query (`searchQuery ?? intent`) runs on every enabled + ACTIVE
  provider (ADR-210). EXPANSION queries (deduped case-insensitively vs the primary and each other,
  capped at budget − 1) run in parallel only on expansion providers: kinds `OLLAMA_WEB`, `SEARXNG`,
  or any provider with `publicConfig.expansion: true` (`false` = never). None → one warning. Every
  adapter call still records one `WEB_SEARCH` unit. `MultiQuerySearchManager` →
  `SearchExecutionService.executeCached` / `executeExpansion`. From `round` 2 on the PRIMARY also
  runs on expansion providers only (`RESEARCH_PRIMARY_EXPANSION_ONLY_FROM_ROUND`), so a paid
  provider answers once per chat turn, not once per round; none enabled → the primary is skipped
  with one warning, trace `search skipped`, `providerSelection` NONE.
- **Fusion weights (ADR-226).** The primary query's hits count double (`RESEARCH_RRF_PRIMARY_WEIGHT`), platform API
  rows 0.6: five encyclopedia rows used to outrank the page that held a lyric.
- **Fusion.** `fuseQueryResults`: reciprocal rank (`K = 60`), dedupe by `canonicalUrlKey`, score
  normalised to best = 1, `query` = first query (primary first) that found the page. Top N per
  depth, max 2 per host, through `runFetchBatch`. Bundle keeps ≤ 20 hits plus every page; a hit
  whose page is in the run is dropped, in BOTH modes since B3 (on the tie the snippet used to win
  and the page that was read and billed was thrown away; the old path did that until B3).
- **Cache rule.** Redis `research:search:v1:<sha256(normalised query|sorted provider ids|maxResults)>`,
  TTL 600 s, engine mode only, primary and expansion. An explicit provider or caller `filters`
  bypass it. A hit = no provider call, no unit, `search:cached` in `toolsUsed`. Only complete answers
  are stored (every provider OK, ≥ 1 result). Redis down/slow (bounded 250 ms: the client queues
  forever) = miss, one warn per process. `POST /research/search` never reads it.
- **`excludeUrls`**: never fetched (pasted or found), their hits dropped. **Content hash**: sha256 of
  lower-cased, whitespace-collapsed text (`contentHashOf`); a page equal to an earlier page is
  dropped and counted in `duplicatesRemoved`.
- **Evidence store.** `research_sources` (`ResearchSourceRepository`): one row per bundle item of
  every completed run (search and crawl, both modes), written fire-and-forget after the run
  (`ResearchEvidenceStoreService.persistInBackground`); a failed write is logged, never fails the
  run. Excerpt ≤ 12,000 chars, `fetchStatus` `OK` only for a page actually read (hit = null,
  thin shell = `THIN`), `discoveredVia` = `ResearchSourceDiscovery`. Retention: rows older than
  30 days deleted at boot and hourly by `ResearchSourceRetentionService` (unref'd timer, cleared on
  destroy, logs `research.sources.swept deleted=<n>`).
- **Thread memory** (`threadId` set): this user's AND thread's rows from the last 24 h (cap 50).
  (a) A SEARCH fetch target whose page was read OK in the window is served from the stored excerpt:
  no fetch, no `WEB_FETCH`, no `fetch` provenance, `reusedFromRunId` set. Pasted URLs are always
  fetched fresh. (b) At most 3 earlier sources not in the run that share ≥ 2 significant tokens
  (`\p{L}\p{N}\p{M}`, ≥ 3 chars, stopwords out) with the intent (title + query + excerpt head) are
  added at confidence 0.5. Both count in `stats.reusedFromThread`. A failed read = empty memory.
- **Wire.** `bundle.stats` (`ResearchRunStats`): `round`, `queriesRun`, `queries`, `languages`,
  `providersUsed`, `resultsFound`, `pagesRead`, `duplicatesRemoved`, `reusedFromThread`,
  `cachedSearches`. Items gain `query`, `round`, `contentHash`, `reusedFromRunId`. Engine mode
  only. Log: one `research.run: queries= cached= results= pages= dupes= reused= round= depth=
platforms= ms=` line per search run (counts only, never a URL or query text).

## Platform registry (research engine B3, 2026-11-28)

Plan: `docs/implementation/autonomous-research-engine-plan.md` §4 B3. Module `src/modules/platforms/`.

- **Table `research_platforms`** (`ResearchPlatform`): `slug` (unique, `^[a-z0-9-]{2,40}$`), `name`,
  `category` (`PlatformCategory`: NEWS, ACADEMIC, TECHNICAL, SOCIAL, VIDEO, FORUM, OFFICIAL, REFERENCE,
  COMMERCE), `accessMethod` (`SITE_SEARCH` | `OFFICIAL_API`), `apiKind` (`PlatformApiKind`, required for
  OFFICIAL_API, null for SITE_SEARCH), `domains`, `languages` (empty = any), `enabled`, `priority`
  (lower first), `maxResults` (5), `timeoutMs` (8000), `notes`. No secret in any row.
- **Seed** (`PLATFORM_SEED`, 36 rows): 9 official APIs (OpenAlex, Semantic Scholar, arXiv, PubMed, Crossref,
  Stack Overflow, GitHub, Hacker News, Wikipedia) + 27 site searches (Reddit, Quora, X, LinkedIn, Medium,
  Facebook, Instagram, YouTube, TikTok, Reuters, AP, BBC, Guardian, Al Jazeera, Bloomberg, Nature,
  ScienceDirect, MDN, dev.to, npm, PyPI, WHO, CDC, GOV.UK, europa.eu, Amazon, Product Hunt).
  `ResearchPlatformBootstrapService` creates missing slugs only (`createMany skipDuplicates`): an
  admin's edit is never overwritten. A deleted seed row comes back at the next boot; disable it instead.
- **Admin** `GET/POST /research/platforms`, `GET/PATCH/DELETE /research/platforms/:id`,
  `POST /research/platforms/:id/test` (`{query?}` → `{slug, ok, count, latencyMs, errorCode}`): admin role
  - `RESEARCH_PROVIDERS_MANAGE`. The service re-checks the merged row shape on PATCH. The test of an API
    platform records no unit (like a provider health check); the test of a site platform runs
    `site:<domain> <query>` on the expansion providers (normal units) and counts on-domain hits only.
- **Adapters** (`adapters/*.adapter.ts`, one per `PlatformApiKind`, `PlatformApiAdapterFactory`): every
  request goes through `platformApiGet`: https only, host on `PLATFORM_API_FIXED_HOSTS` (or
  `<2-3 letters>.wikipedia.org`, language validated first), shared SSRF guard, refused BEFORE the
  metering hook and before any request; redirects hop by hop (`followRedirectsSafely`, each hop
  allow-listed, DNS-pinned); one deadline per call (`timeoutMs`); body ≤ 1 MiB; `User-Agent:
ClawAI-ResearchBot/1.0`, no key, no contact email. Parsers are pure (`parse`), skip malformed fields,
  strip markup (`plainTextOf`, linear, bounded); arXiv Atom is scanned with `indexOf` only.
  `PlatformSearchService` stamps results `providerKind: PLATFORM:<slug>` + `platform` + `platformCategory`,
  never rejects (`classifyPlatformError`: refused host = `UNSAFE_URL`, else like a search failure), logs one
  `research.platform slug= ok= count= ms= code=` debug line per call (never the query).
- **Cost.** Each API network request records one `WEB_SEARCH` unit through `ResearchUsageService` (PubMed
  = 2: esearch + esummary). Site searches are expansion queries: expansion providers only.
- **Engine rule.** Only when `depth >= 2` AND the DTO's `platforms` (≤ 6 categories) is non-empty; anything
  else is B2 byte for byte (no registry read). `platforms` alone never switches a request into engine mode.
  One registry read (`findEnabled`), then `planPlatformRun`: asked categories, enabled, language-compatible,
  priority order. Official APIs ≤ 6 (none when an explicit `searchProviderId` is set: the user picked one
  source), the PRIMARY query, in parallel with the searches; Wikipedia once per requested language
  (else `en`), ≤ 3. Site searches ≤ 4, `site:<first domain> <primary>`, sharing the depth budget:
  `splitQueryBudget` gives them at most half the extra queries (rounded up) unless expansions leave more.
  Everything goes into the same RRF pool. An API hit keeps its own platform; any other item whose host
  ends with a platform domain on a label boundary is tagged (fused hits, fetched pages, pasted links).
- **Languages.** Exactly one requested language = the query language: it goes into the search filters as
  `language` (only SearXNG's adapter already reads it; no adapter changed) and into the cache key as
  `|lang=<code>` (no language = the B2 key). `stats.languages` on a platform run = Wikipedia editions that
  answered + the query language when a language-aware provider answered; otherwise the requested list.
- **Wire (additive).** Items: `platform`, `platformCategory`; `providerKind` `PLATFORM:<slug>` for API hits.
  `bundle.stats.platforms` (platform runs only) = slugs that returned ≥ 1 result (an API with hits, a site
  search with an ON-domain hit). A failed API = one warning naming it; trace `platforms`.
- **Policy.** Public APIs and public pages only, reached through their API or the search engines. No login,
  no captcha or paywall bypass; a fetched page still goes through `FetchService` (robots, SSRF, domain
  policy). Add a site platform by adding a row (admin or seed); a new API = an adapter + a
  `PlatformApiKind` value + its host on `PLATFORM_API_FIXED_HOSTS`.

## Keyword queries (ADR-225)

- GitHub and Stack Overflow match every word, so their adapters send `toKeywordQuery(query)` (first 4 keywords,
  filler and bare years dropped). A new API with the same behaviour uses it too.

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
| GET    | `/api/v1/research/platforms[/:id]`           | Admin. Platform registry (B3)                 |
| POST   | `/api/v1/research/platforms`                 | Admin. 409 on a taken slug                    |
| PATCH  | `/api/v1/research/platforms/:id`             | Admin. Merged shape re-checked                |
| DELETE | `/api/v1/research/platforms/:id`             | Admin. A seed slug returns at boot            |
| POST   | `/api/v1/research/platforms/:id/test`        | Admin. Sample query: count, latency, code     |

## Runtime crawl (ADR-150, 2026-10-02)

User-scoped crawl and single-page extract for runtime clients (the coding agent), in
`src/modules/runtime-crawl/`. Plan-gated (`ResearchAccessGuard`: `allowResearchMode`, before any pipe or row),
owner-scoped (foreign id = 404), capped by the DB singleton `runtime_crawl_configs` (no env var), metered by the
existing `FetchService` `WEB_FETCH` record. Never fetches on its own: it calls `SiteCrawlManager.crawl` and
`FetchService.fetchPage`. Owned tables: `RuntimeCrawlRun`, `RuntimeCrawlPage`, `RuntimeCrawlConfig`.

| Method    | Path                                    | Notes                             |
| --------- | --------------------------------------- | --------------------------------- |
| POST      | `/api/v1/research/crawl/runs`           | `profile` crawl or extract. 202   |
| GET       | `/api/v1/research/crawl/runs[/:id]`     | Owner only                        |
| GET       | `/api/v1/research/crawl/runs/:id/pages` | Cursor paging (`after`, `limit`)  |
| GET/PATCH | `/api/v1/research/runtime-crawl/config` | Admin-only limits and kill switch |

Do not add a second fetch path here, and do not widen `/research/runs` instead (rule 50 item 6).

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

## A failed fetch says WHY, never "Business Exception" (2026-09-30)

`BusinessException` extends `HttpException`, whose `.message` is the generic string
"Business Exception". Crawl and fetch warnings built from `error.message` told the user
"Could not crawl <url>: Business Exception" when the site had simply answered 404, and
the answering model then said only "no fetched evidence". Every warning/trace built from
a caught fetch error uses `describeFetchFailure(error)`
(`common/utilities/describe-fetch-failure.utility.ts`): `details.message`, else the error
code. The strategy attempt record carries `httpStatus`, so "No fetch strategy could serve
/x" ends with `direct=NOT_FOUND HTTP 404`. Do not read `.message` off a caught
`BusinessException` for user-visible text (rule 41: every failed web step is SAID).

- **Embedded-data scans are linear and capped** (security review 2026-11-23): script blocks and React Router stream chunks are found with `indexOf`, never a lazy regex over the raw page; input is capped at 5,000,000 chars and 500 script blocks (`embedded-content.constants.ts`).
