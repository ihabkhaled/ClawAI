---
name: ship-a-feature-marketing-page
summary: A new flagship, core feature or product introduction ships its public marketing page in the same change - route, registries, footer, sitemap, llms.txt, video, screenshots, 13 locales, RTL, Lighthouse, QA checklist.
task_keywords:
  [
    flagship,
    new feature,
    core feature,
    big feature,
    product introduction,
    marketing page,
    feature page,
    launch,
    announce,
    screenshots,
    demo video,
  ]
applies_to: [claw-frontend]
required_rules:
  [
    66-every-flagship-feature-ships-a-public-marketing-page,
    20-i18n-and-user-facing-messages,
    38-adsense-eligibility-and-low-value-content,
    60-qa-evidence-is-mandatory-and-machine-checked,
  ]
required_context: [codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest, lighthouse-ci]
required_docs:
  [docs/02-business-product/flagship-features.md, docs/05-frontend/seo-content-architecture.md]
validation_lane: git commit + git push - the hooks gate the change (rules/23 gate matrix)
---

# Skill: Ship a feature's marketing page

[Rule 66](../rules/66-every-flagship-feature-ships-a-public-marketing-page.md) says the page ships with the feature. This is the order
to do it in. The page mechanics (registry chain, tests-first plan, claim liability) are in
[`publish-a-public-marketing-page.md`](publish-a-public-marketing-page.md); this skill adds the media, the locales, the
discovery surfaces and the QA checklist, and lists every file to touch.

## When to use

- A new flagship, core feature, big feature or product introduction (rule 66, "When it applies").

## When NOT to use

- A bug fix, a copy tweak, a small option, an internal or admin tool. Edit the page that exists and move its review date only if a claim
  changed.
- A signed-in screen: [`add-app-route.md`](add-app-route.md).

## Read first

- [`docs/02-business-product/flagship-features.md`](../docs/02-business-product/flagship-features.md) - the flagship list and how a row names
  its evidence.
- [`docs/05-frontend/seo-content-architecture.md`](../docs/05-frontend/seo-content-architecture.md) and
  [`docs/05-frontend/multilingual-discovery.md`](../docs/05-frontend/multilingual-discovery.md) - how the registry drives every discovery file.
- [`docs/features/clawai-threads/marketing-screenshots.md`](../docs/features/clawai-threads/marketing-screenshots.md) - the model for capturing
  and retaking screenshots.

## Pick the shape

| Shape                                                     | Use when                                        | Model to copy                                                                                       |
| --------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Capability entry served by `features/[capability]`        | One of the capability pages in the features hub | `FeatureCapability` in `apps/claw-frontend/src/enums/feature-capability.enum.ts`                    |
| Bespoke page with its own sections, video and screenshots | A flagship with a story (steps, outputs, plans) | `features/threads`: `apps/claw-frontend/src/components/marketing/threads/threads-overview-page.tsx` |

## The files to touch

All paths are under `apps/claw-frontend/` unless stated. Find the live version of each by searching for the Threads page's slug
(`LaunchPublicPageSlug.THREADS`); that page went through every one of them.

1. **Slug**: `src/enums/launch-public-page-slug.enum.ts` (a capability page uses `src/enums/feature-capability.enum.ts` and
   `src/constants/features-cluster.constants.ts` instead).
2. **SEO copy, 13 locales**: `src/constants/public-page-seo.constants.ts` (resolved through `src/constants/public-page-seo-registry.constants.ts`).
3. **Registry entry**: `src/constants/content-registry.constants.ts` - `PUBLISHED`, `INDEXABLE`, deliberate `feedEligibility` and `adEligibility`,
   `relatedSlugs` pointing at the pages that should link to it. This one entry feeds the sitemap documents
   (`src/app/sitemap.xml/route.ts`, `src/app/sitemaps/[locale]/[document]/route.ts`), RSS, `robots` and `/llms.txt`
   (`src/lib/discovery/llms-txt.service.ts`, section chosen by `src/utilities/llms-txt-section.utility.ts`).
4. **Dynamic route only**: `src/constants/seo-cluster-routes.constants.ts` so `sitemap-coverage.test.ts` can expand the route.
5. **Route**: `src/app/(marketing)/features/<slug>/page.tsx`, thin: `generateMetadata` returning `buildRequestPublicPageMetadata(slug)` and a
   default export delegating to a component. Canonical, hreflang, Open Graph and robots all come from there.
