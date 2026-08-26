# Multilingual discovery: SEO, sitemaps and RSS

ClawAI exposes human-facing routes under a canonical locale prefix while
keeping framework, API and provider-callback routes locale-neutral. Supported
URL locales are `en`, `ar`, `de`, `es`, `fr`, `hi`, `it`, `pt`, `ru`, `ja`,
`th`, `fa`, and `zh`.

`zh` maps to `zh-Hans` in HTML and hreflang metadata. Arabic and Persian render
RTL. Middleware validates the first segment and stamps `x-claw-locale`; the
server layout uses that value for first-response `lang` and `dir`. Preferences
and local storage never override a locale already present in the URL.

## Route contract

- Human pages: `/{locale}/...`
- Public shares: `/{contentLocale}/share/chat/{publicShareId}`
- Sitemap index: `/sitemap.xml`
- Child sitemaps: `/sitemaps/{locale}/pages-{chunk}.xml` and
  `/sitemaps/{locale}/chats-{chunk}.xml`
- Per-locale RSS: `/{locale}/feed.xml`, `/{locale}/feeds/topics.xml`, and
  `/{locale}/feeds/chats.xml`
- Global RSS: `/rss.xml`
- Locale-neutral: `/api/*`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/*`,
  `/rss.xml`, icons, the web manifest, and externally configured callbacks

Legacy GET/HEAD navigation is permanently redirected to English with the path
and query intact. API calls, mutations and callbacks do not pass through locale
redirects. Canonical URLs come only from validated `SITE_URL`, never request
host headers.

## Publication and indexing

`PUBLIC_CONTENT_DEFINITIONS` is the discovery source of truth. A logical page
owns a `locales` map. A localized URL is indexable only when:

1. the logical page is `PUBLISHED`;
2. localized metadata exists;
3. its review status is `REVIEWED`; and
4. its indexability is `INDEXABLE`.

English fallback text never makes an untranslated locale indexable. The
metadata builder emits canonicals, reviewed-only reciprocal language
alternates, `x-default`, Open Graph locales, Twitter metadata and fail-closed
robots directives from the same registry.

Chat indexing is independent of advertising. Discovery requires an active,
approved `PUBLIC_INDEXED` snapshot with `indexEligible=true`; `adsEligible`
does not participate in the sitemap/RSS query. `PUBLIC_UNLISTED`, rejected,
revoked and deleted snapshots never appear. A share appears only under its
stored `contentLocale`.

## The two kinds of feed

The per-locale feeds take their language from the `x-claw-locale` header the
middleware stamps, so `/feed.xml` answers "what is new in this language". A
reader who subscribes to one of them receives exactly one of the thirteen and
never learns the others exist.

`/rss.xml` is the opposite trade and exists for the crawler rather than the
reader: one fixed URL, no negotiation, every indexable registry page in every
locale plus every public chat share, newest first. Because RSS 2.0 carries a
single `<language>` per channel, each item declares its own through Dublin Core
(`xmlns:dc`, `<dc:language>`) — the channel value names the default locale only.
It is capped at `RSS_GLOBAL_MAX_ITEMS`, set above today's ceiling (13 locales ×
16 pages, plus 100 chats per locale) so nothing is dropped now and an unbounded
document is impossible later.

Both are advertised from every public page's metadata as
`alternates.types['application/rss+xml']`, so a crawler landing on any single
localized page can reach the global feed.

One locale's chat feed failing degrades `/rss.xml` rather than emptying it: the
other twelve locales and every registry page still ship, and the response
carries `X-Claw-Discovery-Degraded: chat-feed-unavailable` with the short CDN
TTL.

## Reading the documents in a browser

Chrome 151 removed the built-in XML pretty-printer, so a sitemap or feed opened
in the address bar renders as one run-together wall of text — valid XML that
reads as a corrupt file. Every discovery document therefore carries
`<?xml-stylesheet type="text/xsl" href="/discovery.xsl"?>`, and `/discovery.xsl`
renders `sitemapindex`, `urlset` and `rss` as a table. Parsers ignore the
instruction, so nothing changes for a crawler; Google explicitly supports styled
sitemaps.

The feeds need one more step: Chrome shows any `application/rss+xml` response as
source and never applies a stylesheet to it. Feed responses therefore pick their
content type from `Accept` — `application/rss+xml` for a reader,
`application/xml` for a browser navigation — and carry `Vary: Accept` so a
shared cache cannot hand one the other's answer. The bytes are identical.

`/sitemap.xml` is an index, not a page list: it points at
`/sitemaps/{locale}/pages-{chunk}.xml` and `/sitemaps/{locale}/chats-{chunk}.xml`,
and those children hold the actual URLs. That is the sitemap protocol's own
structure for multi-section sites, and it is what keeps each document inside
Google's 50,000-URL limit.

## What "readable by Google" is held to

`sitemap-google-readability.test.ts` asserts the rules Google applies when it
reads a sitemap, against the generated documents rather than a description of
them:

- the sitemap protocol namespace on both document kinds;
- an index that points only at url sets, never at another index;
- absolute URLs, all on the sitemap's own host;
- `lastmod` as a W3C datetime;
- every hreflang cluster carrying a self-reference and an `x-default`;
- no URL that `robots.txt` disallows;
- 50,000 URLs and 50 MB per document as hard ceilings;
- `404` for an unknown locale or document, and for a chunk past the end, never
  an empty but successful urlset — the index can point at a chunk that has since
  shrunk away, so an out-of-range request is reachable in production and must
  read as "gone", not as "healthy and empty";
- the chat half held to the same rules as the pages half, not assumed to inherit
  them.

## Scale and privacy

Chat sitemap pagination uses an opaque keyset cursor containing `updatedAt` and
the stable row id. Child sitemap chunks are capped at 40,000 URLs, and the index
derives the chunk list for both halves from live counts — the page half is not
assumed to fit in one document. RSS requests
are capped at 100 current items and expose only title, sanitized description,
public share id, locale and publication timestamps. Transcripts, owner ids,
thread ids, private message ids, tokens, costs and internal metadata never
enter a feed.

Public share HTML/API remains `no-store`; revocation therefore stops page
access immediately. Discovery XML uses a short CDN TTL. A stale sitemap entry
may remain discoverable for at most its cache window, but it cannot make a
revoked conversation resolve.

If chat discovery is unavailable:

- static page sitemaps and topic RSS continue normally;
- chat-only RSS returns `503`, `Retry-After: 30`, and `Cache-Control: no-store`;
- combined RSS temporarily omits chats, uses a 30-second CDN TTL, and returns
  `X-Claw-Discovery-Degraded: chat-feed-unavailable`.

## Deployment configuration

Frontend server runtime:

- `SITE_URL`: canonical HTTPS bare origin; unset/invalid/preview means global
  noindex.
- `CHAT_SERVICE_URL`: private chat-service origin used only by server code.
- `INTER_SERVICE_AUTH_TOKEN`: service credential for protected internal
  sitemap/count/RSS endpoints.

Chat service:

- `PUBLIC_SITE_URL`: canonical public origin used for share URLs.
- `INTER_SERVICE_AUTH_TOKEN`: must match the frontend/server caller.

Do not expose either internal variable with a `NEXT_PUBLIC_` prefix. Rotate the
service token by updating callers and the chat service in one deployment.

## Incident: a chat was indexed accidentally

1. Revoke the share immediately. Confirm the public URL returns the uniform
   404 and `Cache-Control: no-store`.
2. Confirm it is absent from internal sitemap and RSS results using its locale,
   without logging the public id or content.
3. Purge discovery CDN paths when supported; otherwise wait no longer than the
   documented sitemap/RSS TTL.
4. Submit the canonical URL through the search provider's temporary-removal
   tool, then request recrawl of `/sitemap.xml`.
5. Rotate any exposed credential and follow the security incident process if
   the snapshot contained secret or personal data.
6. Preserve only non-content audit evidence: timestamps, share database id,
   state transitions and remediation actions.

## Verification

Run frontend typecheck, lint, Vitest and production build gates. Validate XML
routes with crawler tests and inspect a first server response for `lang`, `dir`,
canonical, hreflang and robots. Preview deployments must emit `Disallow: /`.
Rebuild generated knowledge and inventory after route, documentation or test
changes.
