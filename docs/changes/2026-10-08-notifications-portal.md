# Notifications in the portal (2026-10-08)

**What.** A bell in the top bar (unread badge, panel, mark read, mark all read, "Show older") and a Notifications card in Settings (in-app and email switches, saved at once, rolled back with a message on failure). Copy in 13 locales (`notifications-translations.ts`). The badge refreshes once a minute while the tab is visible and on focus; a hidden tab does not poll. Backend: ADR-164.

**Not in this batch.** Web push (VAPID, service worker): still open.

QA: `docs/qa-evidence/2026-10-08-notifications-portal.md` (PARTIAL).
