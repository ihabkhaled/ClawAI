# Threads Board (frontend)

Routes `/board` and `/board/[slug]` in the portal group (signed-in, `noindex`). A public, read-only twin for guests lives at `/threads/board` in the marketing group; see [Public board](#public-board-guests). Backend contract and projection: [ADR-177](../13-adr/adr-177-threads-board-search-is-a-postgres-projection.md). Surface decision: [ADR-178](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md).

## State

The URL is the single source of state: `?q=&sort=&lang=&type=&page=`. `useBoardQueryState` returns the parsed state and setters (`setQuery`, `setSort`, `setLanguage`, `setType`, `setPage`, `clearFilters`, `hasActiveFilters`). Changing q, sort, lang or type resets the page to 1. Defaults are omitted from the URL; the language default is the UI locale, with "All languages" as an option.

## Data

`useBoardList(state)` calls the board list endpoint; `useBoardSuggest(rawQuery)` calls suggest after a 200 ms debounce from 2 characters and keeps the previous result while typing. Query keys start with `thread-board`.

## Search box

`BoardSearchCombobox` is an ARIA combobox driven by `useComboboxKeyboard`: arrow keys move, Enter opens the active suggestion or submits the query, Escape closes. Rows use `HighlightedText` with server offsets (text nodes only). "Show all N results" uses `total` and `totalCapped` ("100+"). `BoardDidYouMean` offers the corrected phrase.

## Layout

`BoardPageView` composes toolbar, filters (a sheet on small screens), grid, skeleton, empty, error and pagination. Logical spacing for RTL; 44px touch targets. Cards show title, excerpt, type, language, reading minutes, sources, likes, comments, views. No author.

## Strings

Keys `chat.threadBoard<Name>` in 13 locales, defined in `src/lib/i18n/locales/thread-board-translations.ts`: navigation label, title, search, suggestions, sort, filters, results count, empty, error, pagination, reader actions.

## Status

Code in progress; not verified in a browser. See the [QA evidence record](../qa-evidence/2026-10-14-threads-board.md).

## Public board (guests)

`/threads/board` (marketing group, indexable, in the sitemap, linked from the marketing navigation and footer) lets a visitor without an account browse **all** public Threads: published, owner-approved, safety-approved and index-eligible. It reuses the Board search, filters, sorts, pagination and cards; opening a card goes to the canonical `/threads/<slug>` page.

- **Read-only.** Guests see like, comment and suggestion counts and existing comments. Like, comment, request a change and report-with-account each show a "Sign in to ..." prompt linking to login or register (Threads has no bookmark action yet, so there is no bookmark prompt). The page never carries ownerId, authorId, hashes, safety data or any viewer-specific field.
- **SEO.** Registry slug `threads/board`, 13 locales with hreflang, `CollectionPage` + `ItemList` JSON-LD for the first page (`buildPublicBoardJsonLd`), self-canonical, OpenGraph and Twitter. The member `/board` stays `noindex`, disallowed in `robots.txt` and out of the sitemap. Details: [seo-content-architecture §10](seo-content-architecture.md#10-public-threads-board-2026-10-14) and the [ADR-178 addendum](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md).
- **Strings.** Search, filters, cards and states reuse `chat.threadBoard*`. The page-only strings (`chat.threadPublicBoardTitle`, `...Intro`, `...Cta`, `...SeoTitle`, `...SeoDescription`) are in `src/lib/i18n/locales/thread-public-board-translations.ts`, 13 locales.

### Guest mode in the frontend

One set of Board components serves both audiences. `BoardModeContext` (`lib/threads/board-mode-context.ts`, `ThreadBoardMode.Member | Guest`, default Member) is read by `useBoardMode`; the portal needs no provider, the marketing page wraps the Board in `GuestBoardPageView` (mode Guest).

- **Page.** `app/(marketing)/threads/board/page.tsx` parses `?q &sort &lang &type &page`, fetches the first page on the server (`lib/threads/public-board-api.ts`: `GET /api/v1/thread-publications/public/board`, `next: { revalidate: 60 }`, 5 s timeout, `null` on any failure) and passes it as `initial` to the client Board, so the first page is real HTML for crawlers. The client query is seeded from it only while the URL still equals the server state (`isSameBoardState`); a failed server fetch makes the client load the page itself and show its own error state, never "no Threads". Metadata is `threads/board` from the registry; any `q`, `sort`, `lang`, `type` or a `page` after the first is `noindex, follow` (`isIndexableBoardView`). JSON-LD is `buildPublicBoardJsonLd`.
- **Data.** `getThreadBoardRepository(mode)` picks `threadBoardRepository` (account Board) or `threadBoardGuestRepository` (`/public/board`, `/public/board/suggest`). Every guest response goes through `thread-board-public.utility.ts`, which copies only the public fields (slug, title, excerpt, locale, type, date, reading minutes, source/like/comment/view counts) and sets `viewerReaction` to `null`; an unreadable body is an error. Query keys are `['thread-board', mode, ...]`.
- **Guest defaults.** The language filter starts at `all` (members start at their UI locale). Cards and the suggestions panel open `/<locale>/threads/<slug>` (`boardItemHref`), never `/board`. The portal's "remember the list URL" is member-only.
- **Read-only.** `BoardGuestBanner` (top of the guest page) says reading is free and links to sign-in and sign-up with `returnTo` set to the exact Board view. On the public Thread page a guest sees the counts and comments plus `BoardGuestPrompts`: "Sign in to like / comment / request a change / report" links (the like buttons stay disabled) and a sign-up link. There is no bookmark action in Threads yet, so there is no bookmark prompt.
- **Find it.** `MARKETING_NAV_LINKS` has a "Threads board" entry with an icon (desktop header and mobile menu), the footer Resources list links it (replacing the older "Public Threads" footer link; `/threads/discover` still exists and is linked from the Threads pages), and the home page has `ThreadsBoardCtaSection` after the Threads band. The public Thread page has a "Back to all Threads" link (`ThreadPublicBackLink`).
- **Strings.** `chat.threadBoardGuest*` (15 keys, 13 locales) in `thread-board-translations.ts`; the page title, intro and SEO copy are `chat.threadPublicBoard*`.
- **Proxy.** `isPublicThreadPath` (`route-visibility.utility.ts`) marks `/<locale>/threads/<slug>` as a public route. Before, only registry pages were, so the proxy added `X-Robots-Tag: noindex` to every Thread page and overrode the page's own index directive.
- **Non-Latin slugs (2026-10-14).** A Thread slug is made of the title's words, so Arabic, Persian, Hindi, Japanese, Thai, Russian and Chinese slugs are normal. `thread-slug.utility.ts` is the one place that knows the rules: valid = Unicode letters, numbers, marks and hyphens, 1 to 64 characters (`isValidThreadSlug`); a route parameter arrives percent-encoded, so every consumer calls `decodeThreadSlugParam` (decode in try/catch, NFC) before the API call and the query keys (`/threads/[slug]` page and metadata, `useThreadPublicPage`, `useBoardReader`); every address is built with `encodeThreadSlug` (one encoded segment, dots encoded too): `threadCanonicalUrl` (canonical, hreflang, Open Graph, JSON-LD, sitemap, RSS) and `threadLocalePath`. The guest list never drops an item with an unexpected slug: it logs once (`console.warn`) and still renders the card with an encoded link, so the header count and the cards agree. The proxy's `isPublicThreadPath` decodes the segment before testing it (the proxy sees the path still encoded); before, an encoded Arabic path was treated as private and the Thread page 404ed or was mangled by the redirect. The page layout supplies the only `<main>`; the public Thread view is a `div`.
- **Backend contract this relies on (not built here).** `GET thread-publications/public/board` and `.../public/board/suggest`, the same query contract and response shape as the member routes, `@Public`, no viewer data. Owned by threads-service (`board-public.controller.ts`).
