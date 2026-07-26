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
- RSS: `/{locale}/feed.xml`, `/{locale}/feeds/topics.xml`, and
  `/{locale}/feeds/chats.xml`
- Locale-neutral: `/api/*`, `/robots.txt`, `/sitemap.xml`, `/sitemaps/*`,
  icons, the web manifest, and externally configured callbacks

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

## Scale and privacy

Chat sitemap pagination uses an opaque keyset cursor containing `updatedAt` and
the stable row id. Child sitemap chunks are capped at 40,000 URLs. RSS requests
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
