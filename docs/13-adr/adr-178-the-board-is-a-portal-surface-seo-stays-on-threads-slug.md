# ADR-178: The Board is a portal surface; SEO stays on /threads/[slug]

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-177](adr-177-threads-board-search-is-a-postgres-projection.md) and [ADR-159](adr-159-clawai-threads-two-service-architecture.md). Rules: [rule 38](../../rules/38-adsense-eligibility-and-low-value-content.md), [rule 03](../../rules/03-frontend-rules.md).

## Context

The public Thread page is the indexable, canonical surface. A second list of the same content must not compete with it in search or look like thin content to AdSense review. Signed-in users still need a place to browse, search, read and react.

## Decision

- Routes `/board` and `/board/[slug]` live in the `(portal)` route group, behind login, with `noindex`. The member Board is not linked from marketing pages and not in the sitemap (a separate public, read-only Board is added by the 2026-10-14 addendum below). The canonical URL of every Thread stays `/threads/[slug]`; `/board/[slug]` offers "Open public page" and "Copy link" pointing there.
- The URL is the single state: `?q=&sort=&lang=&type=&page=`. Query keys start with `thread-board`.
- Cards carry no author name or avatar (privacy). Publishing does not redirect to the Board.
- Default language filter is the UI locale, with an "All languages" option.
- Sidebar entry "Board" is a sibling of Threads.
- All strings are `chat.threadBoard*` keys in 13 locales, defined in one translation file.

## Consequences

- No SEO or AdSense exposure from the member Board; the public Thread page keeps all ranking signals (the public guest Board is covered by the addendum below).
- Authorship can be added later as an explicit opt-in without changing the contract shape; today the API has no field for it.
- Reactions and comments on `/board/[slug]` reuse the existing public reader components and endpoints.

## Addendum 2026-10-14: Board UI round-2 fixes

- Every Board URL change (filter, sort, language, type, page, submitted search) now uses `router.push`, so browser Back restores the previous view. The search box commits only on submit, never per keystroke.
- `BoardPageView` remembers its exact URL (`rememberBoardListUrl`); the reader's "Back to Board" and breadcrumb return to it. `readBoardListUrl` accepts locale-prefixed paths (`/en/board?...`).
- Placeholders follow the resolver's `{name}` convention: card `{minutes}`, reader sources `{count}`, empty search `{query}`. A test renders the card, empty, error and suggestion states in all 13 locales and fails on any leftover brace.
- A 429 on the list shows a wait state (`threadBoardRateLimit*`) with the Retry-After seconds and is not auto-retried.
- Suggestions use the board's `lang` filter, not the UI locale. Typos with no server ranges get a client-side highlight of the closest word (`thread-board-fuzzy-highlight.utility.ts`). Suggestion rows show the translated type; "Show all results" carries the count.
- Client limits match the API: page max 500, query max 100 characters, control characters stripped (`q=%00` is an empty query).
- The reader has the share icon row (reused platform links and icons) and no nested `<main>`.
- Not done here: the empty "Post comment" feedback lives in the shared `thread-public-community.tsx`, and long source URLs on the owner "ready" page are outside the Board scope.

## Addendum 2026-10-14: a public, read-only Board for guests

**Supersedes** the Decision bullet "behind login ... not linked from marketing pages and not in the sitemap" and the consequence "No SEO or AdSense exposure from the Board". Owner requirement: guests must find, in the marketing site and without logging in, a clear module that lists every public Thread.

- **Two Boards, one contract.** The in-app Board (`/board`, `/board/[slug]`) is unchanged: portal group, behind login, `noindex`, private in `robots.txt`, not in the sitemap. A second, public Board lives at **`/threads/board`** in the `(marketing)` group (locale-prefixed like every marketing page). It is indexable, in the sitemap with hreflang for all 13 locales, linked from the marketing navigation and footer and from `/threads/discover`.
- **Same search, read-only.** The public Board has the same smart search (typo tolerance, the suggestions panel of about ten nearest results with a "show all N results" row, did-you-mean), filters (language, type), sorts and pagination, and the same cards with like, comment and suggestion counts. It lists only published, owner-approved, safety-approved, index-eligible Threads (the same set as the sitemap). A card opens the Thread at its canonical `/threads/<slug>` page.
- **Guests cannot act.** Like, comment, request a change, report-with-account and bookmark each show a friendly "Sign in to ..." prompt with a link to login or register. The page carries no owner id, author id, hash, safety data or viewer-specific field. Existing comments and counts are visible.
- **Canonical stays `/threads/<slug>`.** The public Board is a listing, not a second copy of the content, so it does not compete with the Thread pages. It carries real introductory copy (`chat.threadPublicBoardIntro` in 13 locales), a `CollectionPage` + `ItemList` JSON-LD for its first page of Threads, a self-canonical and OpenGraph/Twitter metadata, and is ad-ineligible in the content registry (rule 38).
- **Slug collision.** `board` is a static segment next to `discover`. A Thread slug always ends in a short unique part (`derivePublicationSlug`), so no Thread can be named exactly `board` and shadowed.
- **Where it lives in code.** Registry entry `threads/board` in `content-registry.constants.ts`; SEO copy derived from `thread-public-board-translations.ts` by `threads-public-board-seo.constants.ts`; `buildPublicBoardJsonLd` in `structured-data.utility.ts`; Lighthouse and responsive-audit URL lists. Details: [seo-content-architecture](../05-frontend/seo-content-architecture.md) and [threads-board](../05-frontend/threads-board.md).

**Consequences.** The Board now has SEO and AdSense exposure, which is why the page needs the intro copy and why the member Board stays `noindex` (two indexable lists of the same Threads would compete). A takedown (revoke) removes a Thread from the public Board, the sitemap and the Thread page together because all three read the same eligibility.
