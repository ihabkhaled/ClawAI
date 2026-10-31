# Change - "My Threads" list backend: paged, searchable, filterable, with failures

Date: 2026-10-31. Decision: [ADR-205](../13-adr/adr-205-my-threads-list-is-paged-searchable-and-reports-failures.md).

## Why

`GET thread-publications/mine` is capped at 50 rows with no search, filter or failure reason. The owner's list page needs paging, title search, a status filter with a correct total, and the reason a Thread failed.

## What changed

- threads-service: new `GET /api/v1/thread-publications/mine/page?page&pageSize&q&status` (owner only, standard 400 on bad input). Response `{ items, page, pageSize, total, totalPages }`, newest first; item fields `id, title, slug, createdAt, updatedAt, status, publishedAt, failure, canPublish, canDelete, publicationStatus`. The old `mine` endpoint is untouched.
- Migration `20261031090000_threads_generation_state` (additive): `generation_state` plus failure code, step, retryable and checked-at on `thread_publications`. Existing rows stay NULL and are read lazily on the owner's first list (bounded, never fatal). `attachRetryJob` resets the state.
- `PUBLISHABLE_REVISION_WHERE` is now shared by the publish write and the list's `canPublish`.
- No new env var, event, queue, nginx or i18n change.

## Rollback

Revert the code; the new columns are nullable and unused. Do not drop them in a hurry (a later deploy may use them).

## Not done

An event-driven state update (the list heals on read, up to 30 s late). Title search does not match the derived text of a placeholder "Untitled draft" title. Live check of a currently GENERATING row was not possible without spending a real generation (covered by unit tests).
