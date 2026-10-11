# 2026-10-11: Web Push for notifications, the top bar menu and the shell fix

## What changed

- **Web Push** ([ADR-166](../13-adr/adr-166-web-push-is-an-opt-in-channel-of-user-notifications.md)): a third notification channel. New table `push_subscriptions`, routes `GET /notifications/push/config`, `POST` and `DELETE /notifications/push/subscriptions`, `WebPushAdapter` over `web-push`, push handling in `public/sw.js`, a switch in Settings, translations in 13 locales.
- **New env vars:** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (all three or push stays off). In `.env.example` and both installers.
- **Mobile top bar:** below 768px of bar width, currency, language, theme, tours and feedback sit in a More menu; the account menu is never pushed off screen.
- **Portal shell:** the observability page left a blank band because `sr-only` elements escaped the shell's clip and made the document taller than the window. The shell is `relative` now ([rule 62](../../rules/62-portal-shell-must-never-scroll-as-a-document.md)).
- **Marketing screenshots:** the 15 PNGs the marketing figures referenced were never committed, which broke the scene test and the Lighthouse shards. They are captured and committed.

## Before and after

- Before: Threads notifications reached the bell and email only; the observability page could scroll the whole shell up; 15 marketing images were missing (broken images on public pages).
- After: a person can also get a pop-up on a chosen browser; the shell never scrolls as a document; every marketing figure has its image.

## Operating notes

- Production needs the VAPID values in the auth-service `.env` before push appears. `npm run service:recreate` re-reads them; the new dependency needs `service:rebuild`.
- The prod frontend build must be used to test push: the service worker registers only in production builds. `apps/claw-frontend/scripts/responsive-audit/push-check.cjs` drives it in a real (non-incognito) Chromium profile.
