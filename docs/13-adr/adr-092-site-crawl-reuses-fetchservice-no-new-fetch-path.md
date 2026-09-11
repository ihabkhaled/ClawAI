# ADR-092: Multi-page site crawl reuses FetchService, no new fetch path

- **Status**: Accepted
- **Date**: 2026-09-11
- **Deciders**: Platform / Backend
- **Related**: [rules/41](../../rules/41-web-evidence-truthfulness.md) ·
  [service-guide-research](../04-backend/service-guide-research.md) ·
  [ADR-091](adr-091-user-urls-are-opened-not-searched.md)

## Context

ClawAI could fetch one URL the user named, but had no way to crawl a site:
discover its pages via `robots.txt` and `sitemap.xml`, and read a bounded set
of them. "Audit this website" or "crawl this documentation" had no workflow
to answer to — the closest thing was fetching the one homepage URL and
stopping there.

## Decision

`SiteCrawlManager` (`apps/claw-research-service/src/modules/research/managers/site-crawl.manager.ts`)
adds a new `ResearchWorkflowKind.SITE_CRAWL`. Every network call it makes —
`robots.txt`, `sitemap.xml`, every crawled page — goes through the same
`FetchService.fetchPage` every other workflow already uses. This was
non-negotiable per rule 41 item 12: "never weaken the fetch security boundary
… direct fetching adds a CALLER to `FetchService`, not a second path." A
crawler is the same principle at N pages instead of one: the SSRF guard,
domain policy, cache and usage accounting all apply identically, because
there is no second code path for them to miss.

**Discovery order: sitemap first, homepage links only as a fallback.**
`robots.txt`'s declared `Sitemap:` entries are tried first, falling back to
the conventional `/sitemap.xml` path. A `sitemapindex` is walked up to
`CRAWL_MAX_SITEMAP_FETCHES` (5) total sitemap fetches. Only when the sitemap
yields fewer than `CRAWL_MIN_SITEMAP_URLS_BEFORE_LINK_FALLBACK` (3) URLs does
the crawl supplement from the homepage's own same-origin links. A site with a
real sitemap gets a curated, intentional page list; a site without one gets
whatever the homepage actually links to, rather than an empty crawl.

**Crawled pages are evidence with `source: 'fetch'`, not a new source
value.** A crawled page's content reached the model exactly the way a direct
fetch's does — the distinction that matters (`pagesRead` in
`chat-messages.service.ts`, rule 41 item 7) is "was this content actually
read," which is true here regardless of how the URL was discovered. Discovery
method (`user`/`sitemap`/`link`) is recorded in `EvidenceItem.structured`
instead, for anything that wants the finer distinction without needing every
consumer of `EvidenceItem.source` updated for a fourth value.

**No new database schema.** A crawl's pages become `EvidenceItem[]` folded
into the same `EvidenceBundle`/`ResearchRun` every other workflow already
persists. No `CrawlRun`/`CrawlNode` tables, no migration for a crawl graph.
The crawl graph spec sections describe (parent/depth/discovery-method per
node, browsable independently of any one answer) is real future scope, not
built speculatively now — nothing today needs to browse a crawl's shape
outside of the one answer it produced.

**Bounded, not configurable, for v1.** `CRAWL_DEFAULT_MAX_PAGES` (20),
`CRAWL_CONCURRENCY` (4 in flight via `runWithConcurrencyLimit`),
`CRAWL_MAX_SITEMAP_FETCHES` (5) are fixed constants, not per-request
parameters. One failed page is a warning, never an aborted crawl — the same
partial-success principle rule 41 already applies to a single fetch failure.

## Consequences

**Good.** A real, tested, bounded crawl capability exists and is reachable
through the same API surface (`POST /research/execute` with
`workflow: 'SITE_CRAWL'`) as every other workflow, inheriting every security
and reliability property `FetchService` already has.

**Bad, and accepted.**

- **Not exposed as a user-facing toggle yet.** The frontend's research mode
  selector has no "crawl" option, and nothing auto-detects crawl intent from
  a message yet (that is separate, later scope — an intent classifier that
  decides SEARCH vs FETCH vs SITE_CRAWL automatically, only once research is
  already enabled, per the platform's existing manual-opt-in cost model).
  Reachable via the API, not yet reachable from the chat UI.
- **No persisted crawl graph.** A crawl's shape (which pages, at what depth,
  discovered how) is visible in the run's `trace`, not as a browsable
  structure. Building that is a real, separate schema decision for whenever
  something needs to browse a crawl independently of the answer it produced.
- **Gzip-compressed sitemaps are not decompressed.** `FetchService` does not
  decompress bodies; a gzipped sitemap fails to parse as XML and the crawl
  falls back to homepage links, silently under-discovering that site.
- **robots.txt matching has no wildcard (`*`, `$`) support inside paths**,
  only prefix matching — correct for the common case, not a full
  specification-compliant implementation.

## Amendment: RSS/Atom feed discovery (2026-09-11, same day)

The homepage's own `<link rel="alternate" type="application/{rss,atom}+xml">`
autodiscovery tag, when present, is fetched and parsed
(`common/utilities/feed.utility.ts`) and its entries added as crawl
candidates — same rule as everything else here: through `FetchService`, no
new fetch path. Checked unconditionally rather than only as a sitemap
fallback, because a feed is usually a site's most recent content and a
sitemap can be complete but stale — a different signal, not a substitute for
a missing one. A site with no autodiscovery tag is not probed at
conventional feed paths (`/feed`, `/rss.xml`); only what the page itself
advertised is checked, matching the same "advertised, not guessed" posture
sitemap discovery already has via `robots.txt`'s `Sitemap:` directive before
falling back to a conventional path.

## Revisit when

- An intent classifier is built that auto-selects `SITE_CRAWL` from message
  content — this ADR's manager is what it will call.
- Something needs to browse a crawl's page graph independently of the one
  answer it produced — that is the trigger for a persisted schema.
- A real site with a gzipped sitemap is reported as under-crawled.
