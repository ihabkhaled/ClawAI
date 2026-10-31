# 2026-10-31: Research fetches and crawls in parallel batches

- Search hits (top 8, at most 2 per host, distinct hosts first) and user-pasted URLs (up to 6) are fetched in parallel: 6 at once across hosts, one host after another, 30 s cap for the whole phase (unfinished pages report `TIMEOUT`).
- The pasted-URL fetch runs together with the search call; hits are fetched as soon as search returns.
- Several sites in one SITE_CRAWL message crawl in parallel (3 at once); a process-wide cap of 12 page fetches bounds sites x workers.
- `FetchService.fetchPage` checks robots.txt and the cache together; a crawl fetches robots.txt + homepage and sitemap + feed together.
- Fetched pages share a 96 000-char context budget (best-ranked first, floor 1 500 each) instead of the flat 1 500.
- Additive response fields: `items[].fetchStatus`, `bundle.fetchReport[]`, `bundle.fetchSummary`. Output is in search-rank order; duplicates are dropped.
- `DIRECT_FETCH_MAX_URLS` 3 to 6, `EVIDENCE_FETCH_TOP_N` 3 to 8. Stale "Forty" comment fixed.
- Code: `modules/research/utilities/fetch-batch|fetch-targets|fetch-phase-state.utility.ts`, `common/utilities/semaphore.utility.ts`, `research.manager.ts`, `site-crawl.manager.ts`, `fetch.service.ts`.
- Docs: [ADR-211](../13-adr/adr-211-research-fetches-and-crawls-in-parallel-batches.md), [service guide](../04-backend/service-guide-research.md), research-service `CLAUDE.md`.
- Live check: 8 pages, sum of page times 21.1 s, wall 8.5 s; two pages of one host ran in sequence; `169.254.169.254` and `10.0.0.5` reported `BLOCKED_SSRF`.
