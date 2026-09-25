# Scraping and crawling tools survey (research-service escalation chain)

Date of survey: 2026-09-24. Method: web search only (no tool was installed or run).
"Seen" dates are what search results reported on this date. Anything not
confirmed is marked **unverified**. Benchmarks quoted by blogs are vendor or
hobbyist claims, not measurements of ours; treat block-class claims as
"reported", and re-test in our Docker image before registering a tool.

## Status after the owner's decisions (2026-09-25)

The owner overrode parts of section 3. What shipped (ADR-121) — this table
wins over the recommendations below where they differ:

| Tool                                              | Status                                    | Evidence / reason                                                                                 |
| ------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Official APIs (Wikipedia, GitHub, arXiv, Crossref, HN) | Enabled, tier 0                     | `OfficialApiFetchAdapter`                                                                         |
| RSS/Atom, sitemap, JSON-LD/OpenGraph              | Enabled (already in `extractHtml`/site-crawl) | unchanged code, now machine-readable fetches are raw-HTTP only                              |
| @mozilla/readability + linkedom + turndown        | Enabled on every tier's HTML              | `extractPageContent`                                                                              |
| impit                                             | Enabled, tier 20                          | glibc prebuilt ran in `node:26-bookworm-slim` as `nestjs`; fiverr.com: Node fetch 403, impit 200  |
| Patchright                                        | Enabled, tier 30 (replaces Playwright)    | Chromium 153 rendered quotes.toscrape.com/js (10 quotes) in the prod image                        |
| Crawl4AI 0.9.4                                    | Shipped, DISABLED (profile `crawl4ai`)    | ≥ 0.9.4 for the 2026-09-23 SSRF fixes; behind our own SSRF guard + isolated network               |
| FlareSolverr v3.5.2                               | Shipped, DISABLED (profile `flaresolverr`) | policy runs it only after a JS interstitial on a robots-allowed URL                              |
| Firecrawl self-host                               | Shipped, DISABLED (profile `firecrawl`)   | digest-pinned images, 8-12 GB                                                                      |
| Jina Reader                                       | Enabled, tier 70                          | public, token-free URLs only; 1 call / 3.5 s                                                       |
| Wayback availability API                          | Enabled, tier 80                          | output labelled "Archived copy, captured <date>"; CDX not needed for one-snapshot lookups         |
| Crawlee                                           | Not adopted                               | would replace ~30 lines of concurrency code with a framework, its storage and its own retries; deletes none of our code honestly (ADR-121) |
| Proxies (any)                                     | Not adopted                               | owner: no paid proxies; free lists unsafe                                                          |
| Browserless, Camoufox, Nodriver, got-scraping, Scrapling, curl_cffi | Not adopted             | per section 3 (licence, Python-only, or superseded by impit/Patchright)                            |

## 0. Ground rules this survey respects

- robots.txt honoured, domain allow/blocklist, anti-SSRF guard, ToS respect
  (rules/41, rules/50 were only skimmed by the survey author).
- The chain escalates to fix **technical** failures (JS needed, TLS fingerprint
  rejected by a naive filter, transient rate limit). It does **not** escalate to
  defeat an explicit refusal (section 4).
- Every tier must re-run the SSRF guard on the final URL and every redirect,
  and third-party fetchers (reader/archive) must only ever be sent URLs that
  already passed allow/blocklist and robots checks.
