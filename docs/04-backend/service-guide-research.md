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

## A URL in the intent is opened, not searched for

`ResearchManager.run` calls `detectUrlsInText(dto.intent)` **before** the search
step, and fetches what it finds directly.

This closes the platform's largest capability gap. Until 2026-09-10 there was no
code path anywhere that took a URL out of a prompt and fetched it. The fetcher,
its SSRF guard, its domain policy and its cache were all real and all wired
exclusively downstream of a keyword search, so `summarize
https://example.com/post` reached the search engine as a query that happened to
contain a URL. Measured that day, the prompt returned an Adobe product page, a
Facebook group post and a Medium tutorial — and never opened the link.

The pipeline is now:

1. `fetch.direct` — the URLs the user wrote, at most `DIRECT_FETCH_MAX_URLS`
   (3), through `FetchService`. Recorded as `web_fetch` **and**
   `web_fetch:user_url`.
2. `search` — unchanged. A prompt is rarely only a link, and the surrounding
   question usually still needs search.
3. `fetch` — the top search hits, **minus any URL already fetched in step 1**,
   so no page is opened twice in one run.
4. `extract` — over the union of both fetch sets.

Three properties are load-bearing:

- **A pasted page takes `DIRECT_FETCH_CONFIDENCE` (1).** The bundle sorts by
  confidence and then caps at `EVIDENCE_MAX_ITEMS`, so a pasted link scoring
  like an ordinary search hit could be trimmed out of the very bundle it was the
  point of.
- **`SEARCH_ONLY` fetches nothing and says so.** That workflow was chosen and
  priced as a run that does not open pages. A pasted link there produces a
  warning naming the URL and a `fetch.direct` trace entry marked `skipped`.
  Quietly fetching would change what the user paid for.
- **`FetchService` gained a caller, not a rival.** The SSRF guard, the domain
  policy and the cache are untouched. A page the policy refuses becomes a
  warning, never an exception to the policy.

Detection is deliberately conservative, because anything it returns will be
fetched: absolute `http`/`https` only, parsed by the platform's own `URL`;
`javascript:`, `data:`, `file:` and `vbscript:` rejected explicitly rather than
by accident; trailing sentence punctuation trimmed, because
`https://example.com/post.` and `(https://example.com/a)` are what people type.
A bare domain is left to search — it is a search term, not a link.

Decision and costs:
[ADR-091](../13-adr/adr-091-user-urls-are-opened-not-searched.md).
Constraint: [rules/41](../../rules/41-web-evidence-truthfulness.md).

## An intent is not a query

`ExecuteResearchDto.intent` is capped at `RESEARCH_MAX_INTENT_LENGTH` (8,000).
The **search query** derived from it is clamped separately to
`SEARCH_MAX_QUERY_LENGTH` (500) by `clampSearchQuery`, on a word boundary, and a
warning records that it happened.

Both were the same constant until 2026-09-11, and the consequence was worse than
it sounds: a prompt over 500 characters 400'd the entire run, chat-service
swallowed that to `null`, no transcript and no warning were produced — and
because the model is only told browsing happened when evidence or warnings
exist, it was then told nothing at all and refused. **Research was silently
disabled by writing a long message.**

The order matters. URLs are detected from the FULL intent, before the clamp, so
a link near the end of a long prompt is still opened.

## The provider the user picks is the provider that runs

`providerId` travels: DTO → `ParallelResearchOptions` / `ResearchEnrichInput` →
`POST /research/search`. research-service reads the field's **presence** as an
explicit choice, so it is omitted rather than sent as `undefined` when the user
chose nothing — sending the key with no value would look like a choice.

It was dropped in two independent places until 2026-09-11: the compare call site
never read `dto.researchProviderId`, and `enrichForOrchestration` received it and
did not pass it on. Meanwhile both transcripts recorded the requested provider,
so the UI reported a provider that had never executed.

Transcripts now record what **answered** — `providerId` and `providerName` come
back from the search response — falling back to the request only when the run
reported none. A fallback becomes a warning: it is not a failure, but it is a
different answer than the one asked for.

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
