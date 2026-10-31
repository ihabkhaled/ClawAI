# ADR-206: My Threads page: row actions, search, status filter and pagination

**Status:** Accepted

**Date:** 2026-10-31

Builds on [ADR-205](adr-205-my-threads-list-is-paged-searchable-and-reports-failures.md) (the paged service endpoint) and [ADR-178](adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md). Rules: [rule 03](../../rules/03-frontend-rules.md), [rule 06](../../rules/06-frontend-queries-and-cache.md), [rule 20](../../rules/20-i18n-and-user-facing-messages.md).

## Context

`/threads` listed every Thread as a title and a date. An owner could not tell a failed Thread from a finished one, could not publish or delete without opening each Thread, and could not find one among many.

## Decision

- The page reads `GET /thread-publications/mine/page?page&pageSize&q&status` (`threadPublicationsRepository.listMinePage`). Response types live in `src/types/thread-list.types.ts`, not in shared-types.
- The URL is the state: `?q=&status=&page=`, parsed and built by `thread-list-url-state.utility.ts`. Paging and filter changes push a history entry (Back works); typing replaces. Defaults are left out of the address.
- Page size is fixed at 10. The shared `Pagination` (Previous/Next, numbers with ellipsis, "Showing a-b of N") is reused with `hidePageSize`.
- The query uses `keepPreviousData`, so rows do not flash while paging; the skeleton shows on the first load only; a failed refresh keeps the old rows.
- Each row shows a state: Generating chip, Ready chip, Published chip with a link to `/board/<slug>`, or a failure icon with the reason. The reason is the existing `failure.code` mapped by `resolveThreadFailureKeys`; provider text never reaches the row. "You can retry it." is added when `failure.retryable`.
- Publish uses the existing publish endpoint with no confirm (it is reversible by Unpublish and the review page has none). On success the row is rewritten to Published in the cache and the list is invalidated; errors show under that row.
- Delete reuses `ThreadGenerationDeleteDialog` behind a list-specific controller. Deleting the last row of a page after the first moves to the previous page.
- Search is debounced 300 ms, keeps focus, has a clear button and a "no results for X" state.
- Strings live in `src/lib/i18n/locales/thread-list-translations.ts` (13 locales, `threadList*`), read through `useThreadListText`. They are not yet spread into the locale files, which another change owned at the time. Folding them into `chat` is a follow-up.

## Consequences

- The "pending suggestions" badge on the old rows is gone: the paged contract does not carry `pendingChangeRequests`. Suggestions stay reachable from "My suggestions" and the review page.
- Two translation paths exist for this page until the strings are merged into the locale files.
