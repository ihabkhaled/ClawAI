# ADR-210: Automatic search runs every enabled provider in parallel

**Status:** Accepted

**Date:** 2026-10-31

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 46](../../rules/46-token-quota-enforcement-and-window-integrity.md), [rule 50](../../rules/50-agentic-research-loop-and-narration.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md).

## Context

An audit on 2026-10-31 found that AUTO search fanned out only "when more than one candidate" existed, ranked providers with hard-coded score maps, merged by URL with each provider's own score scale, and on total outage ran a second sequential round that called every provider again (double calls, double metered units). `execute()` left the `SearchRun` in `RUNNING` when an unexpected error was thrown. `PROVIDER_RATE_LIMITED` was never produced. A dead provider cost every search its full timeout. The Ollama adapter ran DuckDuckGo and then Bing one after the other.

The owner's order: when search is automatic, every enabled and ACTIVE provider searches in parallel, and the caller gets results only after all of them have settled. No quorum, no early return. The model must not start answering before every provider has answered or timed out.

## Decision

- **AUTO = all.** No `providerId` means `mode: 'AUTO_ALL'`: every enabled + ACTIVE provider is called at once (`Promise.all` over a call that never rejects). The count is whatever is configured (1, 4, 7...); nothing is hard-coded.
- **Hard bound.** Each provider is raced against `min(provider.timeoutMs, SEARCH_AUTO_CEILING_MS)` (20 s). The slowest provider can delay the answer by at most that bound. A provider that hits it is `TIMEOUT`.
- **Explicit mode unchanged.** `providerId` set means `mode: 'EXPLICIT'`: one provider, its own `timeoutMs`, its own scores and order, no merge, no breaker skip.
- **Rank-aware merge.** Provider scores are not comparable, so a merged result is scored from its rank in its own provider's list: `(K+1)/(K+rank)`, K = 10 (rank 1 = 1.0, rank 10 about 0.55). Plus 0.05 per extra provider that returned the same page (agreement), sorted uncapped, reported capped at 1. Dedupe is by canonical URL (scheme, www, fragment, default port, `utm_*` and click-id parameters, trailing slash, query order). Each merged result carries `providers: string[]`, every provider that returned it.
- **Response, additive.** `mode` and `providers: [{ name, kind, status: OK|FAILED|TIMEOUT|SKIPPED, latencyMs, resultCount, errorCode|null }]`. Existing fields are not renamed. `latencyMs` is the wall time of the slowest provider. `providerId`/`providerName` still name a provider that answered; `fallbackUsed` still means the preferred provider did not contribute.
- **Failure.** Any number of providers may fail and are reported. When ALL fail: the run is marked `FAILED` and `SEARCH_FAILED` (502) is thrown with `providers[]` in its details. There is no second round. Any unexpected error also ends the run `FAILED`; a run never stays `RUNNING`.
- **Error codes.** `HTTP 429` -> `PROVIDER_RATE_LIMITED`, `401/403` -> `PROVIDER_AUTH_FAILED`, `5xx` and network errors -> `PROVIDER_UNAVAILABLE`, the bound -> `SEARCH_TIMEOUT`, else `SEARCH_FAILED`.
- **Circuit breaker, per process.** After 3 consecutive failures a provider is `SKIPPED` for 30 s; then exactly one half-open probe runs as part of a real search: success closes, failure re-opens for another 30 s. If every candidate is open, all are tried anyway. State is in memory, capped at 200 providers, and affects only the local process (each replica learns on its own). Constants: `SEARCH_BREAKER_*`.
- **Inside the Ollama adapter** DuckDuckGo and Bing RSS now run in parallel (DuckDuckGo preferred when both are relevant).
- **Observability.** One line per provider per search: `search.provider run= provider= kind= status= latencyMs= results= code=` (no URL, secret or error body), and in-memory per-provider counters (`SearchProviderHealthService.snapshotCounters`).

## Billing (decision: not changed)

Every adapter network call records one `WEB_SEARCH` unit through `ResearchUsageService` -> `recordFeatureUsage` -> auth-service `FeatureUsageConsumptionService.record`. With N providers one search records N units, plus up to 2 more when the Ollama adapter uses its fallbacks. This ADR changes nothing about that policy.

What the units do today: `WEB_SEARCH` is `ENABLED`, `limit: null` on all seven plan windows in `plan-catalog.json`, so the units are counted and never refuse a request or move money (not a token/PAYG/credit path: rule 28 and rule 46 are not touched). `record` also never refuses: a rejected reservation is only logged.

Flagged, for the owner:

1. Usage numbers for `WEB_SEARCH` (admin usage analytics, the usage view) grow by about N times per search compared with the old "first provider wins" days. They are no longer "searches", they are provider calls.
2. If an owner ever sets a numeric `WEB_SEARCH` limit, the allowance is spent N times faster than the user's number of searches, and `record` will not stop the extra calls. Do that only after deciding whether a search should count as 1 unit; the counting point is `buildMeteredContext` in `search-execution.service.ts`.
3. Nothing double-charges a user: request ids are `runId:providerId:n`, unique per call, and the removed sequential re-run no longer repeats provider calls.
4. Provider spend (SerpAPI, Firecrawl, Exa credits) is the platform's, and is now N calls per search instead of 1.

## Consequences

- Search latency is the slowest provider (measured locally: max, not sum; see the change record), bounded by 20 s. A slow provider slows every search until its breaker opens.
- Merged `score` is rank-based. Consumers that read `score` (the research evidence `confidence`) now see 1.0 for each provider's top hit.
- Not done: abort of a timed-out request (adapters do not take a signal, so the raced call runs to its own timeout), per-provider retry, shared (cross-replica) breaker state, a cost-aware subset of providers.
