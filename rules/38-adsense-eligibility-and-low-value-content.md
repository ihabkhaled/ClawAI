# 38 — AdSense Eligibility and Low-Value-Content Policy

## Purpose

AdSense rejected ClawAI for "low value content" because the ad loader script
was mounted in the root layout with no pathname check, so it executed on
every route — auth, portal, chat, billing, settings, and public shared AI
chats — instead of only on reviewed editorial pages. This rule makes that
class of bug structurally impossible to reintroduce: one authoritative,
deny-by-default eligibility policy governs every AdSense-adjacent decision,
and the route boundary that used to be "structural" is now also enforced by a
pathname check plus a regression test.

## Applies to

`apps/claw-frontend`: the `(marketing)` route group, `src/lib/adsense/**`,
`src/components/adsense/**`, `src/hooks/adsense/**`, the sitemap
(`app/sitemap.xml`, `app/sitemaps/**`), RSS/Atom (`lib/discovery/**`,
`app/feeds/**`, `app/rss.xml`, `app/feed.xml`), and
`src/utilities/public-shared-chat.utility.ts`.

## Mandatory rules

1. **The AdSense loader script is mounted ONLY in `app/(marketing)/layout.tsx`
   (via `AdSenseHead`), never in the root `app/layout.tsx`.** The root layout
   wraps `(auth)`, `(portal)` and `(payment)` too; mounting it there is exactly
   the bug this rule exists to prevent.
2. **Three concepts stay separate and are gated independently — never treat
   any two as the same requirement:**
   - Verification (`<meta name="google-adsense-account">`) — inert, may
     render whenever a client id is configured.
   - The loader script (`AdSenseScriptLoader`) — requires configuration AND
     `isAdUnitEligible(pathname)` AND (`reviewMode` or `servingEnabled`).
     `reviewMode` does **not** bypass the pathname check.
   - Manual ad units (`AdUnit`/`useAdUnit`) — requires the same eligibility
     resolution (`resolveAdUnitEligibility`) plus consent.
3. **`isAdUnitEligible` (content-registry-backed) is the single source of
   truth for path eligibility.** An unregistered, unknown, or dynamic path
   defaults to `false`. Do not add a second allowlist/denylist anywhere else.
4. **A dynamic page cannot decide its own eligibility from the URL.** Pass a
   server-derived verdict through `resolveAdUnitEligibility(pathname,
serverEligibility)`; `undefined` means unresolved and fails closed to
   `false`.
5. **`CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED`
   (`constants/chat-share-review-lockdown.constants.ts`) is the one flag that
   overrides ads, indexing, sitemap inclusion and RSS inclusion for every
   public chat share, unconditionally, for the AdSense review window.** Every
   call site reads this one constant — do not duplicate the check with a
   locally-computed condition.
6. **Public chat shares are crawlable but not necessarily indexable.**
   `robots.ts` allows `/share/chat/` so the per-page `noindex` can be
   discovered; indexability is decided by `buildSharedChatMetadata`, never by
   blocking the path in `robots.txt`.

## Prohibited patterns

- Mounting `AdSenseHead`, `AdSenseScriptLoader`, or a raw `adsbygoogle.js`
  `<script>` tag anywhere under `app/(auth)`, `app/(portal)`, or `app/(payment)`.
- A pathname-eligibility check that bypasses itself under a flag (e.g. "load
  everywhere while `reviewMode` is on") — verification never requires the
  script to execute outside an eligible page.
- Reading `share.adsEligible` / `share.indexEligible` directly at a sitemap,
  RSS, or metadata call site without checking
  `CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED` first.
- A second eligibility allowlist/denylist that duplicates
  `isAdUnitEligible`/`isAdEligiblePath`.
- `Disallow`-ing `/share/chat/` in `robots.txt` as a way to keep it out of the
  index (hides the noindex directive from crawlers instead of applying it).

## Correct pattern

```ts
// The single authoritative gate — extend this, never parallelize it.
export function shouldLoadAdSenseScript(params: {
  isConfigured: boolean;
  reviewMode: boolean;
  servingEnabled: boolean;
  pathname: string;
}): boolean {
  if (!params.isConfigured) return false;
  if (!isAdUnitEligible(params.pathname)) return false;
  if (CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED && isChatSharePath(params.pathname)) return false;
  return params.reviewMode || params.servingEnabled;
}
```

```tsx
// app/(marketing)/layout.tsx — the ONLY place AdSenseHead is mounted.
export default function MarketingLayout({ children }): React.ReactElement {
  return (
    <div className="flex min-h-dvh flex-col">
      <AdSenseHead />
      {/* ... */}
    </div>
  );
}
```

## Enforcement

- **Architecture test** —
  `app/__tests__/adsense-route-boundary.test.ts` reads the raw source of every
  layout and fails if `AdSenseHead`/`AdSenseScriptLoader`/`adsbygoogle` is
  referenced outside `(marketing)`.
- **Unit test** — `lib/adsense/__tests__/adsense-eligibility.test.ts`,
  `adsense-shared-chat.test.ts`, `components/adsense/__tests__/*`,
  `hooks/adsense/__tests__/use-adsense-script.test.ts`.
- **Unit test** — `utilities/__tests__/public-shared-chat.utility.test.ts`,
  `app/__tests__/sitemap.test.ts`, `app/__tests__/rss.test.ts`,
  `lib/discovery/__tests__/rss.service.test.ts` cover the review-lockdown
  branch on indexing/sitemap/RSS.
- **Review checklist** — any new public route added to
  `content-registry.constants.ts` gets an explicit `AdEligibility` value; it
  is never left to default silently.

## Related skills

- [`skills/publish-a-public-marketing-page.md`](../skills/publish-a-public-marketing-page.md)

## Related context

- [`docs/03-architecture/adsense-eligibility.md`](../docs/03-architecture/adsense-eligibility.md)
- `apps/claw-frontend/CLAUDE.md` — "AdSense script vs verification vs ad units"

## Definition of done

- [ ] `AdSenseHead` is reachable only through `(marketing)/layout.tsx`.
- [ ] The loader script re-checks pathname eligibility even when
      `reviewMode` is on.
- [ ] Every ads/indexing/sitemap/RSS call site for a chat share reads
      `CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED`.
- [ ] `adsense-route-boundary.test.ts` and the eligibility/utility/sitemap/RSS
      test suites are green.
