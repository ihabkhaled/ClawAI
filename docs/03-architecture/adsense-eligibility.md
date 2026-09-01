# AdSense eligibility architecture

## Why this exists

ClawAI's AdSense account was rejected for "low value content." The root cause
was not the content — it was that the ad **loader script** executed on every
route, including auth, portal, chat, billing and settings, because it was
mounted in the Next.js root layout with no pathname check. A reviewer (human
or Google's automated crawler) could land on `/login` or a thin public chat
share and see live ad infrastructure next to non-editorial content. Full
remediation: `rules/38-adsense-eligibility-and-low-value-content.md`.

## Three concepts, three gates

| Concept                  | Component                                               | Gate                                                                                                           |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Account verification     | `<meta name="google-adsense-account">` in `AdSenseHead` | Configured client id + (review or serving). Inert — never executes.                                            |
| Ad-serving loader script | `AdSenseScriptLoader`                                   | Configured + `isAdUnitEligible(pathname)` + (review or serving). Pathname always checked, even in review mode. |
| Manual ad unit           | `AdUnit` / `useAdUnit`                                  | `resolveAdUnitEligibility(pathname, serverEligibility)` + serving enabled + consent.                           |

These used to be conflated: `AdSenseHead` rendered the meta tag AND an
unconditional script in the root layout, and a correctly pathname-aware
hook (`useAdSenseScript`) existed but was never wired into anything mounted
in the tree. The fix splits them into three independently-gated concerns.

## The route boundary

```
app/layout.tsx              — root; NEVER references AdSense
app/(auth)/layout.tsx       — NEVER references AdSense
app/(portal)/layout.tsx     — NEVER references AdSense
app/(payment)/...           — no layout.tsx of its own; inherits the root
app/(marketing)/layout.tsx  — the ONLY place <AdSenseHead /> is mounted
```

Even inside `(marketing)`, not every page is eligible: `/share/chat/*`,
`/terms`, `/privacy`, `/cookies`, `/acceptable-use` and `/contact` all live in
this route group but are not registered as `AdEligibility.ELIGIBLE` in
`content-registry.constants.ts`, so `isAdUnitEligible` returns `false` for
them and neither the script nor a manual unit renders there.

`app/__tests__/adsense-route-boundary.test.ts` asserts this structurally by
reading each layout's source text — a regression here fails on the exact bug
that caused the rejection, not just on a behavioral edge case.

## The single eligibility function

```
isAdUnitEligible(pathname)
  → content-registry lookup: PUBLISHED + REVIEWED + AdEligibility.ELIGIBLE
  → unregistered/unknown/dynamic path defaults to false

resolveAdUnitEligibility(pathname, serverEligibility)
  → chat-share review lockdown wins if pathname is a chat share (see below)
  → otherwise: serverEligibility if defined, else isAdUnitEligible(pathname)

shouldLoadAdSenseScript({ isConfigured, reviewMode, servingEnabled, pathname })
  → isConfigured AND isAdUnitEligible(pathname) AND NOT locked-down-chat-share
    AND (reviewMode OR servingEnabled)
```

There is exactly one registry-backed eligibility source
(`content-registry.utility.ts`). Do not add a second allowlist anywhere.

## The chat-share review lockdown

Public chat shares are dynamic (`/share/chat/<id>` matches any identifier),
so eligibility for them cannot come from the path — it comes from a
per-snapshot, chat-service-computed `adsEligible`/`indexEligible` verdict
(safety scan + content-depth thresholds). That system is correct long-term
policy, but during the AdSense review window even one share that happens to
score eligible is exposure a reviewer can land on.

`CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED` overrides it to `false`/excluded across
every surface, unconditionally:

| Surface  | Call site                                                               |
| -------- | ----------------------------------------------------------------------- |
| Ads      | `resolveAdUnitEligibility` (adsense-eligibility.ts)                     |
| Script   | `shouldLoadAdSenseScript` (adsense-eligibility.ts, defense in depth)    |
| Indexing | `buildSharedChatMetadata` (public-shared-chat.utility.ts)               |
| Sitemap  | `app/sitemap.xml/route.ts`, `app/sitemaps/[locale]/[document]/route.ts` |
| RSS/Atom | `lib/discovery/rss.service.ts`, `lib/discovery/global-rss.service.ts`   |

It is a single frontend constant, not a database column or backend change —
lifting it later is a one-line edit with no backfill. See
`docs/03-architecture/public-chat-shares.md` for the per-snapshot system it
temporarily overrides.

## Related

- `rules/38-adsense-eligibility-and-low-value-content.md`
- `docs/03-architecture/public-chat-shares.md`
- `apps/claw-frontend/CLAUDE.md`
