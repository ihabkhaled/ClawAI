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

## Amendment: confidence-scored audit findings (2026-09-11, same day)

`SiteAuditManager` (`modules/research/managers/site-audit.manager.ts`) turns a
completed crawl's evidence into `AuditFinding[]` — claims ABOUT the site,
distinct from `EvidenceItem`s (pages handed to the model). Four checks for
v1: missing meta description, missing canonical, a canonical pointing away
from the fetched URL, and pages sharing an identical title. Each finding
carries a `FindingConfidence` (CONFIRMED/HIGH/MEDIUM/LOW/UNVERIFIED — see the
enum's own doc comment) and the exact `evidenceItemIds` it was computed from.

Computed from `bundle.items` — the FINAL, deduped, truncated list — never
from the pre-bundle array, specifically so a finding can never cite an id
that got trimmed out of the bundle it lives in. Attached to
`EvidenceBundle.auditFindings`, an optional field, and only set (not left as
an empty array) when there is at least one finding.

Deliberately a small, fixed set of checks, not a general SEO rule engine —
see `SiteAuditManager`'s own doc comment. Every "missing X" finding carries
`FindingConfidence.HIGH`, not `CONFIRMED`, plus a stated limitation: the
check only proves the tag is absent from the fetched HTML, not from what a
browser would render, per rule 41 item 13.

## Amendment: auto-routing to SITE_CRAWL when research is already on (2026-09-12)

`SITE_CRAWL` was reachable only via a direct `POST /research/execute` call —
nothing in chat-service could ever request it, because chat-service's own
`ResearchWorkflow` enum (the wire-facing mirror of research-service's
`ResearchWorkflowKind`) had no `SITE_CRAWL` member, and no user-facing
`ResearchMode` maps to one either.

Per an explicit decision made when this was built: research stays
opt-in (no auto-triggering it for messages where the user never turned it
on), but ONCE it is on, the platform should not force a person to
pick SEARCH vs SEARCH_FETCH vs SEARCH_EXTRACT by hand for something as
distinguishable as "read one page" vs "crawl the whole site."

`classifyResearchWorkflow` (`apps/claw-chat-service/src/common/utilities/research-intent-classifier.utility.ts`)
implements the narrow slice of that: it takes the workflow
`mapResearchModeToWorkflow` would have chosen and upgrades it to
`SITE_CRAWL` only when the message contains BOTH a URL and one of a small,
literal set of crawl-intent phrases (`crawl`, `audit this/the site/website`,
`map this/the site/website`). Deterministic, not a model call — same
"rules first" posture as `detectUrlsInText` in research-service.

**Never upgrades `SEARCH_ONLY`.** That mode was chosen and priced as one
that does not fetch pages at all (rule 41 item 3); upgrading it into one
that fetches twenty would be the same defect in a new shape. Wired only into
the single-message research path (`ChatMessagesService.runResearchForIntent`),
not the compare-mode enricher (`ContextAssemblyManager`) — crawling once per
parallel model lane would multiply the cost by however many providers are
being compared, which is not what compare mode's lightweight per-lane
grounding is for.

## Revisit when

- **Done 2026-09-12**: ~~an intent classifier is built that auto-selects
  `SITE_CRAWL` from message content~~ — see the amendment above.
  `classifyResearchWorkflow` covers the narrow "crawl this URL" case only;
  the broader auto-web-intent-router the spec describes (NONE/SEARCH/FETCH
  chosen automatically for every message) is still a separate, larger
  decision, deliberately not built — research stays opt-in.
- Something needs to browse a crawl's page graph independently of the one
  answer it produced — that is the trigger for a persisted schema.
- A real site with a gzipped sitemap is reported as under-crawled.
- The compare-mode enricher gets a cost model that could afford a crawl per
  lane — until then it deliberately never requests `SITE_CRAWL`.
