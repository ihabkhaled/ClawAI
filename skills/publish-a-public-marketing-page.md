---
name: publish-a-public-marketing-page
summary: Publish a new page under app/(marketing) so it is actually indexable — registry entry, SEO copy in 13 locales, Lighthouse URL, internal links, and the four tests that fail if any of those is missing.
task_keywords:
  [
    marketing page,
    public page,
    landing page,
    seo page,
    comparison page,
    vs page,
    content registry,
    sitemap entry,
    indexable page,
    compare page,
  ]
applies_to: [claw-frontend]
required_rules: [03-frontend-rules, 20-i18n-and-user-facing-messages, 04-testing-rules]
required_context: [ai-context-pack, codebase-navigation]
affected_workspaces: [claw-frontend]
required_tests: [vitest, lighthouse-ci]
required_docs:
  [docs/05-frontend/multilingual-discovery.md, docs/05-frontend/seo-content-architecture.md]
validation_lane: cd apps/claw-frontend && npx tsgo --noEmit && npm run lint && npm test && npm run build
---

# Skill: Publish a public marketing page

A page under `src/app/(marketing)/` is **reachable** the moment the file exists
and **invisible to every search engine** until six other things are true. This is
that list, in dependency order.

Not the portal skill: `./add-app-route.md` covers `(portal)` pages, which are
`noindex` by construction and need a sidebar entry instead of any of this.

## When to use

- A new public page: a topic page, a guide, a comparison, a landing page.
- Flipping a `PLANNED` registry slug to `PUBLISHED`.

## When NOT to use

- Editing copy on a page that already exists — just edit it, then move
  `lastReviewed` if the claims changed.
- An authenticated screen → `./add-app-route.md`.

## Read first

- [`docs/05-frontend/multilingual-discovery.md`](../docs/05-frontend/multilingual-discovery.md) — how the registry drives sitemaps, RSS, robots and `llms.txt`.
- [`rules/03-frontend-rules.md`](../rules/03-frontend-rules.md) — TSX renders, nothing else lives in it.

## The chain

Everything below is derived from `PUBLIC_CONTENT_DEFINITIONS`. Miss a step and
the page renders perfectly while being absent from every discovery document.

1. **Slug** — add to `LaunchPublicPageSlug`. The value IS the registry key and
   usually the path minus its leading slash; a nested page uses a slash
   (`compare/chatgpt`), which is already the convention.
2. **SEO copy, 13 locales** — `PUBLIC_PAGE_SEO_BY_LOCALE`, one entry per locale
   block. `title`, `description`, `keywords`. Real translations: the description
   is what a search engine shows and what an assistant quotes. Give sibling pages
   _different_ descriptions — five near-identical ones read as boilerplate.
3. **Registry entry** — `PUBLISHED_CONTENT_CONFIGS`. Pick `category`,
   `adEligibility`, `structuredDataType`, `relatedSlugs` and `feedEligibility`
   deliberately, with no default. `feedEligibility` is `PUBLISHABLE` when a
   subscriber would consider the page news — an explainer, a new comparison — and
   `NOT_PUBLISHABLE` for legal/contact pages nobody subscribed to hear about.
   Pass `reviewDate` only when the page's claims expire on their own schedule (a
   page about someone else's product does; a page about ClawAI does not).
   `adEligibility` follows the reasoning already on `/compare/*`: a page whose job
   is a fair, checkable claim about a named third party — a competitor, a model,
   a connector — does not also carry ad inventory.
4. **The route** — `src/app/(marketing)/<path>/page.tsx`. Thin: a
   `generateMetadata` returning `buildRequestPublicPageMetadata(slug)` and a
   default export delegating to a component. Canonicals, hreflang, Open Graph,
   Twitter and robots directives all come from the registry — never hand-write
   them.
5. **Content, 13 locales** — a `Record<Locale, …>` constants module, the way
   `public-comparison-content/` does it. Do not put page copy in the i18n
   dictionary unless a shared component needs the key.
6. **Lighthouse URL** — add `http://localhost:3000/en/<path>` to
   `lighthouserc.json`. `accessibility`, `best-practices` and `seo` are hard
   errors at score 1; a page not listed is a page with no gate at all. Then
   regenerate the PR sample: `node tools/lighthouse/build-pr-config.mjs`. Never
   hand-edit `lighthouserc.pr.json` — it is derived, and
   `lighthouse-coverage.test.ts` asserts it matches what the generator would
   produce.
7. **Internal links** — the footer lists published pages automatically. A page
   that also belongs in the header nav needs a `marketing.header.*` key in
   `i18n.types.ts` and all 13 locale files. Give a cluster its own footer column
   rather than growing one list past a dozen items.
