# Rule 66 — Every flagship feature ships a public marketing page

**Status:** NON-NEGOTIABLE. Owner order, 2026-10-31. Applies to EVERY coding agent, tool and person.
Procedure: [skills/ship-a-feature-marketing-page.md](../skills/ship-a-feature-marketing-page.md).
Decision: [ADR-208](../docs/13-adr/adr-208-a-flagship-feature-is-not-shipped-without-its-marketing-page.md).
Mechanics of any marketing page: [skills/publish-a-public-marketing-page.md](../skills/publish-a-public-marketing-page.md).

A feature nobody can find is a feature that does not exist for the people who would pay for it. A new flagship, core feature,
big feature or product introduction therefore ships its public page **in the same change**, not in a follow-up that never comes.

## When it applies

A new or substantially new:

- flagship (an entry in [`docs/02-business-product/flagship-features.md`](../docs/02-business-product/flagship-features.md)), a core
  feature, or a big user-facing feature that changes what the product is or can do;
- product introduction (a new product surface, a new app, a new plan-defining capability).

Not covered: a bug fix, a copy tweak, a small option on an existing screen, an internal or admin-only tool. Those update the page that
already exists, if any claim on it changed. When unsure whether a feature is "big", ask the owner once and record the answer; do not
decide it silently in favour of skipping.

## What the page must have

All of it, in the same change:

1. **A public route** under `apps/claw-frontend/src/app/(marketing)/` (a physical route such as `features/threads`, or a capability
   entry served by `features/[capability]`), crawlable and indexable: never `noindex`, never behind sign-in.
2. **Registered in every registry**, so nothing is wired by hand twice: the slug enum, the SEO copy, the content registry entry
   (`PUBLISHED`, `INDEXABLE`, deliberate `feedEligibility` and `adEligibility`), the sitemap through that registry, the `llms.txt` section
   it belongs to, and the cluster-route table when the route is dynamic. Exact paths are in the skill.
3. **Linked from the footer and from marketing navigation**, plus internal links from the related pages (the features hub, the
   homepage band when it is a flagship, the pricing page when a plan gates it, the comparison or learn pages that mention the topic).
4. **Search and sharing metadata**: a title and description per locale, canonical, hreflang, Open Graph and Twitter images, and
   JSON-LD that is honest (`WebPage`, `FAQPage`, `VideoObject` when a video is there; never `Review`, `AggregateRating` or `Product` for
   our own product). All of it comes from the registry helpers, never hand-written. IndexNow submits the URL after deploy because the
   sitemap entry carries a fresh `lastmod`; do not add a second submission path.
5. **A hero video or demo video and real screenshots.** Screenshots are captured from the running app, never drawn, and never show a
   real person, token or private chat. Every image has alt text in the visitor's language, explicit `width` and `height`, lazy loading
   below the fold and an eager, prioritised hero. Every video has a poster image, no autoplay with sound, a caption track or a transcript
   when it speaks, and a text equivalent on the page (the steps and the claims are in prose, not only in the video).
6. **Full copy in all 13 locales** (`ar de en es fa fr hi it ja pt ru th zh`). Real translations: no English body under a localized URL, no
   machine-lazy fallback. Product identifiers (commands, ids, shortcuts) stay Latin. Locale tests must catch an English fallback.
7. **RTL-safe layout** (`ar`, `fa`): logical spacing, mirrored icons where they carry direction, no clipped text, checked in a real
   browser in Arabic.
8. **Performance, accessibility and SEO budgets respected**: the new URL is in `lighthouserc.json` and the regenerated PR sample
   (accessibility, best-practices and seo are hard errors); no layout shift from media (reserved boxes), contrast from the existing
   tokens, one `h1`.
9. **AdSense and claim safety**: no thin or boilerplate page ([rule 38](38-adsense-eligibility-and-low-value-content.md)), no
   superlatives about third parties, no benchmark claim without a source, no entitlement promise a plan does not give
   ([skill, "Claim liability"](../skills/publish-a-public-marketing-page.md)).
10. **Docs and QA**: the flagship list is updated, the screenshot and video retake instructions exist, and the QA evidence record has
    the marketing checklist below.

## What a reviewer must verify

| Check            | How                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Page is live     | Open `/en/<path>` and `/ar/<path>` on https://claw.local: 200, one `h1`, no raw i18n keys, no horizontal scroll at phone width           |
| Indexable        | View source: canonical, hreflang for 13 locales, no `noindex`; `/sitemap.xml` chain lists it; `/llms.txt` lists it                       |
| Linked           | Footer shows it; the features hub shows it; at least one related page links to it                                                        |
| Media is real    | Screenshots match the shipped UI; every image has alt, width and height; the video plays after a click and has a poster and a transcript |
| Locales are real | Open three non-Latin locales: the body is that language, not English                                                                     |
| Budgets          | Lighthouse for the new URL: accessibility, best-practices and seo at 1                                                                   |
| Tests            | The coverage tests listed in the skill pass, and a render test asserts one `h1`                                                          |
| Record           | The QA evidence record (product, i18n and docs lanes) carries the marketing checklist                                                    |

QA evidence checklist (paste into the record): `route`, `registries`, `footer and nav`, `internal links`, `metadata and JSON-LD`,
`sitemap and llms.txt`, `IndexNow note`, `hero or demo video`, `screenshots`, `alt and dimensions`, `13 locales`, `RTL`, `Lighthouse`,
`AdSense and claims`. Each is `PASS` with the command or URL, or `NOT_APPLICABLE` with a reason.

## Prohibited

- Merging a flagship without its page, or with a placeholder page ("coming soon", English only, no media).
- A page that is `noindex`, missing from the sitemap, or reachable only by typing the URL.
- Stock or drawn "screenshots", media without alt text or dimensions, a video that autoplays with sound.
- English copy under a localized URL, or a locale file added just to satisfy the count.
- A hand-written canonical, hreflang or JSON-LD that bypasses the registry helpers.

## Enforcement

- Existing tests that fail when the chain is broken: `sitemap-coverage.test.ts`, `lighthouse-coverage.test.ts`,
  `marketing-footer.test.tsx`, `content-registry.utility.test.ts` (all under `apps/claw-frontend/src`), and the locale tests for media
  copy. They run in the frontend hook gate and in CI.
- QA evidence record (rule 60): `npm run qa:evidence:check` rejects a record with an open lane; the marketing checklist above lives in the
  product, i18n and docs lanes.
- Review checklist (the table above): the only check for "this feature is big enough to need a page".
- Follow-up (not built yet): a check that a new entry in the flagship list has a matching `PUBLISHED` registry slug and a
  footer path. Owner: the tooling owner of `tools/`.

## Definition of done

- [ ] The page is live locally in `en` and `ar`, linked from the footer, and in the sitemap and `llms.txt`.
- [ ] Hero or demo video, real screenshots, alt text and dimensions are in place.
- [ ] All 13 locales carry real copy; RTL was checked in a browser.
- [ ] The new URL is in `lighthouserc.json` and the four coverage tests pass.
- [ ] The flagship list and the QA evidence record are updated in the same commit.
