# ADR-178: The Board is a portal surface; SEO stays on /threads/[slug]

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-177](adr-177-threads-board-search-is-a-postgres-projection.md) and [ADR-159](adr-159-clawai-threads-two-service-architecture.md). Rules: [rule 38](../../rules/38-adsense-eligibility-and-low-value-content.md), [rule 03](../../rules/03-frontend-rules.md).

## Context

The public Thread page is the indexable, canonical surface. A second list of the same content must not compete with it in search or look like thin content to AdSense review. Signed-in users still need a place to browse, search, read and react.

## Decision

- Routes `/board` and `/board/[slug]` live in the `(portal)` route group, behind login, with `noindex`. The Board is not linked from marketing pages and not in the sitemap. The canonical URL of every Thread stays `/threads/[slug]`; `/board/[slug]` offers "Open public page" and "Copy link" pointing there.
- The URL is the single state: `?q=&sort=&lang=&type=&page=`. Query keys start with `thread-board`.
- Cards carry no author name or avatar (privacy). Publishing does not redirect to the Board.
- Default language filter is the UI locale, with an "All languages" option.
- Sidebar entry "Board" is a sibling of Threads.
- All strings are `chat.threadBoard*` keys in 13 locales, defined in one translation file.

## Consequences

- No SEO or AdSense exposure from the Board; the public page keeps all ranking signals.
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
