# ADR-180: Threaded comments, comment votes, mentions and community notifications

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-159](adr-159-clawai-threads-two-service-architecture.md), [ADR-164](adr-164-user-notifications-live-in-auth-service-and-are-requested-by-event.md) and [ADR-177](adr-177-threads-board-search-is-a-postgres-projection.md). Supersedes the "no author field" line of [ADR-178](adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md). Rules: [rule 02](../../rules/02-backend-rules.md), [rule 17](../../rules/17-rabbitmq-events-and-jobs.md), [rule 20](../../rules/20-i18n-and-user-facing-messages.md).

## Context

Threads comments were a flat, anonymous list. Readers could not tell who published a Thread or who wrote a comment, could not answer one comment, could not vote on comments, could not mention anyone, and owners and commenters were told nothing. Names live only in auth-service; threads-service must not read its database.

## Decision

- **Names.** Public Thread pages and Board items carry `owner { username, displayName } | null`; comments carry `author` and `replyTo` the same way. `displayName` is first + last name when set, else the username. threads-service asks auth-service over two service-token routes (`POST internal/users/public-profiles` with up to 100 ids, `GET internal/users/by-username/:username`) through a best-effort client (2 s timeout, 60 s in-memory cache bounded to 2,000 entries). A failure, a deleted or anonymised account or a non-active account is `null` and the UI shows "Member". Ids and emails are never returned.
- **Threads of comments.** `thread_publication_comments` gains `parent_id`, `root_id`, `reply_to_user_id`. Depth is unlimited in conversation but flat in storage: a reply to a reply stores the direct target as parent and the top-level comment as root. The root is derived on the server in the creating transaction; the target must be VISIBLE and in the same publication (otherwise one `404 Comment not found`). The root row is locked `FOR UPDATE` and a conversation holds at most 500 replies. `GET comments` pages top-level comments (newest first, page size at most 50) with the first three replies each; `GET comments/:rootId/replies` pages the rest by an opaque cursor.
- **Votes.** `thread_publication_comment_reactions` (unique per comment and user, cascade); `PUT/DELETE comments/:commentId/reaction` return `{ likes, dislikes, viewerReaction }` computed in the same transaction. Totals and reply counts are always computed from rows, never stored, so they cannot drift.
- **Mentions.** `@username` (the register-form rule) is parsed with a linear regex, ignoring code, at most 10 distinct, resolved through auth-service (active accounts only), never the author, stored in `thread_publication_comment_mentions` and returned as `mentions: [{ username }]`.
- **Notifications.** Six `UserNotificationKind` values: `THREAD_COMMENTED`, `THREAD_COMMENT_REPLIED`, `THREAD_MENTIONED`, `THREAD_REACTED`, `THREAD_COMMENT_REACTED`, `THREAD_CHANGE_REQUESTED`. Sent through the existing `USER_NOTIFICATION_REQUESTED` event with stable dedupe keys; never to the actor; one per person per comment (reply beats comment beats mention); a Thread reaction notifies on LIKE or a person's first reaction and has one key per actor and Thread, so toggling cannot spam. Params are `actorName`, `actorUsername`, `title`, `excerpt`. Sending is best effort and never fails the request. auth-service owns the words: email copy in all 13 locales, push text from the same copy.
- **Moderation and privacy.** A hidden or deleted top-level comment is shown only as a `[removed]` placeholder while it has visible replies; hidden comments leave every count; `replyTo` is dropped when its target is gone. Account deletion removes the person's votes and mentions, clears `reply_to_user_id` and anonymises their comments.

## Consequences

- One migration, additive (`20261014180000_threads_comment_threads`); existing comments become top-level comments. The comments list response changed from an array to `{ items, page, pageSize, total, totalPages }`, so the frontend and the API contract move together.
- An extra auth-service call per page of comments (cached, batched, optional). With auth-service down the page still works with anonymous names.
- Emails for community kinds name only the Thread title; the actor and excerpt are in the in-app notification.
- Rate limiting reuses the comment limit (5 per minute); comment votes have none beyond the global throttler. A vote storm is bounded by one row per user and comment.
- Not done here: moderation UI for removed comments, editing or deleting one's own comment, nested notification preferences per kind (the existing three channels apply to all kinds).