8. **Structured data** — only if the page is more than prose. `WebPage` is the
   honest default. Never emit `Review`, `AggregateRating` or `Product` for a page
   you wrote about your own product or a competitor's.

## Tests-first plan

Four existing tests already fail if the chain is broken — run them before writing
the page and watch them fail for the right reason:

- `sitemap-coverage.test.ts` — a route on disk with no `PUBLISHED` entry, and the
  inverse (an entry with no route, which is a 404 in the sitemap).
- `lighthouse-coverage.test.ts` — audited URLs ↔ indexable pages, both ways.
- `marketing-footer.test.tsx` — every internal link resolves to a published path,
  and no destination appears twice.
- `content-registry.utility.test.ts` — slug uniqueness and locale coverage.

Then add your own: a render test asserting exactly one `h1`, and — if the page
ships per-locale copy — a test that each locale's prose differs from the English.
`getIndexablePagesForLocale` cannot tell what language a body is in; it will list
an English page in the Japanese sitemap and nothing else will notice.

## Failure modes

- **Page renders, never indexed.** No registry entry. The single most common
  miss, and completely silent.
- **`t()` key that does not exist.** `t()` is not type-safe against
  `TranslationDictionary`: a wrong key compiles and renders the raw key string to
  the reader. Verify the chain in `i18n.types.ts`.
- **English body under a localized URL.** Indexable, wrong-language, worse than
  no page.
- **Lighthouse red for everyone.** A new colour used as text that misses WCAG AA
  scores the whole accessibility audit 0. Reuse the `--editorial-*` tokens;
  `color-contrast-tokens.test.ts` guards the pairs.
- **Stale review date.** Moving `lastReviewed`/`reviewDate` without re-checking
  the claims makes a stale page look current in `lastmod` and `dateModified`.

## Validation commands

```bash
cd apps/claw-frontend
npx tsgo --noEmit && npm run lint && npm test && npm run build
```

Gate once, at the end of the batch. Never all-workspace.

## Documentation updates

- `docs/05-frontend/multilingual-discovery.md` if the route contract changes.
- An ADR if the page type is a new decision rather than one more instance of an
  existing one.

## Definition of done

Route resolves under `/{locale}/`; registry entry `PUBLISHED` + `REVIEWED` +
`INDEXABLE`, with `feedEligibility` and `adEligibility` chosen deliberately; 13
locales of SEO copy and body copy, each genuinely translated (the
content-registry native-metadata test catches an English fallback); URL in
`lighthouserc.json` and the regenerated PR sample; reachable from the footer or
nav; the four coverage tests green; every factual claim traced to a source per
"Claim liability" above; validation lane green.

## Two shapes this repo already has, and when each applies

### A small cluster (up to ~10 pages) that fans out from a registry list

The comparison pages are not nine registry entries. They are one enum
(`ComparisonRival`), one order array, two maps, and a `.map()` inside
`PUBLIC_CONTENT_DEFINITIONS`. Adding a rival is four lines plus content — the
sitemap, the feeds, `/llms.txt`, `robots.txt`, the canonicals, the footer and the
AdSense rules all follow.

If you are adding the second, third or fourth page of an obviously repeating
kind, build the fan-out before the second page, not after the fourth.

This shape only fans out **one of five layers** — the registry config. The slug
enum, the SEO copy, the route file and the Lighthouse URL are still hand-written
once per page. That is fine at nine pages and is not fine at fifty — see the
next shape.

### A cluster of ~10+ pages: one dynamic route, all five layers fan out (ADR-084)

`/learn/[topic]` is the pattern once a cluster's children stop being a short,
named, hand-curated list (rivals, providers) and start being "all of them" —
concepts, connectors, task pages. One physical route serves every child:

```
src/enums/<cluster>-topic.enum.ts          the topics, one member per page
src/constants/<cluster>.constants.ts       order array, path/slug helpers, review date
src/constants/<cluster>-content/<locale>.constants.ts   SEO copy AND body copy, 13 files
src/constants/<cluster>-seo.constants.ts   derives the SEO registry source from the content above
src/app/(marketing)/<cluster>/page.tsx           the hub
src/app/(marketing)/<cluster>/[topic]/page.tsx   every child, generateStaticParams over the order array
```

Three things a physical-file cluster gets for free that a dynamic one does not,
and that you must wire by hand:

1. **The SEO copy seam.** `constants/public-page-seo-registry.constants.ts`
   resolves a slug through the launch set first, then through
   `CLUSTER_SEO_SOURCES` — add your cluster's `<cluster>-seo.constants.ts` map
   to that array. Do not add slugs to `public-page-seo.constants.ts`; that file
   is for the 28 launch pages and turns into an unreadable, endlessly-conflicting
   god-file past a few dozen entries.
