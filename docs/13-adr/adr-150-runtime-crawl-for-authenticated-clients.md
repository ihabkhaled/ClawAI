# ADR-150 - Runtime clients get a plan-gated, metered, capped crawl

**Status:** Accepted (backend built and gated 2026-10-02; the coding-agent tool that calls it is a separate workstream).
**Source:** the coding-agent audit, `apps/claw-coding-agent/docs/parity/web-research-parity.md`: sitemap and ranked
crawls, extraction and a 200-page ceiling existed in research-service but only behind admin routes, so a runtime
client could do no more than a client-side 30-page same-host crawl.

## Context

research-service already crawls well (robots, SSRF-checked redirects, size and time caps, per-host rate limits,
WEB_FETCH metering per live page). All of it was reachable only by chat-service (service token, after chat's plan
gate) or by an admin. Opening the existing user route (`/research/runs`) was refused on purpose in
[rule 50](../../rules/50-agentic-research-loop-and-narration.md) item 6: research-service does not enforce the plan,
so widening it would let any signed-in user reach crawling and skip the paid-feature gate.

## Decision

A new, separate, user-scoped surface that enforces what the chat path enforces, and adds no second fetch path.

| Piece        | Choice                                                                                                                                                                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes       | `POST/GET /research/crawl/runs`, `GET /research/crawl/runs/:id`, `GET /research/crawl/runs/:id/pages?after=&limit=`. Admin: `GET/PATCH /research/runtime-crawl/config`.                                                                                                                |
| Gate order   | global PermissionGuard (`RESEARCH_USE`), then `ResearchAccessGuard` (plan `allowResearchMode`, ADMIN passes, 503 if entitlements unreadable), and only then pipes, config and run rows (rule 50 item 2).                                                                               |
| Engine       | `SiteCrawlManager.crawl` for `profile: crawl`, `FetchService.fetchPage` for `profile: extract`. Nothing new fetches. The crawl gained one optional parameter, `maxLinkDepth`, defaulting to the old constant.                                                                          |
| Ownership    | every read filters on `userId`; another user's run id is a 404, never a 403 (rule 16 section 6).                                                                                                                                                                                       |
| Caps         | DB table `runtime_crawl_configs` (singleton `default`), seeded idempotently on boot, edited through the admin route, no env var. Pages per run, link depth, concurrent runs, runs per day, daily page budget, text and link bounds, run timeout. Code ceilings bound every admin edit. |
| Metering     | the existing per-operation meter, unchanged: `FetchService` records `WEB_FETCH` for every live (non-cache) fetch through `ResearchUsageService`. The route adds no price, no new feature key and no money semantics.                                                                   |
| Truthfulness | a run lists only pages actually read; a page that failed is a warning, never a row; a crawl that reads nothing is `FAILED` with the first real reason (`FETCH_ROBOTS_DISALLOWED`, `DOMAIN_BLOCKED`, `UNSAFE_URL`, else `RUNTIME_CRAWL_NO_PAGES_READ`). Rule 41.                        |
| Page content | secrets redacted and prompt-injection patterns FLAGGED (`injectionFlags`), text kept and capped, links http(s) only and capped. The caller treats page text as untrusted data.                                                                                                         |

## Consequences

- The daily budget counts a RUNNING run at its full page allowance and a finished one at what it read, so a client
  cannot start many runs and use the gap. A RUNNING row older than twice the timeout is dead and counts for nothing;
  the boot sweep fails it with `RUNTIME_CRAWL_INTERRUPTED`.
- The crawler cannot be aborted. On timeout the run is marked `FAILED` (`RUNTIME_CRAWL_TIMEOUT`) and the crawler
  drains in the background, bounded by its page budget; what it reads afterwards is dropped (and still metered).
- The plan's `WEB_FETCH` allowance is counted, not enforced, exactly as on the web path (`record` only counts).
  The hard stops here are the plan unlock and the DB caps. Enforcing the allowance is a decision for the owner, see
  the threat model.
- Not built: a retention purge for stored pages, and an admin page in the frontend (the config is API-only, like
  the fetch-strategy admin routes).

Threat model: [runtime-crawl-threat-model.md](../03-architecture/runtime-crawl-threat-model.md).
Service guide: [service-guide-research.md](../04-backend/service-guide-research.md).
