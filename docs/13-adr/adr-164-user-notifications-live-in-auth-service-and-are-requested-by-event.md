# ADR-164: User notifications live in auth-service and are requested by event

**Status:** Accepted

**Date:** 2026-10-08

## Decision

Any service that wants to tell one person something publishes `user.notification_requested` (`UserNotificationRequestedPayload`: `dedupeKey`, `userId`, `kind`, `link`, `params`). Auth-service consumes it and owns the result: the `user_notifications` list, the `user_notification_preferences` row, and the email.

Why auth-service: it already owns the user, their language and the SMTP adapter, so no other service needs to learn an address or a locale, and rule 43's localised-email machinery is reused as is.

- **The event carries no sentence.** It carries a `kind` (`THREAD_READY_FOR_REVIEW`, `THREAD_PUBLISHED`, `THREAD_FAILED`) and short `params` such as a title. The words come from the kind, in the person's language: the portal in 13 locales, the email from the auth email dictionaries.
- **The link is a portal path.** It must match `^/(?!/)[A-Za-z0-9\-._~%/?=&#]*$` and be at most 300 characters. A scheme, a host, `//` or a space is dropped.
- **Idempotent.** `(user_id, dedupe_key)` is unique. The row is written first and only the call that created it sends email, so a redelivered event neither shows twice nor emails twice.
- **Three channels, per person.** In-app and email default on; push is opt-in (later batch). A person with in-app off still gets the row, stored already read, so it never lights the bell.
- **Email only to a verified, active account.** A failed send is logged and never undoes the in-app row.
- **Failures of the platform are not swallowed.** A storage error is rethrown so the broker keeps the message; a malformed or unknown-recipient event is dropped with a warning (retrying cannot fix it).

Producers today (threads-service): generation-service publishes `threads.generation_completed` (ready) after a draft is saved, and `threads.generation_failed` (already existed); threads-service turns both into a request after checking the publication belongs to that owner, and requests a "published" notice from the approve step. Revision-review jobs (edits the owner is already waiting on) do not notify.

API (auth-service, nginx `/api/v1/notifications`): `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET|PUT /notifications/preferences`. Every route is scoped by the caller's id; none takes a user id.

## Consequences

- A new service that needs to notify a person adds a `UserNotificationKind`, the copy (portal 13 locales + email 13 locales) and publishes the event; nothing else.
- Notifications are not purged yet (open item: retention of old read rows).
- The event is a trust boundary: auth validates it with zod before storing.

QA: `docs/qa-evidence/2026-10-08-threads-notifications-backend.md`.
