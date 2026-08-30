# ADR-084: SEO clusters fan out from one dynamic route, not one file per page

**Status**: Accepted
**Date**: 2026-08-30
**Deciders**: ClawAI core team
**Slice**: SEO content architecture (public marketing surface)

## Context

The public marketing surface is 28 pages × 13 locales, and
[`docs/05-frontend/seo-content-architecture.md`](../05-frontend/seo-content-architecture.md)
plans to take it to roughly 128 pages across eleven topical hubs.

The repository already has a fan-out pattern: the nine `/compare/<rival>` pages
come from one `ComparisonRival` enum, one order array, and a `.map()` inside
`PUBLIC_CONTENT_DEFINITIONS`. `skills/publish-a-public-marketing-page.md` names
it as the shape to reuse, and says to build it _"before the second page, not
after the fourth."_

But that fan-out covers **one of five layers**. Measured against the tree:

| Layer           | Fanned out today? | Where                                                                         |
| --------------- | ----------------- | ----------------------------------------------------------------------------- |
| Registry config | **Yes**           | `content-registry.constants.ts` — one `.map()` over `COMPARISON_RIVAL_ORDER`  |
| Slug enum       | No                | `launch-public-page-slug.enum.ts` — 9 hand-written members                    |
| SEO copy        | No                | `public-page-seo.constants.ts` — exhaustive `Record<Locale, Record<Slug, …>>` |
| Route file      | No                | 9 physical `app/(marketing)/compare/<rival>/page.tsx`                         |
| Lighthouse URL  | No                | 9 hand-written lines in `lighthouserc.json`                                   |

"Reuse the comparison pattern" is therefore not by itself an answer. At ~100 new
pages the unfanned four layers mean **100 enum members, ~1,300 SEO blocks, 100
route files and 100 Lighthouse lines**, hand-written, spread across nine
independently-committed batches — which guarantees the shape gets decided
differently in each.

## Decision

**Each cluster is one dynamic route segment plus one order array.**

```
src/enums/<cluster>-topic.enum.ts          the topics
src/constants/<cluster>.constants.ts       order array, path map, slug map, review date
src/constants/<cluster>-content/<locale>.constants.ts   SEO copy AND body copy, 13 files
src/app/(marketing)/<cluster>/page.tsx           the hub
src/app/(marketing)/<cluster>/[topic]/page.tsx   every child, via generateStaticParams
```

All five layers fan out:

1. **Slug** — derived, `` `${cluster}/${topic}` ``. `PublicContentDefinition.slug`
   is already `string`; only the launch set needs `LaunchPublicPageSlug`.
2. **SEO copy** — per cluster, resolved through
   `public-page-seo-registry.constants.ts`. The launch set keeps its exhaustive
   file; a cluster ships its copy beside its body copy.
3. **Registry config** — a `.map()` over the order array, exactly as the
   comparison cluster does.
4. **Route** — one `[topic]/page.tsx` with `generateStaticParams` over the order
   array, and `notFound()` for anything else.
5. **Lighthouse** — a representative sample per cluster on pull requests, the
   full set on `main` (see Consequences).

Adding a page becomes: one enum member, one order-array entry, and content in
thirteen files. Nothing else.

## Alternatives

**One physical `page.tsx` per page** — the shape the existing 28 pages use.
Rejected: it is the status quo that produces the four unfanned layers above.
100 near-identical route files is 100 opportunities for one to drift, and the
`sitemap-coverage.test.ts` bidirectional check makes each one mandatory
busy-work rather than a real decision.

**One dynamic route for the whole marketing surface** (`/[...slug]`). Rejected:
it would swallow the 28 existing pages, each of which genuinely has its own
layout and components, and it makes every page's shape a runtime lookup rather
than a compile-time fact. It also breaks the `sitemap-coverage.test.ts` seam,
which reads routes off disk — a single catch-all route would satisfy the test
for pages that do not exist.

**A CMS or MDX pipeline.** Rejected: it moves 13-locale content out of the type
system, and `TranslationDictionary` exhaustiveness plus the per-locale
completeness tests are the only thing standing between this work and nine
locales of untranslated English.

## Consequences

**Good.**

- A cluster's marginal page costs one enum member and content, not five edits
  across five files that no single test correlates.
- Batches stop conflicting in `public-page-seo.constants.ts`, which every batch
  would otherwise edit.
- Typecheck stays sane: exhaustiveness is enforced per cluster, so no single
  literal approaches the ~770 KB that would have resulted.

**Costs, accepted.**

- **`sitemap-coverage.test.ts` must learn about dynamic segments.** It currently
  walks `app/(marketing)` for `page.tsx` files and matches them to registry
  paths. A `[topic]` directory is one file standing for N paths, so the test
  gains a resolver that expands a dynamic segment through its order array.
  Without that change the test would report every cluster child as a registry
  entry with no route. This is the single riskiest part of this decision,
  because that test is the tripwire that stops a page going live unreviewed.
- **Lighthouse coverage changes shape.** `lighthouse-coverage.test.ts` asserts
  audited == indexable in both directions and therefore forbids sampling. At
  128 URLs × `numberOfRuns: 2` and a **measured 13.9 s per audit**, that is
  ~59–77 minutes on every frontend push and pull request, with
  `minScore: 1` on three categories — one flaky audit in 256 reds `main`.
  The test is amended to accept a per-cluster representative on pull requests
  while requiring the full set on `main`.
- **A dynamic route is easier to make dynamic-at-runtime by accident.** Every
  marketing page already reads `headers()` and renders per request, so this
  changes nothing today — but a cluster route that reads a database would be
  much harder to notice than a static file that does.

## Revisit when

- A cluster needs genuinely different layouts per child. At that point the
  cluster is two clusters, or those children graduate to their own routes.
- `sitemap-coverage.test.ts` becomes hard to reason about — that test is more
  valuable than this convenience, and the fan-out loses if the two conflict.
- The marketing surface stops growing. Below ~40 pages the physical-file shape
  is simpler and this indirection is not worth its cost.
