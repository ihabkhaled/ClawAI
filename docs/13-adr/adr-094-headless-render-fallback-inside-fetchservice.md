# ADR-094: Headless-browser rendering is a fallback INSIDE FetchService

- **Status**: Accepted
- **Date**: 2026-09-12
- **Deciders**: Platform / Backend
- **Related**: [rules/41](../../rules/41-web-evidence-truthfulness.md) ·
  [ADR-091](adr-091-user-urls-are-opened-not-searched.md) ·
  [ADR-092](adr-092-site-crawl-reuses-fetchservice-no-new-fetch-path.md) ·
  [service-guide-research](../04-backend/service-guide-research.md)

## Context

`HttpFetchAdapter` reads a page's raw HTTP response body. A page whose real
content is injected by its own client-side JavaScript — a React/Vue SPA
shell, a documentation site that hydrates its article body after load —
returns almost nothing this way: an empty `<div id="root">`, a handful of
script tags, no readable text. `HtmlMetadata`'s own doc comment already
named this limitation before any fix existed: "a page whose canonical tag…
is injected client-side will report `null`/empty here even though a browser
would show it… that fallback does not exist yet" (rule 41 item 13).
`fetch.types.ts`'s `metadata` field and `FetchAdapter`'s own interface
comment ("future adapters may provide headless-browser fetches") both
named this as the planned extension point.

## Decision

**`HeadlessFetchAdapter` (Playwright, Chromium) is a fallback INSIDE
`FetchService.fetchPage`, never a path a caller reaches directly.**
`FetchService` tries the plain HTTP fetch first — cheap, fast, no browser
boot — and only retries with the headless adapter when the plain result's
extracted text looks thin (`HEADLESS_RENDER_MIN_CONTENT_CHARS`, a floor on
extracted TEXT length, not raw HTML size, because a large page shell with
almost no text is exactly the case this exists to catch) on an
`text/html` response. This satisfies rule 41 item 12 ("never weaken the
fetch security boundary… a second fetch path") by construction: there is
still exactly one fetch entry point (`FetchService.fetchPage`), and the
domain-policy/SSRF checks are re-applied inside the fallback, not skipped
for it.

**Every in-page request gets the same anti-SSRF check the top-level
navigation gets — this is the real new risk a plain HTTP GET never had.**
`HttpFetchAdapter` never executes remote code, so it never issues a
subrequest of its own; the top-level URL check is the whole story. A
rendered page runs the page's own JavaScript, which can issue a request to
_any_ host it chooses — an `<img>`, an `XHR`, a `fetch()`, a WebSocket —
entirely outside the top-level navigation's URL. `HeadlessFetchAdapter`
installs a `page.route('**/*', …)` handler that runs `assertSafeOutboundUrl`
(the SAME function `HttpFetchAdapter` and its redirect check already use,
via the newly-shared `isHostExplicitlyAllowlisted`) against every single
request the page makes, and aborts anything that fails — a request to
`169.254.169.254` from inside a rendered page is blocked exactly like one
from the top-level URL would be. Image/media/font/stylesheet requests are
aborted unconditionally regardless of host safety: scraping needs the DOM's
text, never a rendered pixel, so they buy nothing and are pure attack
surface.

**One shared Chromium process, one throwaway context per fetch.** Booting a
browser per request would make the fallback unusably slow; a shared
`Browser` instance (`HeadlessFetchAdapter.getBrowser`, lazily launched,
closed in `onModuleDestroy`) amortizes that cost. Each `fetchPage` call
opens its own `BrowserContext` and closes it in a `finally` — no cookies,
storage, or cache survive between two different fetches, including two
fetches of the same URL, which matters because this adapter runs against
URLs a user or a search result named, not a fixed set of trusted sites.

**Extraction reuses `extractHtml` — the SAME parser the plain path uses.**
The rendered DOM's `page.content()` is fed through the identical
`extractHtml(html, finalUrl)` call `HttpFetchAdapter` already uses, so
canonical/hreflang/OG/JSON-LD extraction, title/text extraction, and link
extraction are byte-for-byte the same logic regardless of which adapter
produced the HTML. `FetchResult.renderedWithHeadlessBrowser` is the one new
field: `true` only when a render actually happened, absent (never `false`)
otherwise — so a trace or log line can say "rendered" only when it is
literally true, the same discipline rule 41 already holds every other
tool-usage marker to. `toolsUsed` gets a `web_fetch:headless` marker
(`pushFetchToolMarker`, shared by every fetch call site) instead of plain
`web_fetch` for exactly the same reason.

**Playwright, not Puppeteer.** Already a dependency in this monorepo
(`claw-frontend`'s `@playwright/test` E2E suite) — reusing it is "adopt, not
impose," not a second browser-automation library to maintain.

**A feature flag, not a hardcoded default-on.** `RESEARCH_HEADLESS_RENDER_ENABLED`
(default `true`) exists purely as a resource lever: Chromium adds real
image size (`--with-deps` pulls Debian system libraries — libnss3,
libatk-bridge, fonts) and real per-request cost (a browser boot + JS
execution + network-idle wait vs. one HTTP round trip). It is not a safety
toggle — the anti-SSRF guard applies identically whether or not this flag
is on; turning it off only means a client-rendered page is read as empty
text instead of not being read via headless rendering at all.

## Consequences

**Good.** A real gap named in three places before this (`HtmlMetadata`'s own
doc comment, `fetch.types.ts`'s `metadata` field comment, `FetchAdapter`'s
own interface comment) is closed: a client-side-rendered page's actual
content is now reachable through the same guarded fetch path, with the
security boundary extended to cover the new attack surface a rendered page
specifically introduces (in-page subrequests), not just the one the plain
path already had.

**Bad, and accepted.**

- **Slower and heavier for the pages that trigger it.** A browser boot plus
  a `networkidle` wait is materially slower than one HTTP GET — acceptable
  because it only fires on the minority of pages whose plain fetch looked
  thin, not on every fetch.
- **`waitUntil: 'networkidle'` can be wrong for a page with persistent
  polling or a WebSocket that never goes idle.** Bounded by
  `HEADLESS_RENDER_NAVIGATION_TIMEOUT_MS`, so such a page times out rather
  than hanging the request indefinitely, but it does not get rendered
  either.
- **Docker image size grows for research-service specifically** (Chromium +
  its Debian dependencies via `--with-deps`), in both `Dockerfile` and
  `Dockerfile.dev`. `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` (a
  world-readable, non-`/root` path) is required in the prod image because
  the browser is downloaded as root during build but launched later as the
  unprivileged `nestjs` user — Playwright's own default install path
  (`~/.cache/ms-playwright`) resolves to `/root/...`, unreadable by any
  other user.
- **No DNS-level protection**, same accepted gap `url-safety.utility.ts`
  already documents for the plain path (TD-031): a hostname an attacker
  controls can resolve to a private address and pass every syntactic check
  here, in-page requests included.

## Revisit when

- A real client-rendered page still comes back thin after headless
  rendering — likely a page that needs a real user interaction (click,
  scroll) to load its content, which `page.goto` + `networkidle` alone
  cannot trigger.
- Chromium's resource cost under real crawl-scale traffic (a `SITE_CRAWL`
  run touching 20 pages, several of which trigger the fallback) proves too
  expensive for `CRAWL_CONCURRENCY`'s current value — this may need its own
  concurrency limit separate from the plain-fetch one.
- TD-031 (DNS-level SSRF protection) is finally built — this adapter's
  `page.route` guard inherits that fix for free, no adapter-side change
  needed.