- Sending a URL to a third-party service (Jina, archive, SaaS) discloses that URL
  (and possibly the user's query context) to that party. Needs an explicit
  privacy decision and must never be used for private or authenticated URLs.

## 1. Tool-by-tool findings

Footprint numbers are rough orders of magnitude, not measured (unverified
unless stated).

### Browser automation and stealth

| Tool                       | License                                           | Reported latest / status (seen)                         | Defeats                                                                  | Footprint                                   | Docker                                                                         | Risk                                                                                              |
| -------------------------- | ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Playwright (already used)  | Apache-2.0                                        | Actively maintained (version unverified)                | JS rendering only; default headless is easily detected                   | 300-600 MB per Chromium context set, 1+ CPU | Official images; needs `--with-deps` on bookworm-slim                          | Low                                                                                               |
| Patchright (Node + Python) | Apache-2.0 (unverified)                           | Push 2026-08-05, reportedly monthly cadence             | JS rendering; removes CDP `Runtime.enable` leak; some passive bot checks | Same as Playwright, Chromium only           | Drop-in Playwright API; Chromium install                                       | Medium: patches lag Playwright; cat-and-mouse                                                     |
| Camoufox                   | MPL-2.0 (unverified)                              | Push 2026-08-12, 11k stars                              | JS rendering; Firefox fingerprint spoof (canvas, WebGL, navigator)       | Heavier than plain Firefox, 400-800 MB      | Python-first; Node use via Playwright Firefox protocol is awkward (unverified) | Medium-high: single maintainer history, Python sidecar likely                                     |
| Nodriver / zendriver       | AGPL-3.0 (nodriver), zendriver license unverified | zendriver last release seen 2026-03-12; nodriver slower | JS rendering; no WebDriver artefacts                                     | Chromium-sized                              | Python only; zendriver advertises Docker                                       | High for us: Python sidecar plus AGPL question                                                    |
| rebrowser-patches          | MIT (unverified)                                  | Reported last commit Sep 2024 (abandoned), Chromium 136 | Was: CDP leaks                                                           | n/a                                         | n/a                                                                            | High: stale, superseded by Patchright                                                             |
| Browserless                | SSPL-1.0 or paid commercial license               | Active (version unverified)                             | Hosted browser pool over WebSocket, not stealth per se                   | Chromium pool, 1+ GB                        | Official image                                                                 | High licence risk: closed-source commercial/CI use needs a paid licence; SSPL is not OSI-approved |

### Crawl frameworks and extraction pipelines

| Tool                                             | License                                            | Reported latest (seen)                                                                                 | Defeats                                                                                     | Footprint                                                                        | Docker                                                       | Risk                                                                                                             |
| ------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Crawlee (JS/TS)                                  | Apache-2.0 (unverified from results, widely known) | 3.18.1, 3.18 dated 2026-08-04                                                                          | Queueing, retries, session/proxy rotation, autoscaling; wraps Cheerio/Playwright/Patchright | Light in HTTP mode, browser mode as above                                        | Node-native; fits our stack                                  | Low. Overlaps our own orchestration, so use as a library only if it removes code                                 |
| Scrapling (Python)                               | BSD-3 (unverified)                                 | v0.4.15, 2026-08-23; reworked Cloudflare solver, MCP server                                            | HTTP with TLS impersonation plus stealth browser fetchers                                   | Python + Chromium                                                                | Python sidecar                                               | Medium: its "Cloudflare solver" targets challenge evasion, conflicts with section 4 if used on refusals          |
| Crawl4AI (Python)                                | Apache-2.0 (unverified)                            | v0.9.4, 2026-09-23 (security release: two SSRF paths in robots.txt and link preview, env var leak)     | JS rendering, markdown output, robots support                                               | Docker image with Chromium, 1-2 GB                                               | Official Docker/REST server                                  | Medium: recent SSRF advisories show its own egress controls are bypassable; must sit behind our SSRF-safe egress |
| Firecrawl                                        | AGPL-3.0 core (self-host)                          | Hosted free tier reported 1,000 credits per month (older sources say 500, unverified which is current) | JS rendering, markdown, crawl; anti-bot only on paid "enhanced" proxies                     | Self-host reported 8-12 GB RAM (multi-container: API, Redis, Playwright service) | docker compose                                               | High weight and AGPL if modified and exposed; hosted tier sends URLs to a third party                            |
| got-scraping                                     | MIT                                                | Reported **deprecated**; final v4.2.1; authors recommend `impit`                                       | Header/TLS-ish spoofing at HTTP level                                                       | Very light                                                                       | npm                                                          | Do not adopt; replace by impit                                                                                   |
| impit (Apify, Rust reqwest based, Node bindings) | Apache-2.0 (unverified)                            | Named as successor; release date unverified                                                            | Browser-like headers and TLS/HTTP2 fingerprint at HTTP level                                | Very light, native binary                                                        | npm with prebuilt binaries (verify musl/glibc, we use glibc) | Low-medium: verify fingerprint quality ourselves                                                                 |

### TLS-impersonating HTTP clients

| Tool                               | License          | Reported latest (seen)                                     | Defeats                               | Footprint        | Docker                                                                | Risk                                               |
| ---------------------------------- | ---------------- | ---------------------------------------------------------- | ------------------------------------- | ---------------- | --------------------------------------------------------------------- | -------------------------------------------------- |
| curl-impersonate (lexiforest fork) | MIT              | 2.0.0 based on curl 8.21.0                                 | JA3/JA4 and HTTP/2 fingerprint checks | Tiny binary      | Static build, glibc fine                                              | Low                                                |
| curl_cffi                          | MIT              | v0.16.3, 2026-09-02                                        | Same, Python                          | Tiny             | Python only                                                           | Low, but Python                                    |
| impers (lexiforest, Node binding)  | MIT (unverified) | Downloads curl-impersonate 2.0.0 on first launch; Node 18+ | Same, from Node                       | Tiny             | Needs first-run download: pre-bake in image, no runtime network fetch | Low-medium: young package (unverified maturity)    |
| node-curl-impersonate / others     | varies           | **unverified**                                             | Same                                  | Tiny             | Unknown                                                               | Prefer impers or impit; do not adopt without check |
| CycleTLS (Node, Go sidecar)        | MIT (unverified) | Release date **unverified**                                | JA3 spoof                             | Small Go process | npm ships Go binary                                                   | Medium: maintenance unverified                     |

Reality check: TLS impersonation only helps when a site rejects non-browser
handshakes. It does nothing for JS challenges or captchas.

### Challenge solvers

| Tool         | License | Status (seen)                                                                                                           | Notes                                                                                                                                                                                                                                                                                                                                          |
| ------------ | ------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FlareSolverr | MIT     | v3.5.0 reported 2026-05-26; commentary says it lags Cloudflare's 2026 stack and fails Bot Fight Mode / Pro WAF rulesets | Undetected-chromedriver behind a REST API, 500 MB-1 GB per instance, slow (seconds). Defeats only the basic JS "please wait" interstitial, unreliably. Its purpose is evading Cloudflare's challenge, so under our policy it is at most a last-resort for a _technical_ interstitial on a robots-allowed site, and not recommended (section 3) |

### Reader, proxy, archive, SaaS fallbacks

| Service                                    | License / cost                                                       | Limits (seen)                                                                                                                                                               | Notes                                                                                                                                                                                                    |
| ------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jina Reader `r.jina.ai`                    | Hosted; client-side free                                             | No key: around 20 RPM; with free key 100 RPM, 100K TPM, 10M free tokens shared across Jina APIs; paid $0.02 per 1M tokens (all reported by review sites, verify on jina.ai) | Returns markdown, renders JS on their side. Third party sees the URL. Not a way around a site's refusal: the site may still block Jina, and using it to launder a robots-disallowed URL is not allowed   |
| Wayback Machine (archive.org)              | Free, public APIs (Availability, CDX, Save Page Now)                 | CDX about 60 req/min average, 429 beyond; downtime possible                                                                                                                 | Legitimate for "what did this page say", must label output as archived with capture date (rules/41). Sites can exclude archives; honour that. Do not trigger Save Page Now on private or disallowed URLs |
| archive.ph / archive.today                 | Free, no API                                                         | No formal limits, blocks fast submitters, some sites block its crawler                                                                                                      | No official API, unstable domains, frequently used to bypass paywalls. Not recommended                                                                                                                   |
| Google cache                               | Removed by Google (2024)                                             | n/a                                                                                                                                                                         | Dead. Do not plan on it (removal date from memory, unverified)                                                                                                                                           |
| ScrapingBee / ScraperAPI / Scrape.do style | Commercial, free trial or small free credit (amounts **unverified**) | Trial credits only                                                                                                                                                          | Their value is rotating residential proxies plus solving, which is evasion of blocks. Also sends every URL to a third party. Not recommended as default                                                  |
| Free proxy lists                           | n/a                                                                  | n/a                                                                                                                                                                         | Untrusted, MITM and logging risk, dead within hours. Never                                                                                                                                               |
| Tor                                        | Free                                                                 | Slow, exit nodes widely blocked, abuse-prone                                                                                                                                | Not recommended: poor success rate, reputational and abuse risk, also would bypass our egress SSRF assumptions                                                                                           |
| Commercial proxy free tiers                | Various, **unverified**                                              | Small data caps                                                                                                                                                             | Only if a paid egress decision is made later                                                                                                                                                             |

### API-first and structured extraction (cheapest, most legitimate)

| Approach                                                                                    | Cost       | Notes                                                          |
| ------------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| RSS / Atom feeds, `<link rel=alternate>`                                                    | Free       | Fetch first when present; often blocks nothing                 |
| `sitemap.xml` (and robots `Sitemap:` lines)                                                 | Free       | Discovery for crawl mode without following every link          |
| oEmbed / OpenGraph / JSON-LD / `schema.org`                                                 | Free       | Title, author, date, summary without rendering                 |
| Official site APIs (Wikipedia REST, HN, Reddit API with key, GitHub, arXiv, Crossref, etc.) | Free tiers | Always prefer over scraping the HTML                           |
| `Accept: text/markdown` / `llms.txt`                                                        | Free       | Some sites serve agent-friendly versions (adoption unverified) |

### Readability / main-content extraction

| Tool                                       | License            | Status                       | Notes                                                                                  |
| ------------------------------------------ | ------------------ | ---------------------------- | -------------------------------------------------------------------------------------- |
| @mozilla/readability (+ jsdom or linkedom) | Apache-2.0         | Maintained (date unverified) | Best JS option; already the natural choice in Node. jsdom is heavy, linkedom lighter   |
| trafilatura (Python)                       | Apache-2.0 (v1.x+) | Maintained (date unverified) | Best extraction quality in benchmarks, but Python; sidecar only if quality gap matters |
| Turndown / html-to-text                    | MIT                | Stable                       | Markdown conversion after Readability                                                  |

## 2. Ranked comparison (fit for our chain)

Score = value for a NestJS/Node service in node:26-bookworm-slim, weighted by
legitimacy, footprint, licence safety and maintenance.

| Rank | Tool                                                     | Tier              | Why it ranks here                                                                   |
| ---- | -------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| 1    | Plain `fetch`/undici + RSS/sitemap/JSON-LD/official APIs | 1                 | Zero cost, zero risk, resolves a large share of pages                               |
| 2    | @mozilla/readability (+ linkedom/jsdom)                  | all               | Turns any tier's HTML into clean text; already Node                                 |
| 3    | Playwright (existing)                                    | 3                 | Already integrated; handles JS-only pages honestly                                  |
| 4    | impers or impit (or lexiforest curl-impersonate binary)  | 2                 | Fixes handshake-fingerprint rejections cheaply, Node-friendly                       |
| 5    | Patchright                                               | 3 (optional swap) | Playwright-compatible drop-in; only if headless detection is a proven failure cause |
| 6    | Wayback Availability/CDX API                             | 4                 | Free, official, honest "archived copy" fallback                                     |
| 7    | Jina Reader                                              | 4                 | Cheap rendering fallback; privacy and dependency trade-off, opt-in                  |
| 8    | Crawlee (as a library)                                   | orchestration     | Good queue/retry/session code, but overlaps ours; adopt only if it deletes code     |
| 9    | Crawl4AI (self-hosted sidecar)                           | 3 alt             | Markdown-ready, but Python, heavy, and had SSRF advisories on 2026-09-23            |
| 10   | Firecrawl self-host                                      | 3 alt             | Heavy (8-12 GB reported), AGPL; hosted free tier sends URLs out                     |
| 11   | Camoufox                                                 | 3 alt             | Strong fingerprint work, but Python sidecar and maintenance risk                    |
| 12   | Scrapling                                                | 2-3 alt           | Interesting but Python and evasion-oriented                                         |
| 13   | zendriver / nodriver                                     | 3 alt             | Python, AGPL question                                                               |
| 14   | FlareSolverr                                             | -                 | Weak against current Cloudflare, evasion purpose                                    |
| 15   | Browserless                                              | -                 | SSPL / commercial licence problem                                                   |
| 16   | got-scraping, rebrowser-patches                          | -                 | Deprecated / abandoned                                                              |
| 17   | archive.ph, Tor, free proxies, paid unblocker APIs       | -                 | See Not recommended                                                                 |

## 3. Recommendation

### Recommended to register (ordered by escalation tier)

1. **Tier 0, API-first discovery**: RSS/Atom, sitemap, JSON-LD/OpenGraph/oEmbed,
   known official APIs. Try before any page fetch.
2. **Tier 1, cheap HTTP**: Node `fetch`/undici with an honest, identifiable
   User-Agent, conditional requests, per-host rate limit, robots check,
   SSRF-checked redirects.
3. **Tier 2, TLS-impersonating HTTP**: `impers` or `impit` (pick one after a
   small in-repo fingerprint test; both need the binary baked into the image,
   glibc build). Trigger only on connection resets, 403 with no challenge body,
   or a handshake-specific rejection. Keep the same identifiable-bot
   User-Agent policy decision explicit: impersonating a browser fingerprint
   while declaring a bot UA is inconsistent, so the policy owner must choose
   (recommended: keep honest UA, use tier 2 only for handshake compatibility).
4. **Tier 3, headless browser**: existing Playwright first. Patchright as an
   optional drop-in later, gated behind a config flag and only if measured
   headless-detection failures justify it. Trigger on empty/skeleton DOM (JS
   required).
5. **Tier 4, archive / reader fallback**: Wayback Availability + CDX
   (label output "archived <date>", never present as live), then Jina Reader
   as an opt-in setting with a privacy note. Trigger on 404/410/5xx or
   persistent technical failure, never on a refusal.
6. **Cross-tier extraction**: `@mozilla/readability` + Turndown.
7. **Optional orchestration**: Crawlee as a library only if it replaces our own
   queue/retry/session code.

### Not recommended

| Tool                                                    | Reason                                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| FlareSolverr                                            | Reported to fail current Cloudflare protections; exists to evade challenges; 500 MB+ per instance          |
| Camoufox / Scrapling / zendriver / nodriver             | Python sidecars, evasion-first design, maintenance or licence questions; revisit only with a measured need |
| rebrowser-patches                                       | Abandoned since Sep 2024                                                                                   |
| got-scraping                                            | Deprecated by its authors, use impit                                                                       |
| Browserless                                             | SSPL or paid commercial licence for closed-source use                                                      |
| Firecrawl self-host, Crawl4AI                           | Too heavy or Python; Crawl4AI had SSRF bypasses fixed 2026-09-23. Acceptable only as isolated experiments  |
| archive.ph                                              | No API, unstable, mostly used to bypass paywalls                                                           |
| Google cache                                            | Gone                                                                                                       |
| Tor, free proxy lists                                   | Unreliable, abuse and MITM risk, breaks egress trust model                                                 |
| ScrapingBee / ScraperAPI / residential-proxy unblockers | Sell block evasion; leak URLs to a third party; costs beyond trial                                         |
| Captcha-solving services or AI solvers                  | Out of policy (section 4)                                                                                  |

## 4. What cannot be legitimately defeated

The chain must **stop and report**, with the specific reason, and not evade:

- **Explicit robots.txt disallow** for our agent or `*`. Report "blocked by
  robots.txt". Do not retry through a different tier, a reader, a proxy or an
  archive of a URL the site disallows for crawlers, without policy sign-off.
  (Wayback of a page that was already archived is a third party's independent
  copy, but still label it and respect any owner exclusion.)
- **Captchas** (reCAPTCHA, hCaptcha, Turnstile interactive). Return
  "captcha challenge, not attempted".
- **Auth walls and login-only content**. No credential stuffing, no using a
  user's cookies without their explicit per-run consent, no scraping of
  private data.
- **Paywalls**. Do not bypass with archive services, cookie clearing or
  crafted referrers. Report "paywalled" and use the publicly available
  abstract/metadata only.
- **Explicit AI-crawler blocks and Cloudflare "block AI bots" defaults**.
  Cloudflare blocks AI crawlers by default for new zones (announced July 2025),
  and offers pay-per-crawl (HTTP 402, minimum reported $0.001 per crawl).
  A 402 means "payment required": report it, do not route around it. Cloudflare's
  Content Signals Policy adds `Content-Signal:` lines to robots.txt (for example
  search yes, AI training no). Google's Mueller reportedly says it has no effect
  on Google, but for us it is a stated site preference: honour it in research
  mode and record it in the evidence.
- **Rate limit (429 / Retry-After)**. Honour Retry-After, back off, cap retries
  (no infinite polling per the repo's rules). Rotating IPs to dodge a limit is
  evasion.
- **Terms-of-service prohibitions.** hiQ v. LinkedIn: the Ninth Circuit held
  scraping public pages likely is not a CFAA violation, but the case ended in
  2022 with a consent judgment: hiQ was found to breach LinkedIn's user
  agreement, paid $500,000, deleted data. So "public" does not mean "permitted":
  ToS, contract, GDPR/CCPA (personal data), copyright and database rights
  remain. This is general information, not legal advice; counsel should review
  before any commercial crawl product.
- **Personal data (GDPR).** Do not collect or retain personal data beyond what
  a research answer needs; no profiling.

## 5. Mapping recommended tools to escalation tiers

| Tier | Trigger (technical only)                                                       | Tool                                   | Stop conditions                                                           |
| ---- | ------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| 0    | Any URL                                                                        | RSS, sitemap, JSON-LD, official API    | robots disallow                                                           |
| 1    | Default                                                                        | undici fetch, honest UA                | robots disallow, captcha page, login wall, 402, 429 with long Retry-After |
| 2    | Connection reset, TLS or HTTP/2 handshake error, generic 403 with no challenge | impers / impit                         | Cloudflare/Turnstile interactive challenge detected, robots               |
| 3    | Body is JS shell (low text-to-markup ratio, `noscript` only)                   | Playwright (Patchright optional)       | Challenge page or captcha detected: stop, do not solve                    |
| 4    | 404/410/5xx, or persistent technical failure of 1-3                            | Wayback API, then Jina Reader (opt-in) | Robots disallowed URL, paywall, login; label archive/reader provenance    |
| all  | Any HTML obtained                                                              | Readability + Turndown                 | n/a                                                                       |

Operational notes: keep one browser pool with hard concurrency and memory
caps; per-host token bucket shared by all tiers; every tier records
`{tier, tool, status, blockedReason}` for the narrated work log (rules/50); the
final report must state which tier produced each source and any tier that
stopped on a policy boundary.

## 6. Unverified or to confirm before building

- Licences marked "unverified" (Patchright, Camoufox, zendriver, Scrapling,
  Crawl4AI, impers, impit, Crawlee, Readability, trafilatura).
- impit and impers release dates, glibc prebuilt binaries, Node 26 compatibility.
- CycleTLS and node-curl-impersonate maintenance.
- Playwright current version and Patchright's tracked Playwright version.
- Firecrawl free tier: 500 vs 1,000 credits.
- Jina Reader current limits (from review sites, not jina.ai).
- Google cache removal date.
- Commercial "unblocker" free-credit amounts.
- Real success rates: all block-class claims come from third-party
  benchmarks (for example anti-detect benchmark blogs of 2026); run our own
  test set from the Docker image before adopting any tier 2 or 3 change.

## Sources seen (2026-09-24)

- https://ianlpaterson.com/blog/anti-detect-browser-benchmark-patchright-nodriver-curl-cffi/
- https://scrapewise.ai/blogs/playwright-stealth-2026
- https://botcloud.dev/blog/flaresolverr-alternatives-cloudflare-compatibility-2026/
- https://github.com/FlareSolverr/FlareSolverr/releases
- https://github.com/unclecode/crawl4ai/releases
- https://github.com/lexiforest/curl_cffi/releases
- https://github.com/lexiforest/impers
- https://crawlee.dev/js/api/core/changelog
- https://github.com/D4Vinci/Scrapling/releases
- https://github.com/apify/got-scraping/releases
- https://github.com/browserless/browserless/blob/main/LICENSE
- https://jina.ai/reader/
- https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/
- https://www.bigiron.cc/guides/wayback-machine-apis-cdx-save-page-now-and-availability
- https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/
- https://www.seroundtable.com/google-cloudflare-content-signals-41631.html
- https://dev.to/beton/firecrawl-pricing-teardown-2026-2eh8
