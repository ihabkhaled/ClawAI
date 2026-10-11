# ADR-166: Web Push is an opt-in channel of user notifications

**Status:** Accepted

**Date:** 2026-10-11

Extends [ADR-164](adr-164-user-notifications-live-in-auth-service-and-are-requested-by-event.md): the third channel it left for a later batch.

## Decision

A person can receive the same notifications as a browser push on a device they choose. Auth-service owns it, next to the in-app list and email.

- **Opt-in per browser.** Turning the switch on asks the browser for permission, subscribes through the app's service worker and `POST`s the subscription to `/api/v1/notifications/push/subscriptions`. Granting permission is the consent; the first subscription also sets `pushEnabled`. Removing the last one clears it.
- **One table, `push_subscriptions`.** `endpoint` is unique, so a browser that signs in as someone else moves to the new person rather than duplicating. At most 10 browsers per person. `p256dh` and `auth` are the browser's public keys. The endpoint is a credential and is never logged.
- **VAPID is configuration, all or nothing.** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` live in the environment (a private key cannot be a database row an admin edits). A partial set means push is off: `GET /notifications/push/config` returns `enabled:false` and the portal hides the switch. Generate a pair with `npx web-push generate-vapid-keys`.
- **No new strings, no sensitive content.** The message is the localized email subject (title) and preheader (body) for the kind, plus a portal path, a language folder and the dedupe key as `tag`. It carries no thread title, id or user data. The 13 email dictionaries already translate it.
- **Same delivery rules as email.** Sent only by the call that created the row, so a redelivered event never pushes twice. A failed send is logged and never undoes the in-app row. A `404`/`410` from the push service deletes that subscription.
- **The worker trusts nothing.** `public/sw.js` drops a message that is not the expected shape and only opens a path on its own origin, prefixed with the language folder.
- **Available only where it can work.** The switch shows when the browser supports push, the service worker is registered (production builds only, TD-034) and the server reports push enabled. Chrome refuses the Push API in incognito, which then reads as unavailable at subscribe time.

## Consequences

- `web-push` is a new auth-service dependency, wrapped in `WebPushAdapter` (rule 13).
- A production deploy needs the three VAPID values in the auth-service environment, or push stays off. Rotating the public key invalidates every stored subscription; browsers must resubscribe.
- Proven end to end on 2026-10-11 in a real Chromium profile: switch on, event published to `claw.events`, notification shown by the worker with the localized text and `/en/threads`, switch off removes the row.
