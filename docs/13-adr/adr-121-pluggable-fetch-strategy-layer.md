# ADR-121 — Every research fetch goes through a DB-gated escalation chain

## Status

Accepted — wired into the live fetch path 2026-09-25 (owner decisions of the
same day). Supersedes the "not wired yet" first draft of this ADR and absorbs
ADR-094's headless fallback into the chain.

## Context

`research-service` had one fetch path: a plain `fetch` GET, plus one
conditional retry in headless Chromium when the text looked client-rendered.
A TLS/JA3-fingerprint 403, a Cloudflare interstitial, a dead page and a
robots.txt refusal all looked the same — "fetch failed" — and robots.txt was
only consulted inside the site-crawl workflow, never on a single fetch.

`docs/research/scraping-tools-survey.md` evaluated the free/open-source tools.
The owner approved a set on 2026-09-25 (see "Per-tool status").

## Decision

1. **One path.** `FetchService.fetchPage` (still the only fetch entry point,
   rule 41 §12) runs: domain allow/blocklist → **robots.txt** → page cache →
   `FetchStrategyOrchestratorService.fetchWithEscalation`.
2. **robots.txt on every fetch** (`RobotsPolicyService`, RFC 9309): 2xx →
   rules for `ClawAI-ResearchBot`/`*` decide (now with `*` and `$` path
   patterns — the old prefix-only matcher failed OPEN for wildcard rules);
   4xx → allowed; 5xx/unreachable → origin off limits, only the archive may
   run. A Disallow refuses the fetch with `FETCH_ROBOTS_DISALLOWED` (403)
   before a job row, a usage charge or any strategy exists. A 401/403/503
   robots.txt is retried once through the TLS-impersonating client so a WAF
   cannot hide the rules. `Crawl-delay` (capped 10 s) becomes the host's
   politeness interval. Cached per origin (1 h; 10 min when unreachable).
3. **The chain** (tier = order, `FetchStrategyConfig`, DB-level):

   | Tier | Kind                   | Default  | What                                                     |
   | ---- | ---------------------- | -------- | -------------------------------------------------------- |
   | 0    | `OFFICIAL_API`         | enabled  | Wikipedia REST, GitHub README, arXiv, Crossref, HN       |
   | 10   | `HTTP_PLAIN`           | enabled  | Node `fetch`, honest `ClawAI-ResearchBot` UA             |
   | 20   | `HTTP_TLS_IMPERSONATE` | enabled  | `impit` — Chrome TLS/HTTP2 fingerprint                   |
   | 30   | `HEADLESS_BROWSER`     | enabled  | Patchright Chromium (env kill switch still honoured)     |
   | 40   | `CRAWL4AI`             | disabled | sidecar, profile `crawl4ai`, ≥ 0.9.4                     |
   | 50   | `FLARESOLVERR`         | disabled | sidecar, profile `flaresolverr`, only after JS_CHALLENGE |
   | 60   | `FIRECRAWL`            | disabled | sidecar, profile `firecrawl` (8-12 GB)                   |
   | 70   | `READER_PROXY`         | enabled  | Jina Reader, public URLs only, 1 call / 3.5 s            |
   | 80   | `ARCHIVE_SNAPSHOT`     | enabled  | Wayback, labelled "Archived copy, captured <date>"       |

4. **Escalation policy** (`escalation-policy.utility.ts`, one pure function).
   Technical blocks escalate; refusals stop. 401/407/451 end the chain. A
   captcha, a 429, a 404/410/dead host or an unreachable robots.txt leave only
   the archive. FlareSolverr runs only after a JS interstitial was seen. After
   an empty client-rendered shell, non-rendering origin clients are skipped,
   and the archive is not a remedy for thinness: if every renderer is thin
   too, the longest live thin result is served. A thin page is a shell only
   when its markup is script-driven — example.com is not a shell.
5. **Bounds.** ≤ 6 attempts, ≤ 60 s wall clock (each attempt's timeout is
   clamped to what is left), one request per host per second (or Crawl-delay)
   for tiers that touch the origin. No retry loop exists anywhere.
6. **SSRF.** Every redirect hop is checked BEFORE it is requested
   (`followRedirectsSafely`, `redirect: 'manual'`) for plain, impit, official
   API, archive and robots fetches. Headless: route guard on every in-page
   request + post-navigation check of the whole redirect chain. Sidecars and
   the reader follow redirects themselves: the target is checked before, the
   reported final URL after, and the sidecars sit on the isolated
   `claw-scrapers` bridge (research-service is the only ClawAI container on
   it) so a sidecar-side redirect cannot reach our services. In addition,
   every direct `fetch` in the chain also passes the shared
   `assertSafeRequestUrl` (TD-038, no exemption): fixed hosts for the archive
   and official APIs, `declaredHost(baseUrl)` for the reader and sidecars, the
   target site's own host for robots.txt. The reader and
   the archive are third parties: they only ever receive a public URL with no
   token-like query parameter and no signed-in-only app host.
