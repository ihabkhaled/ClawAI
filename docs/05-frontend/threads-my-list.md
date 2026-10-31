# My Threads list (`/threads`)

Decision: [ADR-206](../13-adr/adr-206-my-threads-page-actions-search-and-pagination.md). Service side: [ADR-205](../13-adr/adr-205-my-threads-list-is-paged-searchable-and-reports-failures.md).

## Pieces

| Piece                                         | File                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Page (title, My suggestions, Create a Thread) | `src/app/(portal)/threads/page.tsx`                                                                                   |
| List view, toolbar, rows, states              | `src/components/threads/thread-list-*.tsx`                                                                            |
| Controller hook                               | `src/hooks/threads/use-thread-list.ts` (url state, query, search, publish, delete)                                    |
| URL state                                     | `thread-list-url-state.utility.ts`: `?q=&status=&page=`                                                               |
| Types, constants, enums                       | `thread-list.types.ts`, `thread-list.constants.ts`, `thread-list-status.enum.ts`, `thread-list-navigate-mode.enum.ts` |
| Strings                                       | `src/lib/i18n/locales/thread-list-translations.ts` via `useThreadListText`                                            |
| Repository                                    | `threadPublicationsRepository.listMinePage`                                                                           |

## Behaviour

- Query key `['thread-publications','mine','page',q,status,page]`, so any other publish or delete that invalidates `['thread-publications','mine']` refreshes the list.
- Row state: GENERATING chip; READY chip plus Publish when `canPublish`; PUBLISHED chip plus link to `/board/<slug>`; FAILED icon plus the reason from `failure.code` (`resolveThreadFailureKeys`) and a retry hint when `failure.retryable`.
- Delete shows when `canDelete`; confirm dialog is `ThreadGenerationDeleteDialog`.
- Layout: rows stack on a phone, actions wrap, no fixed heights; the document never scrolls (rule 62).

## Testing it without the service

Intercept `**/thread-publications/mine/page**` and answer `{ items, page, pageSize, total, totalPages }` (see the contract in ADR-206).
