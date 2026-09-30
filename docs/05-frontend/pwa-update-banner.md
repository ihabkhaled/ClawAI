# The "a new version is available" banner

Owner: `apps/claw-frontend/src/components/common/pwa-manager.tsx`.
Related: TD-034 in [`technical-debt.md`](../14-risk-debt/technical-debt.md) (the
stale-chunk problem the versioned worker URL solved).

## What the banner means (since 2026-09-29)

**Exactly one thing: the server now runs a later release than the one this page
was built as.** Nothing about the service worker decides it.

```
page (APP_VERSION baked at build)  →  GET /api/version  (no-store, per request)
  deployed > APP_VERSION   →  banner
  deployed <= APP_VERSION  →  no banner   (page is current, or newer mid-rollout)
  no answer                →  no banner
Update  →  SKIP_WAITING to any waiting worker  →  window.location.reload()
        →  new page's APP_VERSION == deployed  →  no banner
```

- Route: `apps/claw-frontend/src/app/api/version/route.ts` (served by the
  frontend through nginx `location /`; `force-dynamic`, `Cache-Control: no-store`).
- Compare: `isNewerVersion` in `src/utilities/app-version.utility.ts` (numeric
  dotted compare; unparseable → not newer).
- Checked at mount, every `PWA_UPDATE_CHECK_INTERVAL_MS` (5 min) and when the
  tab becomes visible; a hidden tab does not ask.

## Why the service-worker version failed (twice)

The worker is registered as `/sw.js?v=<APP_VERSION>`, but the **bytes of
`sw.js` are identical across releases**. So:

1. **A stale tab never saw a deploy.** `registration.update()` re-fetches the
   _registered_ URL (`?v=<old>`), gets the same bytes, and finds nothing. The
   2026-09-20 fix (periodic `update()`) could never have worked.
2. **A reloaded page — already current — showed the banner.** The new page
   registers `?v=<new>`; that is a new script URL, so a new worker installs and
   _waits_ (the old one still controls the page). The banner read "a worker is
   waiting" as "you are out of date". The 2026-09-20 "seen" key only hid the
   repeat, not the first false offer, and pressing Update cleared it.

The `PWA_UPDATE_SEEN_KEY` / `isUpdateAlreadySeen` / `serviceWorkerVersion`
machinery was deleted with this change: with a truthful signal there is nothing
to suppress. A page that is current never shows the banner; a stale one always
does until it reloads.

## What this deliberately does not do

- It does not reload by itself. The person decides when; a chat mid-answer is
  not a good moment to swap the bundle.
- It does not auto-activate the new worker. Old chunks for stale tabs live
  only in the old worker's cache (the server no longer has them after a
  deploy); activating early would delete that cache under those tabs.

## Verifying it

The version check runs in every environment; in dev `/api/version` returns the
same `package.json` version the page was built with, so no banner. The worker
only registers in production (`shouldRegisterServiceWorker`). Tests:

```bash
cd apps/claw-frontend
npx vitest run src/components/common/__tests__/pwa-manager.test.tsx \
  src/utilities/__tests__/service-worker.utility.test.ts
```

Live: `curl -sk https://<host>/api/version` shows the deployed version. Open a
page, bump + deploy, wait ≤5 min (or switch tabs away and back) → banner.
Reload → gone.