7. **Host memory.** `HostStrategyMemory` moves the last winning tier to the
   front for that host (≤ 7 days old; never the reader or the archive).
8. **One extraction.** Every HTML-producing tier ends in `extractPageContent`:
   `extractHtml` (links, head metadata incl. JSON-LD/OpenGraph, feed
   autodiscovery) + `@mozilla/readability` on `linkedom` + `turndown` for the
   article as Markdown. Same bytes → same text, whichever tier fetched them.
9. **Observability.** Each attempt logs `fetch.attempt kind= outcome= signal=`,
   each served page one `fetch.served kind= tier= host= path=` line (origin +
   path only — never the query string), each failure `fetch.failed … trail=[…]`,
   each refusal `fetch.refused reason=robots_disallow`. `fetch_jobs.servedBy`
   and `fetch_jobs.archivedAt` persist the same facts per job.
10. **Machine-readable fetches** (robots.txt, sitemaps, feeds from site-crawl)
    pass `FetchPurpose.MACHINE_READABLE`: only the two raw HTTP tiers may serve
    them — a renderer, the reader or an old archive copy is a wrong answer to
    "what are this site's rules/pages now". Not client-settable.

## Per-tool status (owner decisions, 2026-09-25)

- **Enabled:** official APIs (Wikipedia/GitHub/arXiv/Crossref/HN), RSS/sitemap/
  JSON-LD/OpenGraph (already in `extractHtml` + site-crawl), Readability +
  linkedom + Turndown, impit, Patchright, Jina Reader, Wayback availability API.
- **Shipped disabled (profile + DB switch):** Crawl4AI 0.9.4, FlareSolverr
  v3.5.2, Firecrawl self-host (digest-pinned).
- **Not adopted: Crawlee.** Its value is a request queue, session pool and
  autoscaled crawler. Our queue is `runWithConcurrencyLimit` (≈30 lines) plus
  site-crawl's page budget; our retry is this chain; we deliberately keep NO
  cookies/sessions between fetches. Crawlee would replace ~30 lines with a
  framework, its on-disk storage and its own retry semantics that would have
  to be disabled to keep the bounds above. It deletes none of our code
  honestly, so per the owner's condition it is not adopted.
- **Wayback CDX API:** not used — the availability API answers the one
  question asked (closest snapshot) in one call.
- **No proxies** of any kind (owner: no paid proxies; free lists are unsafe).

## Consequences

- A 404 now returns a labelled archived copy (or fails), not a "successful"
  404 page. A 401 page is no longer served as content.