2. **`sitemap-coverage.test.ts` must learn the segment.** Add an entry to
   `constants/seo-cluster-routes.constants.ts` (`SEO_CLUSTER_ROUTE_EXPANSIONS`)
   mapping the on-disk route (`/learn/[topic]`) to the paths it actually serves,
   from the same order array `generateStaticParams` reads. Without this the test
   cannot tell your dynamic route from `/share/chat/[publicShareId]`, which has
   no fixed children and is deliberately exempt — your cluster is the opposite
   case and must be expanded, not exempted.
3. **`FeedEligibility` per registry entry**, explicit, not defaulted — see
   below.

If you are adding the second, third or fourth page of an obviously repeating
kind that will plausibly grow past ~10, build this shape before the second
page, not after the fourth. Retrofitting it later means moving SEO copy out of
the god-file and teaching the coverage test about a segment that already has
scattered physical routes.

### A pair of pages with their own dictionary

The Coding Agent pages (`/coding-agent`, `/coding-agent/install`) have their own
`constants/coding-agent-content/<locale>.constants.ts` files and a `*-content.constants.ts`
loader, exactly like the comparison cluster, rather than living in the main
`lib/i18n/locales` dictionaries.

Use a dedicated dictionary when the copy is long-form page content. Use the main
i18n dictionaries for UI chrome — nav labels, buttons, the homepage band's three
points. The split keeps a 200-line page from bloating the dictionary every
authenticated screen loads.

## Claim liability — naming a model, a connector or a competitor

A page that names anything outside ClawAI's own product is a claim, and claims
found during the SEO expansion (`docs/05-frontend/seo-content-architecture.md`
§8) that must not recur:

- **Every fact traces to something verifiable in the code**, not to trained
  knowledge or plausible-sounding numbers. For models specifically, ground
  claims in `MODEL_FACTS` (`constants/model-facts.constants.ts`) — sourced from
  `apps/claw-routing-service/.../model-cost-seed.constants.ts` and
  `ConnectorProvider`, never from `cloud-model-intelligence.constants.ts`, which
  carries unsourced internal routing heuristics and disparaging claims about
  named competitor products.
- **No speed or benchmark claims** anywhere. There is no in-repo latency
  benchmark suite; a speed claim with no source is a fabrication with a fake
  citation.
- **Naming a model is an entitlement claim.** `/pricing` already refuses to
  promise a specific model on a specific tier. Any page naming a model links to
  `/pricing` and carries the same qualifier — never pair a model name with a
  signup CTA implying inclusion in a given plan.
- **No regulated-vertical pages** (`/industries/healthcare`,
  `/industries/financial-services`, `/industries/government`, …) — the site
  offers no data-processing agreement, and an industry page addressed to a
  regulated buyer implies one. `/industries/*` covers unregulated verticals only.
- **Model-vs-model comparison pages must be about ClawAI's own routing
  behaviour** ("how ClawAI's router chooses between X and Y"), not head-to-head
  claims about two products ClawAI sells neither of — the latter has nothing
  substantiable to say and is comparative-advertising exposure in EU locales.
- **No superlatives about third-party products** ("best model for coding").
  Reframe as task-fit ("choosing a model for coding") — same intent, no
  unsubstantiated ranking.
- **Connector/integration copy is generated from the provider registry**
  (`PROVIDER_DEFINITION_SEEDS` in workspace-service), never hand-written. Several
  connectors have `webhooks: false` or read-only capabilities; claiming
  "real-time sync" or "signature-verified" for one that doesn't have it is false
  and was caught live.

## Things that will bite you

- **Product identifiers do not belong in a dictionary.** An extension id, a CLI
  command or a keyboard shortcut translated into thirteen languages is thirteen
  broken instructions. They live in a constants file and stay Latin even in the
  RTL locales.
- **A `vscode:`-style protocol link cannot be feature-detected.** Offer it beside
  the real link, never instead of it.
- **Four tests enumerate the published surface on purpose.**
  `content-registry.utility.test.ts` lists every published path, every
  ad-eligible path, and the per-locale count; `comparison-page.test.tsx` counts
  the rail. They are the tripwire for a page going live unreviewed, so a new page
  means editing them — that is the feature, not friction. Prefer deriving counts
  from the order array where the contract really is "all of them".
- **`getPageBySlugAndLocale` returns the unlocalised entry**, which has no
  `path`. Use the route constant and `localisePath`.
