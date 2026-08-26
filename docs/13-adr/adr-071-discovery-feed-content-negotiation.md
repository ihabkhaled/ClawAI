# ADR-071: Discovery documents carry a stylesheet, and feeds negotiate their content type

**Status**: Accepted
**Date**: 2026-08-27
**Deciders**: ClawAI core team
**Slice**: Multilingual discovery — sitemaps and RSS

## Context

Chrome 151 removed the built-in XML pretty-printer. Every discovery document —
`/sitemap.xml`, `/sitemaps/{locale}/{document}`, `/feed.xml`, `/feeds/*.xml` —
therefore renders in a browser as one unbroken run of text: valid XML that reads
as a corrupt file. Crawlers were never affected; they parse markup, not
presentation. People checking a sitemap by eye had no way to tell a healthy
document from a damaged one, which is how the problem was reported.

Two properties had to survive any fix:

1. **Google must still parse the documents.** The sitemap protocol is the
   contract; presentation may not touch it.
2. **Feed readers must still recognise the feeds.** `application/rss+xml` is the
   type they look for.

The second one is where the tension lives: Chrome treats every feed MIME as
"display the source" and will not apply a stylesheet to such a response, no
matter what the document asks for.

## Decision

**Two mechanisms, one for each half of the problem.**

Every discovery document emits
`<?xml-stylesheet type="text/xsl" href="/discovery.xsl"?>` between the XML
declaration and the document element. `/discovery.xsl` is one stylesheet with a
template per root — `sitemapindex`, `urlset`, `rss` — served from a route handler
with an explicit `text/xsl` content type. XML parsers ignore the instruction, so
the data is byte-identical for a crawler, and Google documents support for
styled sitemaps.

**Feed responses choose their content type from `Accept`**: a request announcing
`text/html` (a browser navigation) receives `application/xml`, anything else
receives `application/rss+xml`. The body is identical either way. Responses carry
`Vary: Accept` so a shared cache cannot serve one caller the other's type.

## Alternatives considered

- **Serve `application/xml` to everyone.** Rejected — it demotes the canonical
  feed type for the audience feeds exist for. Some readers discriminate on it,
  and the cost is paid by every subscriber to spare one browser tab.
- **Leave the feeds as source and style only the sitemaps.** Rejected — the same
  complaint applies to both surfaces, and "the sitemap is readable but the feed
  is soup" is an arbitrary split nobody can predict from the outside.
- **A stylesheet file in `public/`.** Rejected — every response carries
  `X-Content-Type-Options: nosniff`, and a stylesheet delivered under a guessed
  type is refused by the browser, which reproduces the original symptom with no
  visible cause. A route states the type outright.
- **Wait for browsers to restore the XML viewer.** Rejected — it was removed
  deliberately, and author XSLT is the supported replacement.

## Consequences

- The bytes a crawler reads are unchanged apart from one processing instruction,
  and `sitemap-google-readability.test.ts` asserts it sits outside the document
  element where a parser will skip it.
- Anyone "fixing" the feed content type back to an unconditional
  `application/rss+xml` silently restores the unreadable browser view. The
  negotiation lives in `utilities/discovery-content-type.utility.ts` with that
  reason written at the call site, and a test pins both branches.
- `Vary: Accept` is now load-bearing on the feed routes. Removing it lets a CDN
  hand a feed reader the browser's answer.
- One stylesheet serves three document shapes; adding a fourth root means adding
  a template rather than a file.