6. **Component and copy**: `src/components/marketing/<feature>/` (TSX renders only, rule 03) and a `Record<Locale, ...>` content module like
   `src/constants/threads-marketing-content/<locale>.constants.ts` with the type in `src/types/`. Write real translations for `ar de en es fa
fr hi it ja pt ru th zh`. Shared pieces already exist: `src/components/marketing/shared/marketing-page-hero.tsx`,
   `marketing-scene-gallery.tsx`, `marketing-video-section.tsx`.
7. **Structured data**: `src/utilities/structured-data.utility.ts` (`buildPublicFaqJsonLd`, `serializeJsonLd`). `FAQPage` only when the
   questions are on the page; `VideoObject` comes with the video section.
8. **Footer**: `src/constants/marketing-footer.constants.ts` - add the path to `MARKETING_FOOTER_EXPLORE_PATHS` or, for a capability page, the
   Features column. `src/utilities/marketing-footer-data.utility.ts` builds the columns; `marketing-footer.test.tsx` checks every link resolves.
9. **Navigation and internal links**: the features hub, the homepage band for a flagship, `/pricing` when a plan gates the feature, and the
   learn, use-case or compare pages that mention the topic. A header entry needs a `marketing.header.*` key in all 13 locales.
10. **Video**: `src/constants/marketing-videos.constants.ts` (entry, placement, duration, poster), translated titles in
    `src/lib/i18n/locales/marketing-videos-translations.ts`, files in `public/marketing/videos/`. The player is click-to-play with a lazy
    poster (`src/components/marketing/shared/marketing-video.tsx`); keep it that way. Add a caption track when the clip speaks and a prose
    summary of what it shows.
11. **Screenshots**: `public/marketing/<feature>/` (capture at 1280 px wide from the running app, see the Threads retake guide), listed with
    `src/` path, `width` and `height` in a `<feature>-marketing.constants.ts`. Alt text is the step title in the visitor's language.
12. **Lighthouse**: add `http://localhost:3000/en/features/<slug>` to `lighthouserc.json`, then
    `node apps/claw-frontend/tools/lighthouse/build-pr-config.mjs`. Never hand-edit the derived PR sample.
13. **IndexNow**: nothing to add. After a production deploy `tools/indexnow/index.mjs` submits URLs whose sitemap `lastmod` is recent, using
    the committed key in `src/constants/indexnow.constants.ts`. A fresh registry entry therefore submits itself.
14. **Docs**: the flagship list (`docs/02-business-product/flagship-features.md`, Shipped/Partial/Gap with evidence), a retake guide for the
    screenshots and video under `docs/features/<feature>/`, and a note in `docs/05-frontend/seo-content-architecture.md` if the page type is new.

## Tests

Run these existing tests first and watch them fail for the right reason, then pass: `src/app/__tests__/sitemap-coverage.test.ts`,
`src/app/__tests__/lighthouse-coverage.test.ts`, `src/app/__tests__/llms-txt.test.ts`,
`src/components/marketing/__tests__/marketing-footer.test.tsx`, `src/utilities/__tests__/content-registry.utility.test.ts`.
Add a render test (one `h1`, every image has alt, width and height) and a locale test that each non-English body differs from English.

## Browser proof (rule 44, rule 60)

On https://claw.local, with Playwright: the page in `en` and `ar` at phone, tablet and desktop widths; the footer link; the video click-to-play;
view source for canonical, hreflang and absence of `noindex`; `/sitemap.xml` and `/llms.txt` containing the URL; three non-Latin locales
reading as that language. Run Lighthouse for the URL. Put the results in the QA record's product, i18n and docs lanes with the checklist from
rule 66.

## Failure modes

- **Page renders, never indexed.** No `PUBLISHED` registry entry, or `noindex` leaked from a copied portal layout.
- **Orphan page.** In the sitemap but not in the footer or any related page: crawlable, never discovered by people.
- **English body in twelve locales.** Indexable and wrong; the locale test exists to catch it.
- **Layout shift from media.** An image without width and height, or a video box without a reserved ratio, fails the Lighthouse budget.
- **Stale screenshot.** The UI moved and the picture did not; retake it and update the review date.
- **Claim the code does not support.** Trace each claim to the flagship row and its evidence.

## Definition of done

Rule 66's list: live in `en` and `ar`, linked from the footer, in the sitemap and `llms.txt`, hero or demo video, real screenshots with alt
and dimensions, 13 real locales, RTL checked, URL in `lighthouserc.json` with the coverage tests green, flagship list and QA record updated in
the same commit.
