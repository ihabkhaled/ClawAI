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
required_docs: [docs/05-frontend/multilingual-discovery.md]
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
   `adEligibility`, `structuredDataType` and `relatedSlugs` deliberately. Pass
   `reviewDate` only when the page's claims expire on their own schedule (a page
   about someone else's product does; a page about ClawAI does not).
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
   errors at score 1; a page not listed is a page with no gate at all.
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
`INDEXABLE`; 13 locales of SEO copy and body copy; URL in `lighthouserc.json`;
reachable from the footer or nav; the four coverage tests green; validation lane
green.

## Two shapes this repo already has, and when each applies

### A cluster that fans out from a registry list

The comparison pages are not nine registry entries. They are one enum
(`ComparisonRival`), one order array, two maps, and a `.map()` inside
`PUBLIC_CONTENT_DEFINITIONS`. Adding a rival is four lines plus content — the
sitemap, the feeds, `/llms.txt`, `robots.txt`, the canonicals, the footer and the
AdSense rules all follow.

If you are adding the second, third or fourth page of an obviously repeating
kind, build the fan-out before the second page, not after the fourth.

### A pair of pages with their own dictionary

The Coding Agent pages (`/coding-agent`, `/coding-agent/install`) have their own
`constants/coding-agent-content/<locale>.constants.ts` files and a `*-content.constants.ts`
loader, exactly like the comparison cluster, rather than living in the main
`lib/i18n/locales` dictionaries.

Use a dedicated dictionary when the copy is long-form page content. Use the main
i18n dictionaries for UI chrome — nav labels, buttons, the homepage band's three
points. The split keeps a 200-line page from bloating the dictionary every
authenticated screen loads.

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
