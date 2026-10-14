# ADR-182: All-threads sitemaps list every language under each app locale

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-178](adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md). Rules: [rule 38](../../rules/38-adsense-eligibility-and-low-value-content.md). Guide: [multilingual discovery](../05-frontend/multilingual-discovery.md).

## Context

`/sitemaps/<locale>/threads-N.xml` lists only Threads whose content language equals the locale. A reader in German could not be pointed at an Arabic or English Thread inside the German interface.

## Decision

1. Add `/sitemaps/<locale>/all-threads-N.xml` per app locale: every published, index-eligible public Thread in any content language, each URL `/<locale>/threads/<slug>`. The per-locale family is unchanged.
2. The Threads service sitemap endpoint takes an explicit `scope=all` (no locale); paging, order and visibility filter are shared with the per-locale path.
3. The index lists the family for every locale when one Thread of any language exists (one `scope=all` count, same page size).
4. No duplicate-content risk: the Thread page already canonicalises (and sets hreflang and Open Graph) to the content-language URL whatever app locale it is opened under, and renders the article with its own `lang` and `dir`. The extra URLs are discovery aids that point Google at the canonical.

## Consequences

Up to 13 URLs per Thread, one canonical. Sitemap size grows by locales x Threads (10,000 URLs per chunk). Revisit if Search Console reports "duplicate, Google chose different canonical" at scale.
