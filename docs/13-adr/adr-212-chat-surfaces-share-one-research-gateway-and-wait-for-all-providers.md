# ADR-212: Chat surfaces share one research gateway and wait for all providers

**Status:** Accepted

**Date:** 2026-10-31

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 46](../../rules/46-token-quota-enforcement-and-window-integrity.md), [rule 50](../../rules/50-agentic-research-loop-and-narration.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md). Builds on [ADR-210](adr-210-auto-search-runs-every-enabled-provider-in-parallel.md) (research-service searches with every provider in parallel) and [ADR-211](adr-211-research-fetches-and-crawls-in-parallel-batches.md) (it fetches pages in parallel batches).

## Context

The 2026-10-31 audit found that chat-service had five separate research clients, each with its own timeout: the Compare enricher (search 8 s, then each page 15 s), search-first (8 s), the AUTO orchestrator, the explicit modes and the labs/gateway context (30 s for a whole run). research-service now lets its slowest search provider run for about 20 s and its fetch phase for about 30 s, so every caller except the last gave up before research-service had finished and threw away the slow providers' results. Search-first called the user route with no token at all. The model-callable `web_search` tool did not use the configured providers: it called Ollama Cloud's hosted API, one tool call at a time. Rule 59 ("one pipeline") held for narration only.

The owner's order: when search is automatic, in chat, Compare, Threads, everywhere, all providers search in parallel and the model must not start answering before they are all done (each bounded by its own timeout). Then everything they found, plus the crawled page content from the result URLs, goes to the model together.

## Decision

- **One gateway.** `modules/chat-messages/utilities/research-gateway.utility.ts` is the only code in chat-service that knows where research-service is. `gatewaySearch` (user route), `gatewaySearchForUser` (service-token route, for callers with no bearer), `gatewayFetchPages` / `gatewayFetchPage`, `gatewayRun` (whole run) and `gatewayToolFetch` (the `web_fetch` tool). It never throws: a failure is `ok: false` with a `ResearchGatewayFailure` (`TIMEOUT`, `HTTP_ERROR`, `EXCEPTION`, `UNAVAILABLE`). The five private copies are deleted. `research-gateway-parity.spec.ts` fails when any other file mentions `RESEARCH_SERVICE_URL`, `/api/v1/research`, `/internal/research`, `runResearch(` or `fetchPageViaResearch(`, or declares its own research timeout.
- **One set of timeouts**, in `common/constants/research-client.constants.ts`, each strictly larger than research-service's own bound: search 24 s (research-service caps at 20 s, required at least 22 s), fetch phase 36 s (cap 30 s, required at least 35 s), a whole run 60 s (the two back to back). A crawl keeps 300 s, one `web_fetch` page 75 s. The spec asserts the relationships.
- **Wait for all, then answer.** Every surface awaits the gateway before the answering model is called: normal chat publishes the turn to the router only after `runResearchIfRequested` settled (in `finally`, so a failure never strands the turn), the enricher (Compare and the nine orchestration managers) awaits search then the fetch batch before returning, search-first and context assembly are awaited. `research-wait-before-model.spec.ts` and the parity spec fail when a surface starts the model while research is pending or fire-and-forgets it.
- **Failure never blocks, never hides.** After the bounded wait the model answers with whatever came back. A search that timed out or failed emits `RESEARCH_FAILED` on the stream and adds a transcript warning (`research.searchTimedOut`, `research.searchFailed:<KIND>`); the empty-results block tells the model what happened.
- **The richer result.** The enricher asks for 10 merged results (was 5) and fetches 6 pages in parallel (was 3), with per-source ceilings of 6,000 / 8,000 characters (was 2,000 / 2,500). Provenance travels: `(found by Brave, Exa)` on each source. All of it is then fitted to the same 45% evidence share of the window the main path uses (`EVIDENCE_FIT_BUDGET_SHARE`), through `fitSourcesToResearchBudget`: bodies are shortened evenly first, whole sources dropped from the tail last, and the prompt says how many were left out (rule 41). Where the caller does not know the answering model's window (Compare and the labs fan one block out to several models) 16,384 tokens is assumed, i.e. about 22,000 characters of evidence. Search-first now fits to the real window. The run-based paths (normal chat, AUTO, explicit modes, labs) already fitted with `fitEvidenceToBudget`; their default result counts rise to 8 / 8 / 6.
- **`providers[]` and `mode`** from research-service are read when present and treated as the old shape when absent. AUTO narration (`SEARCH_DONE`) carries `providers` and `providerCount` params; the stream's `RESEARCH_SOURCES_FOUND` carries `providers`. The run bundle's `attemptedProviders` stands in on the old shape.
- **`web_search` tool.** In AUTO it uses the configured providers through the gateway (service-token route, all providers in parallel). The hosted Ollama Cloud search stays only as the fallback when research-service is unavailable or reports no provider. A model turn's independent tool calls (`web_search`, `web_fetch`, `get_crawled_page`) run in parallel, bounded at 4 (`RESEARCH_TOOL_CALL_PARALLEL_LIMIT`), results returned in the model's call order with each call's own id.
- **Search-first** now uses the service-token route (it had no token) and is skipped when the turn already carries web evidence, because the first live run showed it searching a second time for the same question.

## Billing

research-service records one `WEB_SEARCH` unit per provider call (ADR-210). Chat adds nothing on top: `searchRequestCount` is read from research-service and never derived from `providers.length`, the `web_search` tool no longer records its own unit when the gateway answers (it records one only when the hosted fallback runs, which research-service never saw), and search-first no longer runs a second search on a researched turn. No token, quota or credit path changes (rules 28 and 46 are untouched).

## Consequences

- A slow provider delays the answer by at most research-service's bound (20 s search, then the fetch phase). This is the owner's trade: completeness over first-token speed.
- More sources reach the model, never more than 45% of its window.
- Search-first started working (it used to fail unauthenticated); watch its volume.
- Not done: the frontend strings for the provider line and the two new warnings (see the change record), live verification of the tool-call path with an Ollama Cloud tool model, a window per lane for Compare.
