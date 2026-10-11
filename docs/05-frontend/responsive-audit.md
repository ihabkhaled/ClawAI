# Responsive audit

A Playwright script that loads every portal and public marketing screen at nine viewports and
reports layout defects. It is a gate you run by hand before calling a layout change done; it is not
part of CI (it needs the dev stack for real data).

## Viewports

| Name  | Size      | Class                          |
| ----- | --------- | ------------------------------ |
| m320  | 320x568   | small phone                    |
| m360  | 360x740   | phone                          |
| m390  | 390x844   | phone                          |
| m430  | 430x932   | big phone                      |
| t768  | 768x1024  | tablet portrait                |
| l1024 | 1024x768  | tablet landscape, small laptop |
| l1280 | 1280x720  | small laptop                   |
| l1440 | 1440x900  | laptop                         |
| d1920 | 1920x1080 | desktop                        |

The Arabic (RTL) run covers m320, m390, t768 and l1280.

## Run it

```bash
cd apps/claw-frontend
npm run build
# serve the standalone build on 3999 (stop any older server on that port first)
S=.next/standalone/apps/claw-frontend
mkdir -p $S/.next && cp -r .next/static $S/.next/static && cp -r public $S/public
(cd $S && PORT=3999 HOSTNAME=127.0.0.1 node server.js)

# in another shell; the dev stack must answer https://claw.local/api/v1/health
export MSYS_NO_PATHCONV=1   # Git Bash only: stops it rewriting "/thread" style arguments
node scripts/responsive-audit/audit.cjs --tag=after                       # English, all viewports
node scripts/responsive-audit/audit.cjs --locale=ar --tag=after           # Arabic, 4 viewports
node scripts/responsive-audit/audit.cjs --vp=m320,m390 --only=/files,/billing --tag=quick
```

Flags: `--locale=en|ar`, `--vp=<names>`, `--only=<route substrings>`, `--tag=<prefix>`.
`NO_SHOT=1` skips screenshots. `/api/v1/**` is forwarded to `https://claw.local`
(`AUDIT_BACKEND` overrides it, `AUDIT_LOCAL` overrides the frontend origin). Portal routes log in as
`admin@claw.local`; marketing routes run logged out. Thread, review and connector ids are
discovered from the live data. `scripts/responsive-audit/probe-wide.cjs <path> [width]` lists the
deepest elements wider than the viewport when a route fails.

Output goes to `scripts/responsive-audit/out/` (git-ignored): `<tag>-<locale>-results.json`, a
screenshot per failure, and a sample screenshot (dashboard, chat, home) per viewport.

## What counts as a failure

- `page-overflow`: `scrollWidth > clientWidth + 1` on the document.
- `beyond-viewport`: a visible element that crosses the left or right edge and is not inside a
  scroll container. An `overflow-hidden` box that touches the screen edge (the app shell) does not
  count as protection: it cuts content off instead.
- `topbar-clipped`: a top bar control outside the bar, or the bar wider than itself.
- `zero-width-text`: text squeezed to under 4px.
- `fixed-overlap`: two fixed elements (bottom nav, banners, toasts) overlapping.
- `more-panel` / `user-menu`: on the dashboard, the "More" panel and the account menu are opened;
  both must sit fully inside the viewport, with every control reachable and no page overflow.
- `small-tap-target` (phones only) is a warning, not a failure: primary controls under 24x24px.

## Findings fixed with this audit

- `PortalShell` content column had no `min-w-0`, so any wide child (toolbar, chart, table)
  stretched the column and the top bar past the screen edge.
- `.editorial-comparison` grid had an implicit auto column, so the comparison table's
  `min-width: 42rem` widened the whole page at 320px.
- `.editorial-comparison__card-link` could not wrap, so a long summary pushed a card past a 320px
  screen.

- Card grids on the dashboard, connectors, workspace and context packs used viewport breakpoints, but
  beside the 256px sidebar a 768px or 1024px screen leaves far less room, so titles were ellipsised to
  10px. They now use a `@container` wrapper and `@lg:` / `@3xl:` / `@4xl:` columns, and titles wrap.
- `ModelExposureTable`'s scroll box lacked `relative`, so its `sr-only` cells escaped the clip and made
  the whole page scroll sideways at 768px.

The Arabic run sets `localStorage['claw-locale']`: the portal takes its locale from there, not from
the URL prefix, so without it the run silently audits English.

## Exceptions

None. The last full run (2026-10-11) was 520 route x viewport cells (360 English, 160 Arabic), 0 failing.
The audit does not judge visual quality, only the defect classes above: read the sample screenshots too.

## Document height (added 2026-10-11)

The observability page left a blank band under the shell: `sr-only` (absolute) elements escaped the shell's `overflow-clip`
and made the document taller than the window. `PortalShell` is now `relative`, and the audit reports
`page-vertical-overflow` when `scrollHeight > innerHeight`. See rule 62.
