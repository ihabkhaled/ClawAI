# ADR-211: Research fetches and crawls in parallel batches

**Status:** Accepted

**Date:** 2026-10-31

Rules: [rule 18](../../rules/18-error-handling-and-reliability.md), [rule 50](../../rules/50-agentic-research-loop-and-narration.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md).

## Context

An audit on 2026-10-31 found the research pipeline did its page work one page at a time: the top 3 search hits were fetched in a `for` loop, the URLs a user pasted were fetched in another `for` loop and awaited before search ran, and several sites in one message were crawled one after another. Each page can take up to 60 s through the escalation ladder, so three slow pages cost three times as long as one. Three pages was also a thin context for the answering model.

Owner order: research and crawling inside the pipeline work in parallel batches, not page by page. When search returns many links, the crawlers fetch those URLs in parallel batches and the extracted content is added to the context in addition to the search snippets. The caller waits for the whole batch (bounded) before the model answers.

## Decision

- **Batch runner.** `runFetchBatch` (`modules/research/utilities/fetch-batch.utility.ts`) groups URLs by site (host without `www.`), runs a site's URLs one after another in rank order and different sites side by side through `runWithConcurrencyLimit`. The 1 s per-host spacing of `HostRateLimiter` is therefore not defeated by parallelism (and still applies underneath).
- **Caps (constants, env-free).** Parallelism `EVIDENCE_FETCH_CONCURRENCY = 6`; top-K `EVIDENCE_FETCH_TOP_N = 8` search hits, at most `EVIDENCE_FETCH_MAX_PER_HOST = 2` per host, distinct hosts first (`selectFetchTargets`); pasted URLs `DIRECT_FETCH_MAX_URLS = 6`; one wall-clock cap per fetch phase `EVIDENCE_FETCH_PHASE_DEADLINE_MS = 30 000`. No unbounded `Promise.all`: every batch input is a list of at most 8 (search) or 6 (pasted) URLs; bodies keep the 2 MB cap.
- **Cap behaviour.** After the deadline no new page starts, finished pages keep their result, unfinished pages are reported `TIMEOUT`, and a late result is ignored. The phase never hangs the answer.
- **Overlap.** The pasted-URL fetch and the search call run together; search hits are fetched the moment search returns and do not wait for the pasted URLs. Worst case in flight at once: 6 + 6.
- **Inside a page fetch.** `FetchService.fetchPage` looks up robots.txt and the page cache together (robots is still enforced before anything is served or a job row is written). A crawl fetches robots.txt and the homepage together, and discovers the sitemap and the feed together.
- **Crawl.** Several sites in one message crawl in parallel (`CRAWL_SITE_CONCURRENCY = 3`, the same host stays serial). A process-wide `Semaphore` (`CRAWL_GLOBAL_WORKER_CAP = 12`) wraps every crawl page fetch, so sites x 8 per-site workers is bounded by 12. Per-site depth and page limits are unchanged. One failed site becomes a warning, not a failed run.
- **Context budget.** Fetched pages (detailed mode) may exceed the flat 1 500-char snippet limit: `EVIDENCE_FETCH_CONTEXT_BUDGET_CHARS = 96 000` is shared fairly (`allocateCharBudget`: nobody gets more than they need, the rest is split equally, the best-ranked page gets the remainder) and never drops an item below 1 500. Search hits and compressed mode are unchanged. chat-service still fits the evidence to the model window.
- **Deterministic output.** Results are reported in search-rank order, not completion order. Duplicate pages (same canonical URL, or same body) are dropped, the best-ranked kept; a pasted page wins over a search page.
- **Response, additive.** `EvidenceItem.fetchStatus` (`OK | FAILED | TIMEOUT | BLOCKED_ROBOTS | BLOCKED_SSRF`), `EvidenceBundle.fetchReport[]` (`url`, `origin: user|search`, `status`, `durationMs`) and `EvidenceBundle.fetchSummary` (`attempted`, `ok`, `wallMs`, `sumMs`; `sumMs > wallMs` proves overlap). Nothing existing is renamed or removed.
- **Unchanged and still enforced.** `FetchService.fetchPage` is the only fetch path: domain policy, robots.txt, SSRF checks on every hop, the 2 MB cap, the escalation ladder and its 60 s / 6 attempt limits. A refusal is reported per URL (`BLOCKED_SSRF`, `BLOCKED_ROBOTS`) and never fails the batch. A literal private or metadata address that failed is reported `BLOCKED_SSRF` (the fetch layer refuses it by failing every tier).

## Consequences

- A run with 8 hits costs about the slowest page (bounded by 30 s) instead of the sum. Measured live 2026-10-31: 8 pages, sum of page times 21.1 s, wall 8.5 s.
- More pages means more `WEB_FETCH` units per run (up to 8 + 6 instead of 3 + 3). Billing policy is unchanged: one unit per fetch.
- Not done: nested sitemap indexes still fetch one after another (they share one host, so the 1 s spacing would serialise them anyway); the caps are per process, each replica has its own.
