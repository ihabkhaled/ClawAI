# The "a new version is available" banner

Owner: `apps/claw-frontend/src/components/common/pwa-manager.tsx`.
Related: TD-034 in [`technical-debt.md`](../14-risk-debt/technical-debt.md) (the
stale-chunk problem the versioned worker URL solved).

## How an update reaches someone

```
deploy  →  /sw.js?v=<new>  differs from the registered worker
        →  browser installs it; it becomes the WAITING worker
        →  banner offers it
        →  Update  →  SKIP_WAITING  →  controllerchange  →  page reloads
```

The worker's script URL carries the version (`serviceWorkerUrl`), which is what
makes one update distinguishable from another. Without it the only question
answerable is "is something waiting", and that stays true until the update is
applied.

## Two behaviours that were wrong until 2026-09-20

**It waited for a reload to notice a deploy.** The registration was checked once,
at mount, and a browser only re-checks a worker script on navigation. A tab left
open all day never learned that a release had happened, so the banner appeared on
the next reload — after the person had already reloaded, which is the moment it
is least useful.

Now the page calls `registration.update()` immediately, every
`PWA_UPDATE_CHECK_INTERVAL_MS` (5 minutes), and whenever the tab becomes
visible. The check is skipped while the tab is hidden, and the interval is
cleared on unmount, so a backgrounded tab costs nothing.

**It asked again after every reload.** Reloading does **not** activate a waiting
worker — the old one still controls the page — so "is something waiting" stayed
true and the banner returned on every load until Update was pressed. From the
reader's side that looks like a banner that will not go away.

Now the version being offered is written to `PWA_UPDATE_SEEN_KEY` the moment the
banner is shown. A worker whose version matches that value is not offered again:
reloading past the banner is an answer. A **different** version is a different
question, so the banner returns for it. Pressing Update clears the key.

## What this deliberately does not do

- It does not apply the update by itself. The person decides when their page
  reloads; a chat mid-answer is not a good moment to swap the bundle.
- It does not nag. If they reload past it, the offer is gone until the next
  release — so an update declined on a busy day arrives with the following one,
  or when every tab is closed and the worker activates on its own.

## Verifying it

The worker only registers when `NODE_ENV === 'production'`
(`shouldRegisterServiceWorker`), on purpose: a dev build reuses chunk URLs, so
caching them serves stale code. **The local dev stack therefore cannot show this
banner**, and the behaviour is covered by tests instead:

```bash
cd apps/claw-frontend
npx vitest run src/components/common/__tests__/pwa-manager.test.tsx \
  src/utilities/__tests__/service-worker.utility.test.ts
```

To see it for real, a production build has to be served, deployed twice with
different versions, with the first page left open across the second deploy.
