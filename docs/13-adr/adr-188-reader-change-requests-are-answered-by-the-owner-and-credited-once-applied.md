# ADR-188: Reader change requests are answered by the owner, told to the reader and credited once applied

**Status:** Accepted

**Date:** 2026-10-15

Builds on [ADR-180](adr-180-threaded-comments-votes-mentions-and-community-notifications.md) (comments and notifications). Product rules: [Change requests](../02-business-product/clawai-threads-product-spec.md#change-requests-2026-10-15). Service guide: [service-guide-threads](../04-backend/service-guide-threads.md).

## Context

A visitor suggested a change to a Thread. The owner got a notification (`Chen Charlie suggested a change to your Thread / Untitled draft`) and could not find the request:

- the review list existed only inside the owner's publication page, and only for a published Thread;
- the notification linked to the public page, where only the requester's form exists;
- the notification title was the stored placeholder `Untitled draft` (Threads published before titles were derived from the text);
- nothing told the owner where requests live, and the reader was never told what the owner decided;
- the Threads list had no sign that anything was waiting.

## Decision

**The owner reviews at the existing review screen; every path to a request leads there.**

- The `THREAD_CHANGE_REQUESTED` link is `/threads/review/<publicationId>#change-request-<requestId>`. The screen scrolls to and highlights that request. The notification carries the real Thread title: `readablePublicationTitle` derives it from the article when the stored title is the placeholder, and sends an empty title (not the placeholder) when nothing is readable.
- `GET /thread-publications/public/:slug/viewer` (public route, optional token) answers `{ isOwner: false }` to guests and to everyone but the owner. Only the owner gets `{ isOwner: true, publicationId, pendingChangeRequests }`, so the public Thread page shows the owner-only bar "Pending change requests: N - Review" without leaking ownership.
- `GET /thread-publications/mine` carries `pendingChangeRequests` per Thread (one filtered `_count`), shown as a badge on the Threads list.
- The owner list (`GET /thread-publications/:id/change-requests`) returns requester name and @username (resolved through auth-service, the id never leaves threads-service), time, text, status and the owner's reply; a non-owner gets 404.
- **Decisions.** Accept either (a) with the existing capped AI review of a revised article ("Apply with AI review", `revision` in the body) or (b) on its own ("I will edit it myself": no `revision`, the editor opens). Decline takes an optional reason. A repeated identical decision succeeds quietly and notifies nobody; the opposite decision is 409. The update is one conditional `UPDATE ... WHERE status = 'PENDING'`, so two simultaneous decisions cannot both win.
- **APPLIED.** The status enum gains `APPLIED` (migration `20261015210000_threads_change_request_applied`, additive: one enum value and one index). When the owner publishes, `markAcceptedApplied` moves every ACCEPTED request the live revision contains to APPLIED: a request accepted with a revised article counts once the live revision is that revision or a later one; one the owner edits by hand counts once a revision created after the acceptance is live. Republishing an older approved revision applies nothing. Only ACCEPTED rows can move.
- **The requester is told.** Three kinds, `THREAD_CHANGE_ACCEPTED`, `THREAD_CHANGE_APPLIED`, `THREAD_CHANGE_DECLINED`, are added to `UserNotificationKind` and handled exactly like `THREAD_CHANGE_REQUESTED` (ADR-180, ADR-187): an `AuthEmailKind`, an entry in `NOTIFICATION_EMAIL_KIND`, copy in all 13 email dictionaries, in-app text in `notifications-translations.ts`, an icon. Keys: `change-accepted:<id>`, `change-applied:<id>`, `change-declined:<id>` (one notice per request and outcome). Accepted and declined open `/threads/my/suggestions#change-request-<id>`; applied opens the Thread, which now credits them. The kind column in auth-service is a string, so no auth migration is needed.
- **"My suggestions"** (`GET /thread-publications/change-requests/mine`, page `/threads/my/suggestions`, linked from the Threads list and from the notifications) lists the person's own suggestions with Thread, status and the owner's reply. The page is two segments deep so it can never collide with a `/threads/<slug>` public Thread.
- **Public visibility is accepted or applied only.** `GET /thread-publications/public/:slug/change-requests/credits` returns `[{ displayName, username }]` for ACCEPTED and APPLIED requests only (a `status IN` clause, covered by a test that fails if PENDING or REJECTED could be selected). No public endpoint returns request text, pending or declined requests. The public page shows "Improved with suggestions from @name".
- **Abuse limits.** Content max 5000 (unchanged), at most 3 pending requests per person per Thread, at most 50 pending per Thread, and the owner cannot suggest to their own Thread (403). The checks and the insert run under the publication row lock (`SELECT ... FOR UPDATE`), so concurrent requests cannot both pass a limit. The existing rate limits are unchanged. A refused limit is 429.

## Consequences

- "Apply with AI review" is the existing revision flow: the owner edits the revised article in the form and the automatic review checks it before it can be published. There is **no** endpoint that has a model rewrite the article from the suggestion; that is not built.
- A request accepted on its own stays ACCEPTED until a newer revision goes live. If the owner never publishes, the reader keeps seeing "Accepted".
- Requests on a Thread that is later unpublished stay readable by the owner on the review screen and by the requester in "My suggestions"; credits disappear with the public page.
- Deployment: run the threads-service migration (adds an enum value and an index; no table rewrite). Auth-service and frontend ship code only. Deploy shared-types first (three new kinds).

## Addendum 2026-10-15: live QA of v1.216.0

- **A repeated decision is answered, not re-made.** The same decision sent again (even with a different reason) answers HTTP 200 with the STORED decision plus `unchanged: true` (`status`, `ownerResponse` of the first decision); the first decision still answers 201. The first reply is kept and nothing is announced twice. The opposite decision stays 409. A 200 with the stored reply was chosen over a 409 on a different reason because a double click or a retried request is not an error and the client can show the kept reply.
- **"I will edit it myself"** opens the editor for that Thread with the suggestion text shown beside it (frontend). The review-screen deep link carries its fragment exactly once through the sign-in redirect and the card is highlighted after load.
- **Title** of every change-request and comment notification comes from the one resolver of the ADR-189 addendum.
