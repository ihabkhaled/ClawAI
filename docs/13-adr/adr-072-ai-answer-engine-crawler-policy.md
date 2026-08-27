# ADR-072: AI answer engines are invited by name, and the comparison cluster is a first-class page type

**Status**: Accepted
**Date**: 2026-08-27
**Deciders**: ClawAI core team
**Slice**: Multilingual discovery — AI-search eligibility

## Context

ClawAI was already discoverable in the classic sense: a sitemap index over
thirteen locales, per-locale and global RSS, reviewed-only canonicals and
hreflang, `robots.txt` derived from the content registry. None of that makes the
product answerable by an AI assistant.

The gap is procedural rather than technical. There is no "submit your site" form
for ChatGPT Search, Claude, Perplexity or Copilot. The whole of the opt-in is:

1. a crawler is allowed to fetch the page, and
2. the page states, in prose a model can lift, what the product is and how it
   differs from the thing the reader already uses.

The old `robots.ts` returned a single `User-agent: *` group. That is permissive
enough on paper — every named bot inherits it — but it left three problems:

- **No stated intent.** Nothing in the repository recorded whether AI crawling
  was allowed deliberately or by accident, so the first person to worry about it
  would have had no basis on which to change it.
- **Three different decisions collapsed into one.** Indexing for a results page,
  fetching to ground a live answer, and adding a page to a training corpus are
  separate questions. A single wildcard cannot express "yes to search, no to
  training" if that day ever comes.
- **Nothing to compare.** The pages answered "what is ClawAI"; none of them
  answered "why this instead of ChatGPT", which is the question an assistant is
  actually asked.

There is a trap in the mechanism. A `robots.txt` group naming a user agent is
read **instead of** the wildcard group, not in addition to it. Naming a friendly
bot without repeating the `Disallow` list would hand that bot the private portal
routes the wildcard group withholds — the change intended to be more welcoming
would have been a data-exposure bug.

## Decision

**1. Named crawler groups, built from one allow/disallow pair.**

`crawler-policy.constants.ts` declares three lists — `WEB_SEARCH_CRAWLERS`,
`AI_ANSWER_ENGINE_CRAWLERS`, `AI_TRAINING_CRAWLERS` — and `robots.ts` emits one
group per list plus the wildcard, every group built from the _same_ `allow` and
`disallow` arrays. The split is documentation of intent that happens to be
executable: a future "stop training, keep search" is one array, not an
archaeology exercise.

`robots.test.ts` asserts the private prefixes appear in **every** group, which is
the guard against the trap above.

**2. Training crawlers are allowed, deliberately.**

`GPTBot`, `ClaudeBot`, `CCBot` and the two permission-flag tokens
(`Google-Extended`, `Applebot-Extended`) are allowed. Everything they can reach
is the public marketing surface: reviewed, published, already-indexable copy that
exists to be read. A model that has read it can answer a question about ClawAI
with no live fetch at all, which serves the same goal as the answer-engine group
by a slower route. Customer data is not in scope — the private routes are
withheld from these groups exactly as from every other.

**3. `/llms.txt` is a convenience, never a substitute.**

One plain-text map of the public site, generated from
`PUBLIC_CONTENT_DEFINITIONS`. Nothing is authored in it, so an unpublished page
disappears from it in the same edit rather than lingering as a hand-maintained
link to a 404. It is not a standard any engine is required to honour, and it
carries no URL the sitemap does not already carry; it is offered because it is
free to keep correct. Like every other discovery document, it 404s when
`SITE_URL` says this deployment is not the canonical origin.

**4. Comparison pages are a page type, not five one-off pages.**

`/compare` plus `/compare/{chatgpt,claude,gemini,perplexity,copilot}`, all six in
the content registry, all thirteen locales, translated rather than English
everywhere.

Every rival is scored on the **same eight dimensions in the same order**
(`ComparisonDimension`). A comparison that picks different axes per competitor is
a sales page: the reader cannot hold two of them side by side, and neither can a
model. Fixed axes make the cluster mechanically honest.

