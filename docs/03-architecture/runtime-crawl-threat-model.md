# Runtime crawl: threat model

Decision: [ADR-150](../13-adr/adr-150-runtime-crawl-for-authenticated-clients.md).
Code: `apps/claw-research-service/src/modules/runtime-crawl/`.

## Assets

Third-party sites (we must not be a scraper they cannot refuse), the internal network (SSRF), the plan's paid
research unlock, the platform's outbound fetch budget, and the model that later reads the page text.

## Controls

| Threat                                                | Control                                                                                                                                                                  | Proof (spec)                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Free-plan user reaches crawling directly              | `ResearchAccessGuard` runs before pipes and managers; no plan, or no `allowResearchMode`, is 403 `PLAN_FEATURE_DISABLED`; unreadable entitlements is 503                 | `research-access.guard.spec`, `runtime-crawl.controller.spec`                   |
| Another user reads my run or pages (IDOR)             | every repository read carries `userId`; a foreign id is the same 404 as a missing one                                                                                    | `runtime-crawl.manager.spec` "reads"                                            |
| SSRF through the start URL                            | syntactic check before any row exists (loopback, RFC1918, metadata, decimal/hex IPs, credentials, non-http); then `FetchService` re-checks and checks every redirect hop | `runtime-crawl.manager.spec` unsafe-URL table                                   |
| SSRF by a hostname that resolves to a private address | NOT closed here: no socket-level guard exists yet (TD-031). Same exposure as every other research route                                                                  | none (known gap)                                                                |
| Ignoring robots.txt                                   | robots is honoured inside `FetchService` for every page and in the crawler's candidate filter; a Disallow is a failed run with `FETCH_ROBOTS_DISALLOWED`, never retried  | manager spec robots cases, `fetch.service.escalation.spec`                      |
| Runaway cost (many runs, huge runs)                   | per-run page cap, link depth cap, concurrent-run cap, runs-per-day cap, daily page budget, run timeout; request clamped to config; code ceilings on every config value   | `runtime-crawl.manager.spec` caps, `runtime-crawl.controller.spec` DTO ceilings |
| Hammering one host                                    | inherited: per-host rate limiter and robots crawl-delay inside the fetch orchestrator; crawl concurrency 8                                                               | `fetch-strategy-orchestrator.service.spec`                                      |
| A run stuck RUNNING holds a user's slot forever       | stale RUNNING rows (older than 2x timeout) count for nothing and the boot sweep fails them                                                                               | `runtime-crawl-bootstrap.service.spec`                                          |
| Prompt injection in fetched text                      | patterns flagged per page (`injectionFlags`), text never rewritten, secrets redacted; the client must treat text as data                                                 | `runtime-crawl.manager.spec` injection case                                     |
| Oversized response to the client                      | text capped (`maxTextCharsPerPage` <= 32 000), links capped (<= 100), pages paged (<= 25), warnings capped                                                               | `runtime-crawl.controller.spec`                                                 |
| Fabricated sources                                    | only pages actually read are stored; failures become warnings; an empty crawl is FAILED with the first real reason                                                       | manager spec failure cases                                                      |
| Admin edits the limits to something unsafe            | admin-only route, Zod bounds equal the code ceilings, `updatedBy` recorded                                                                                               | `runtime-crawl.controller.spec`                                                 |

## Open items (owner decisions)

1. The plan's `WEB_FETCH` allowance is counted, not enforced (same as chat). Enforcing it needs a reserve-then-release
   probe, which means widening `ReservedFeature` in `@claw/shared-entitlements` to include `WEB_FETCH`.
2. Stored page text has no retention purge. Runs are small and owner-only; a purge job needs a scheduler.
3. A DNS-resolving SSRF guard (TD-031) would close the rebinding row for every research route at once.
