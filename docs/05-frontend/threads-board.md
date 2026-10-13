# Threads Board (frontend)

Routes `/board` and `/board/[slug]` in the portal group. Backend contract and projection: [ADR-177](../13-adr/adr-177-threads-board-search-is-a-postgres-projection.md). Surface decision: [ADR-178](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md).

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
