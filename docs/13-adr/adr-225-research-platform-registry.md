# ADR-225: Research platform registry, academic and technical APIs, site-scoped social search

Status: Accepted (2026-11-28) · Research engine batch B3
([plan](../implementation/autonomous-research-engine-plan.md)) · Builds on
[ADR-224](adr-224-evidence-store-multi-query-and-research-rounds.md).

## Context

Research could only reach what a general web search happened to return. Academic, technical, community and official
sources were not searched on purpose, so a medical question got blog pages and a code question rarely reached GitHub or
Stack Overflow. The owner asked for "every relevant platform" without new paid search keys.

## Decision

1. **A data-driven registry** (`research_platforms`, research-service): slug, category (NEWS, ACADEMIC, TECHNICAL,
   SOCIAL, VIDEO, FORUM, OFFICIAL, REFERENCE, COMMERCE), access method, domains, languages, enabled, priority,
   result and time caps. 36 rows are seeded create-if-missing; an admin's edits are never overwritten. Admin CRUD and a
   test button: `/research/platforms` (admin + `RESEARCH_PROVIDERS_MANAGE`) and the frontend page of the same name.
2. **Two access methods only.** `OFFICIAL_API`: free public APIs that need no key (OpenAlex, Semantic Scholar, PubMed,
   Crossref, arXiv, Stack Exchange, Hacker News, GitHub, Wikipedia per language), on a fixed host allow-list checked
   before every request. `SITE_SEARCH`: `site:<domain>` through the expansion providers. Public pages only: no login,
   CAPTCHA or paywall bypass; platforms with no lawful free API are reached through search engines.
3. **The council chooses the source kinds.** Each member names up to four categories; they are ranked by how many
   winning members named them. A run uses them only from depth 2: at most 6 official APIs and 4 site searches, in
   priority order. Hits merge into the same rank fusion; items carry `platform` and `platformCategory`.
4. **Cost.** Official APIs are free. (Google's budget since [ADR-228](adr-228-google-in-every-research.md) is separate; site searches never go to Google.) Site searches run only on expansion providers and share the depth query budget.
   Every call records one `WEB_SEARCH` unit, as before. Rounds 2+ also send the primary query to expansion providers
   only (ADR-224).
5. **Keyword queries where an API needs every word** (GitHub, Stack Overflow): the query is cut to its first four
   keywords. Measured: the full question returned 0 results from both; the keywords returned 5 and 1.

## Consequences

- Measured on the local stack (2026-11-28): an Arabic heart-health question searched OpenAlex, Wikipedia, arXiv,
  PubMed, Crossref and the WHO site and answered with 50 citations; 8 of 9 official APIs answered a live check and
  Semantic Scholar rate-limits the shared unauthenticated pool (429s are reported per platform, never fatal).
- A deleted seeded row returns at the next boot: disable it instead.
- Site search quality depends on the expansion provider honouring `site:`; its fallbacks sometimes return
  low-relevance hits, which the relevance filter drops.
- Video platforms are searched through their public pages only. Captions are not fetched: YouTube's robots.txt
  disallows `/api/` (plan §6).
