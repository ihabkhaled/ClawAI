# 2026-10-31: Threads list page rebuilt (frontend)

- `/threads` now shows status per row (Generating, Ready, Published, Failed with reason), Publish and Delete actions, debounced search, a status filter and pagination (10 per page), all in the URL (`?q=&status=&page=`).
- New: `thread-list-*` components, `use-thread-list*` hooks, `thread-list-*` utilities, types, constants, enums, `thread-list-translations.ts` (13 locales).
- Changed: `threadPublicationsRepository.listMinePage`; `src/app/(portal)/threads/page.tsx` and its test.
- Removed from the list: the pending-suggestions badge (not in the paged contract).
- Needs the backend `GET /thread-publications/mine/page` (ADR-205). Strings are not yet merged into the locale files.
- Docs: [ADR-206](../13-adr/adr-206-my-threads-page-actions-search-and-pagination.md), [threads-my-list.md](../05-frontend/threads-my-list.md).
