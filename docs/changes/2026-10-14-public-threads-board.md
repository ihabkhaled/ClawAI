# Public Threads board for guests: SEO, discovery and docs (2026-10-14)

**Why.** The Board shipped behind login only, so the Threads that people publish could not be browsed by visitors. The owner wants a clear, easy-to-find, read-only Board in the marketing site, with the same smart search, so guests see the community's work and are invited to sign in to take part.

**What (this slice: SEO, discovery, copy and docs).**

- Content registry entry `threads/board` (path `/threads/board`, 13 locales, hreflang with `x-default`, ad-ineligible, publishable in feeds). The sitemap, `llms.txt` and RSS read the registry, so they pick it up with no code change.
- SEO copy and page intro in a new `thread-public-board-translations.ts` (13 locales, keys `chat.threadPublicBoardTitle`, `...Intro`, `...Cta`, `...SeoTitle`, `...SeoDescription`), wired flat into every locale file and `i18n.types.ts`. `threads-public-board-seo.constants.ts` derives the registry SEO copy from the same file and is added to `CLUSTER_SEO_SOURCES`.
- `buildPublicBoardJsonLd`: `CollectionPage` + `ItemList` for the first page of Threads (name and canonical URL only) + `BreadcrumbList`.
- Lighthouse (`lighthouserc.json`, `lighthouserc.pr.json`) and the responsive audit include `/threads/board`.
- Tests: translations (13 locales, copy length, registry derivation), JSON-LD builder, metadata (canonical, 14 hreflang entries, indexable, OpenGraph), registry page list and count, `robots.txt` (member `/board` blocked, `/threads/board` open).
- Docs: [ADR-178 addendum](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md) (supersedes "behind login, not linked"), [seo-content-architecture §10](../05-frontend/seo-content-architecture.md), [threads-board](../05-frontend/threads-board.md), the Threads product spec and flagship note.

**Not in this slice.** The page component, its search UI, the sign-in prompts, the guest read endpoints and the navigation and footer links are built by the frontend and threads-service work on the same feature. The sitemap-coverage test fails until the page file `app/(marketing)/threads/board/page.tsx` exists, by design (a published entry with no page is a crawl error).

**Decisions.**

| Question                       | Default chosen                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------ |
| URL                            | `/threads/board`, beside `/threads/discover`; a Thread slug can never equal it |
| Indexable or not               | Indexable, self-canonical; every Thread keeps its own canonical                |
| Member `/board`                | Unchanged: login, `noindex`, robots-disallowed, not in the sitemap             |
| Ad eligibility                 | Ineligible (a listing, not an editorial page)                                  |
| Thin-content defence (rule 38) | Heading plus 120+ character intro in every locale, tested                      |

**Risks.** Two lists of the same Threads (discover and board) could look duplicate; both link to the canonical Thread pages and differ in purpose (curated first page versus searchable full list). Revisit with Search Console data. Translations of the intro are first-pass; a native review is advised.
