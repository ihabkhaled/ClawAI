# 47 — Client bundle weight and barrel boundaries

**Status:** active · **Owner:** frontend · **Introduced:** 2026-09-15

A barrel file is an import edge, and an import edge is a shipping decision.

## What went wrong

The marketing homepage shipped a **1,364 KiB** first-party chunk (5.6 MB raw).
Its evaluation was **91% of mobile LCP as render delay**, and it cost 27
Lighthouse points: mobile performance sat at 61.

Nothing in that chunk was needed to render a marketing page. It was:

- `@/constants/index.ts` re-exporting `content-registry.constants`, which
  imports every marketing cluster's SEO constants, each of which derives its
  titles from that cluster's **full body copy** — ~2.7 MB of prose in 13
  languages. One `import { ROUTES } from '@/constants'` in any client component
  pulled all of it.
- `@/utilities/index.ts` re-exporting `content-registry.utility`,
  `public-comparison.utility` and `route-visibility.utility`, each reaching the
  same constants. One `import { logger } from '@/utilities'` did the same.
- `@/lib/i18n/index.ts` re-exporting `translations.ts`, which statically imports
  all 13 dictionaries — 5 MB of source. Every client component imports that
  barrel for `useTranslation`, so a visitor reading English downloaded Arabic,
  Thai and Japanese.
- Two genuine client → registry edges: the marketing footer and the AdSense
  path gate.

## The rules

1. **A barrel imported by client components may only re-export leaf modules.**
   If a module reaches page content, a dictionary, or a registry, it does not
   belong in that barrel. Import it by its deep path, from server code.
2. **Never derive module-scope constants from a full content table** in
   anything a client barrel can reach. `Object.freeze(reduce(...))` over the
   prose is a side effect the bundler will not shake away.
3. **Server components resolve; client components render.** A 'use client'
   component that needs registry-derived data takes it as PROPS. The footer's
   links and the AdSense eligible-path list are both computed on the server.
4. **A gate that moves to the client keeps its authority on the server.** The
   content registry is still the only source of ad eligibility; the browser
   receives its derived verdict. Anything absent is denied — the default stays
   deny, and there is still no hand-maintained allowlist.
5. **Guard it with a source-level test.** The defect is an import edge; no
   render test can see it, and a bundle analyzer only sees it after it ships.
   See `utilities/__tests__/barrel-weight.test.ts` and
   `lib/i18n/__tests__/i18n-client-barrel.test.ts`.

## How to find it again

`productionBrowserSourceMaps: true`, build, then read the largest chunk's
`.js.map`: `sourcesContent` gives exact per-file byte attribution, and the
non-content sources in the same chunk name the entry that pulled it. Guessing
from minified output wastes hours — three separate hypotheses were wrong before
the source map answered it in one run.

## Result

|                     | before                 | after   |
| ------------------- | ---------------------- | ------- |
| Largest chunk       | 1,364 KiB (5.6 MB raw) | 368 KiB |
| Page payload        | 2,148 KiB              | 529 KiB |
| Mobile TBT          | 500 ms                 | 10 ms   |
| Mobile LCP          | 6.3 s                  | 3.8 s   |
| Mobile performance  | 61                     | 88      |
| Desktop performance | —                      | 100     |

Related: [`rules/38-adsense-eligibility-and-low-value-content.md`](38-adsense-eligibility-and-low-value-content.md)
