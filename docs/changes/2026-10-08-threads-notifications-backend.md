# Threads notifications: backend (2026-10-08)

**Why.** Owner: tell the person by email, in the app and by push when a Thread is ready for review, published or failed.

**What (this batch: backend, in-app store and email).** ADR-164. Events `threads.generation_completed` and `user.notification_requested`; enum `UserNotificationKind`. Generation-service announces a saved draft; threads-service turns completed/failed/published into notification requests; auth-service stores them (`user_notifications`, `user_notification_preferences`, migration `20261008120000_user_notifications`), emails them (3 new email kinds x 13 locales) and serves `/api/v1/notifications` (nginx location added in both nginx files).

**Not in this batch.** The bell and preferences UI in the portal; web push (VAPID, service worker). Both come next.

**Deploy order.** Auth-service first (migration + consumer), then threads-service and generation-service. A notice published before auth-service is up waits in its queue.

QA: `docs/qa-evidence/2026-10-08-threads-notifications-backend.md` (PARTIAL).
