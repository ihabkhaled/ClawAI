# 2026-10-31: Automatic search runs every enabled provider in parallel

- Search with no `providerId` (`mode: 'AUTO_ALL'`) calls every enabled + ACTIVE provider at once and returns only after all have settled, each bound by `min(timeoutMs, 20 s)`. Explicit `providerId` is unchanged (`mode: 'EXPLICIT'`).
- Response adds `mode` and `providers[]` (`name`, `kind`, `status` OK/FAILED/TIMEOUT/SKIPPED, `latencyMs`, `resultCount`, `errorCode`); merged results add `providers: string[]` (provenance). No existing field renamed.
- Merge scores by rank inside each provider (not by the provider's own scale), dedupes by canonical URL, keeps a small agreement bonus.
- All providers failing: run `FAILED`, `SEARCH_FAILED` thrown with `providers[]`, no second round of calls. A run can no longer stay `RUNNING`.
- 429 -> `PROVIDER_RATE_LIMITED`, 401/403 -> `PROVIDER_AUTH_FAILED`, 5xx/network -> `PROVIDER_UNAVAILABLE`, bound -> `SEARCH_TIMEOUT`.
- Per-process circuit breaker: 3 consecutive failures, skip 30 s, then one half-open probe.
- Ollama adapter: DuckDuckGo and Bing fallbacks run in parallel.
- Billing: unchanged. One `WEB_SEARCH` unit per adapter call, so N units per search; `WEB_SEARCH` has no limit on any plan, so nothing is refused or charged. See the ADR for the flags.
- Changed: `modules/search/services/search-execution.service.ts`, `utilities/merge-provider-results.utility.ts`, `adapters/ollama-web.adapter.ts`, `common/constants/search.constants.ts`. New: `search-provider-health.service.ts`, `canonical-url.utility.ts`, `classify-search-error.utility.ts`, two enums, two types files.
- Local check (dev stack, SerpAPI + Ollama Web): total wall time about equal to the slowest provider, not the sum; one provider forced to time out held the answer for its full bound; a blocked host failed in about 16 ms without slowing the other; after 3 failures it was `SKIPPED`, and a probe after 30 s closed the breaker.
- Docs: [ADR-210](../13-adr/adr-210-auto-search-runs-every-enabled-provider-in-parallel.md), [service guide](../04-backend/service-guide-research.md).
