# The free-trial banner and its close menu

Owner: `apps/claw-frontend/src/components/layout/trial-status-banner.tsx`.
Close menu: `components/layout/trial-banner-dismiss-menu.tsx`.
Rules: `utilities/trial-banner-dismissal.utility.ts` +
`constants/trial-banner-dismissal.constants.ts`. React state:
`hooks/layout/use-trial-banner-dismissal.ts`.

## Why it is dismissible

"Your free trial is active — N days remaining … View paid plans" sits on top of
every app view. On a phone it cost two lines of vertical space on every screen for
a whole month. The X control opens a menu:

| Choice              | Stored as (`localStorage`)              |
| ------------------- | --------------------------------------- |
| Remind me in 1 day  | `{ "until": <now + 1 day, epoch ms> }`  |
| Remind me in 7 days | `{ "until": <now + 7 days, epoch ms> }` |
| Hide forever        | `{ "until": null }`                     |

Key: `trialBanner:dismissal:<userId>`. The user id is in the key, so two accounts
on one browser never share a choice. `null` means "no expiry", matching the repo's
`null` = unlimited convention.

## When the banner comes back anyway (product decision, 2026-09-25)

| Stored choice | Banner hidden while                                 |
| ------------- | --------------------------------------------------- |
| Snooze (1/7d) | `now < until` **and** more than **3** days are left |
| Hide forever  | more than **1** day is left                         |
| Expired trial | never — the expired banner has no X at all          |

- A snooze is a "not now", not a "never". Once the trial is 3 days from ending,
  the person needs to see it to avoid losing AI features, so a 7-day snooze taken
  at day 5 does not outlive the trial.
- "Hide forever" is a stronger signal and is respected longer, but not through
  the last day: silently losing access is worse than one line of chrome for 24h.
- Thresholds are `TRIAL_BANNER_SNOOZE_OVERRIDE_DAYS` (3) and
  `TRIAL_BANNER_HIDE_FOREVER_OVERRIDE_DAYS` (1). Days are `daysRemaining` from
  `resolveTrialStatusBanner` — whole days, rounded up.

The choice is a display preference only. It never touches entitlements; the
backend still decides `isTrialExpired`.

## Implementation notes

- The hook reads storage through `useSyncExternalStore` (server snapshot `null`),
  so SSR never reads `localStorage` and there is no hydration mismatch. It also
  subscribes to the `storage` event, so dismissing in one tab hides it in others.
- A failed `localStorage` read or write is logged and the banner shows — the safe
  default.
- A malformed or hand-edited stored value is ignored (`parseTrialBannerDismissal`).
- Mobile: tighter padding (`py-1.5`), smaller body text, and the title is
  `sr-only` below `sm` (still announced by screen readers).
- Accessibility: the X is a real button with `aria-label` =
  `trialStatus.dismiss`; the menu is Radix `DropdownMenu` (Enter/Space/arrow keys,
  Escape returns focus to the X). Layout uses flex + logical `align="end"`, so it
  mirrors correctly in RTL.

## Tests

- `utilities/__tests__/trial-banner-dismissal.utility.test.ts` — hide forever,
  1-day expiry, 3-day override, per-user keys, malformed values.
- `hooks/layout/__tests__/use-trial-banner-dismissal.test.ts` — the same through
  the hook, including per-user isolation and no-user no-op.
- `components/layout/__tests__/trial-status-banner.test.tsx` — keyboard-opened
  menu, the three choices, no X on an expired trial.