Structured data is `WebPage` + `BreadcrumbList` + `FAQPage` in one `@graph`, and
**nothing more ambitious**. `Review`, `AggregateRating` and a `Product`
comparison all carry a verdict from a reviewer; inventing one for a page the
vendor wrote about its own competitors is the fabricated-review case that gets
structured data ignored and pages demoted. A test asserts those three types never
appear in the output.

Three properties are enforced by tests rather than by review discipline:

- the FAQ markup is generated from the same array the page renders, so the two
  cannot disagree (Google withdraws FAQ rich results when they do);
- every page names a case for choosing the competitor;
- every locale's copy differs from the English copy, because
  `getIndexablePagesForLocale` will happily put `/ja/compare/chatgpt` in the
  Japanese sitemap without knowing the body behind it is English.

**5. A visible, dated claim surface.**

`COMPARISON_REVIEW_DATE` is printed on every page, emitted as `dateModified`, and
carried as the registry `lastReviewed` for those six entries only — the other
pages keep the site-wide date, which says nothing about a competitor's roadmap.
Every page carries an independence disclaimer naming what ClawAI is not:
affiliated with, endorsed by, or reselling for any assistant on the page.

## Consequences

- ChatGPT Search, Claude, Perplexity, Copilot and Gemini grounding are **eligible**
  to fetch and cite ClawAI. Eligible is the whole of what a site can control;
  none of this guarantees a citation or a ranking.
- Six new URLs × 13 locales enter the sitemap, the RSS feeds and `/llms.txt`
  automatically, because all three derive from the registry.
- Lighthouse CI now audits 22 URLs instead of 16. `lighthouse-coverage.test.ts`
  enforces that in both directions, so the cost is visible rather than skipped.
- The comparison copy is a **maintenance obligation**. It describes five products
  that change monthly. Moving `COMPARISON_REVIEW_DATE` without re-checking the
  claims turns an honest page into a stale one that still looks current.
- Allowing training crawlers is revisitable in one array, and the ADR is where
  the reasoning lives if it is.

## Alternatives considered

**Leave `robots.txt` as a single wildcard group.** Already permissive, and
strictly less risky than naming agents. Rejected because the intent stayed
unrecorded and the three decisions stayed fused — the next person to ask "are we
opted into AI training?" would have had to infer the answer from an absence.

**Block training crawlers, allow only search.** Defensible, and the constants are
shaped so it stays a one-line change. Rejected for now: the only content in scope
is marketing copy written to be read, and a model that knows what ClawAI is can
answer questions about it without a live fetch.

**One dynamic `/compare/[rival]` route.** Fewer files. Rejected because
`sitemap-coverage.test.ts` exempts dynamic routes from the registry check by
design — a dynamic comparison route would have opted the whole cluster out of the
guard that keeps published pages and registry entries in step, to save five
twelve-line files.

**Ship English comparison copy in all thirteen locales**, matching the existing
`PUBLIC_LAUNCH_CONTENT_BY_LOCALE` precedent. Rejected: those pages predate the
locale-aware registry, and an English page indexed as Japanese is worse for
discovery than no Japanese page. The test that forbids it is deliberately strict.

## References

- [`apps/claw-frontend/src/constants/crawler-policy.constants.ts`](../../apps/claw-frontend/src/constants/crawler-policy.constants.ts)
- [`apps/claw-frontend/src/constants/public-comparison.constants.ts`](../../apps/claw-frontend/src/constants/public-comparison.constants.ts)
- [`docs/05-frontend/multilingual-discovery.md`](../05-frontend/multilingual-discovery.md)
- [`skills/publish-a-public-marketing-page.md`](../../skills/publish-a-public-marketing-page.md)
- [ADR-071](adr-071-discovery-feed-content-negotiation.md) — the discovery documents these pages enter