- A robots-disallowed URL a user typed is refused; rule 50 §3 ("a link the
  user wrote is opened") is now bounded by robots.txt — see rule 50.
- The Docker image carries Patchright's Chromium instead of Playwright's
  (same `PLAYWRIGHT_BROWSERS_PATH`), and impit's prebuilt glibc binary —
  both proven inside `node:26-bookworm-slim` as the `nestjs` user.
- `CLAW_SCRAPER_PROFILES` is a new env var: which containers exist has to be
  decided before any service runs, so it cannot be DB-level. Enablement is.
- The production deploy must honour the same profiles. It did not at first:
  `deploy-prod.sh` only knew `local-ai`, and the first release after the
  sidecars shipped started all seven on prod (2026-09-25, Firecrawl
  crash-looped, the release failed and stayed on the previous SHA). Fixed the
  same day — a profiled service is deployed only when one of its profiles is
  live (`CLAW_SCRAPER_PROFILES` from the prod `.env`); see
  `docs/08-runtime-devops/deployment-guide.md` § Profiled services.
- ~~health-service does not probe the sidecars~~ — superseded by the
  addendum below: research-service reports them and health-service lifts them.

## Related

`docs/research/scraping-tools-survey.md` · `skills/add-a-fetch-strategy.md` ·
`rules/50-agentic-research-loop-and-narration.md` · ADR-094 ·
`rules/13-external-library-wrappers-and-adapters.md` ·
`rules/15-configuration-and-environment.md`

## Addendum 2 (2026-10-05): which tier read the page is shown, not hidden

The audit found the escalation worked but nobody could see it: `servedBy` and the attempt
trail stopped at research-service. Now:

- `FetchResult.attempts` (kind + outcome only) rides with `servedBy`; `EvidenceItem.fetch`
  (`{strategy, attempts}`) carries both to chat-service inside the evidence bundle. No URL,
  status, body or error text is ever included. A cache hit carries neither (unmeasured).
- chat-service appends one `PAGE_READ` narration line per page an escalated tier served
  ("Read example.com via Crawl4AI after Plain fetch was blocked"), capped at 10 per step, on
  every research path including the context-gateway path Compare/Consensus/Escalation/labs use
  (rule 59). The strategies also appear in the research-completed progress frame and the
  stored progress summary; the full field persists in `metadata.research.bundle`.
- The frontend renders it in `NarrationLog` (live and stored) and as a chip per source in
  `EvidenceViewer` (research-run-details). Strings: `narration.pageRead*`, `narration.strategy*`,
  13 locales.
- Deviation: no `shared-types` entry. research and chat each mirror the bundle shape today
  (see `research.types.ts`); a shared type would force every dev container to rebuild
  baked packages for a display field.
- Not done here: `runtime-crawl` (ADR-150) page rows do not store the strategy (needs a
  migration); the planner `render` hint and routing chat `web_fetch` through this chain are
  batches 2 and 3 of the same programme.

## Addendum 3 (2026-10-05): the planner may hint how a page must be read

The planner model decides, from its own reading of the request (not keywords), whether the
named site needs JavaScript rendering or anti-bot handling, and emits `"render": "js" | "stealth" | null`
in the plan JSON (`parseResearchPlan` keeps only those two values, only on crawl actions).

- It travels chat-service `ResearchRequest.render` -> `executeResearchSchema.render` ->
  `FetchRequestDto.render` -> `EscalationOptions.renderHint`.
- Effect: `orderChainForHint` moves the hint's preferred tiers (`FETCH_RENDER_HINT_PREFERRED_KINDS`)
  up, but only AMONG the tiers after the pinned honest ones: `OFFICIAL_API` and `HTTP_PLAIN`
  (`PINNED_FIRST_KINDS`) always run first, hint or not. The hint is model output and so
  prompt-injection reachable; it must never put an evasion-class tier (TLS impersonation,
  FlareSolverr, a browser) ahead of the plain fetch. A hinted tier therefore runs only after
  the plain fetch did not serve the page, exactly as without a hint. It is a pure reorder of
  the chain that is already enabled: it adds no tier, enables no sidecar, and `excludeKinds`, `isStrategyEligible`
  (FlareSolverr only after a JS interstitial), robots.txt, SSRF checks, 401/451/captcha stops,
  the 6-attempt and 60 s bounds all apply unchanged. Reader and archive never move up.
- Scope: user-named pages (direct fetch, crawl homepage). The homepage winner is recorded by
  host memory, which then promotes it for the rest of that crawl. Pages found by search and
  discovered crawl pages are not hinted.

## Addendum 4 (2026-10-05): chat `web_fetch` goes through the chain; tier state is visible

- The `web_fetch` tool of the tool-calling loop used to POST to Ollama Cloud's hosted
  `/api/web_fetch`: no robots.txt, no sidecars, none of our SSRF checks. It now calls
  research-service's `POST /internal/research/fetch` (`FetchInternalController`, service token,
  user named explicitly, plan gate already applied by chat) which runs `FetchService.fetchPageForTool`:
  domain policy, robots.txt, cache, escalation chain. The model receives `{title, content, links}`
  (+ `archivedAt` for an archive copy), never raw HTML.
- No fallback to the hosted fetch: a robots Disallow, a refusal or a failure fails the tool call
  (`OLLAMA_TOOL_CALL_FAILED`), because the hosted route would bypass robots. `web_search` still
  uses the hosted endpoint. Feature-usage accounting (`WEB_FETCH`) is unchanged.
- The admin UI (Research providers page) shows a "Page readers" card from the existing
  `GET /research/fetch-strategies`: each tier **Available** or **Off**. So an operator can tell a
  sidecar that is switched off from one that was merely not needed for a page. Status page and
  health-service already showed a disabled sidecar as Disabled (addendum 1).

## Addendum (2026-09-25): sidecar health

health-service still never connects to a sidecar (it is not on
`claw-scrapers`). research-service, which is, reports them:

- `GET /api/v1/health` answers `{ status: 'ok'|'degraded', service,
services: { crawl4ai, flaresolverr, firecrawl } }`, each `up`/`down`/`disabled`.
- `disabled` = the `fetch_strategy_configs` row is off (or missing); it is not
  probed. An enabled one gets one GET with a 2 s timeout on a route that needs
  no credential and does no work: Crawl4AI `GET /health`, FlareSolverr `GET /`,
  Firecrawl `GET /`, against the row's `publicConfig.baseUrl` (metadata hosts
  refused, no redirects). The report is cached 15 s (`SidecarHealthService`).
- A down sidecar makes research **degraded**, never down: HTTP stays 200, the
  escalation chain simply skips that tier.
- health-service `DEPENDENCY_PROBES` turns them into rows `crawl4ai` /
  `flaresolverr` / `firecrawl` (`claw_service_up` series, uptime) and the
  status-page components "Web scraper: Crawl4AI / FlareSolverr / Firecrawl".
  A disabled one has no row and no series and shows as **Disabled**
  (`ComponentState.DISABLED`), never as down.
- Crawl4AI enabled without `CRAWL4AI_API_TOKEN` reads **down**: the sidecar
  then binds loopback only, so research-service genuinely cannot reach it.
- Runbook: `docs/11-runbooks/runbook-scraper-sidecar-down.md`.
