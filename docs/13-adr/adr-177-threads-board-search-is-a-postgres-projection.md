# ADR-177: Threads Board search is a transactional Postgres projection with trigram fuzzy matching

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-159](adr-159-clawai-threads-two-service-architecture.md). Rules: [rule 02](../../rules/02-backend-rules.md), [rule 08](../../rules/08-security-rules.md), [rule 52](../../rules/52-every-schema-ships-a-migration.md). Companion: [ADR-178](adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md).

## Context

Published Threads were only reachable through public discovery pages and direct links. Signed-in users had no place to browse, search and react to them. Title and body live in revision JSON, `contentLocale` is on the parent row and counts live in other tables, so none of it can be indexed or sorted directly. The Board needs a list with sort and filters, a search-as-you-type dropdown with highlights, typo tolerance and a "did you mean" hint, in 13 locales including Arabic, Persian, CJK and Thai.

## Decision

threads-service owns one denormalised table, `thread_publication_search_docs` (Prisma model `ThreadPublicationSearchDoc`), and serves the Board from it with parameterised raw SQL.

Contract (prefix `/api/v1`, behind the normal auth guard):

- `GET /thread-publications/board?q&sort=latest|trending|discussed|liked&lang=<locale|all>&type=<publicationType|all>&page&limit=12|24|48` returns `{ items, meta: { total, page, limit, totalPages }, didYouMean }`. An item is `{ slug, title, excerpt, contentLocale, publicationType, publishedAt, readingMinutes, sourceCount, likeCount, commentCount, viewCount, viewerReaction }`. No author field exists.
- `GET /thread-publications/board/suggest?q&lang` returns up to 10 `{ slug, title, publicationType, contentLocale, publishedAt, match }` with `match` as `[start, end]` offsets, plus `didYouMean`, `total` and `totalCapped` (total is capped at 100).
- `POST /thread-publications-moderation/publications/:id/revoke` (permission `THREAD_PUBLICATIONS_MODERATE`) sets `REVOKED`, deletes the search row and writes an audit entry.

Projection rules:

- Rows exist only for publications that pass the public discovery predicate: PUBLISHED, OWNER_APPROVED, safety APPROVED and index eligible. Publish, unpublish, revoke and approved edits write the row in the same transaction. Delete and account deletion cascade (FK `ON DELETE CASCADE`).
- Counters (like, dislike, comment, view) are bumped in the existing transactional write paths. A reconcile job recomputes them to heal drift.
- Columns: publication id (PK), slug, locale, type, title, excerpt, normalised title, normalised body (first 20000 chars), reading minutes, source count, counters, published time, `tsv`, updated time.
- Extensions `pg_trgm` and `unaccent`. GIN on `tsv`, GIN `gin_trgm_ops` on the normalised title and body, btree on (locale, published time, slug) and (type, published time). GIN trigram indexes live in migration SQL only.
- One pure TypeScript normaliser serves both indexing and querying: NFKD, strip combining marks for Latin and Cyrillic only (never Devanagari or Thai), lowercase, fold Arabic alef, hamza, ya and ta-marbuta variants, strip tashkeel and tatweel, collapse whitespace, strip control characters.
- Ranking with `q` combines full-text rank with trigram similarity on the title; without `q`, each sort uses its own index path. Suggest is title-first, hard limit 10.
- Throttles: suggest is tighter than list (see the service guide). The query is trimmed, length capped, and never string-built into SQL.

Rollback and flag: the migration is additive and old code ignores the table. The Board ships behind a database-level setting that defaults OFF; OFF is the rollback lever and is tested as a state. Deploy order is migrate, threads-service, then frontend.

## Alternatives

|                | A. Postgres tsvector + pg_trgm projection (chosen)                                       | B. In-process fuzzy index (MiniSearch or Fuse)                                 | C. External engine (Meilisearch, Typesense, OpenSearch)            |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| Typo tolerance | Trigram similarity: good for omissions and transpositions, weaker on one-character words | Very good, configurable                                                        | Best out of the box                                                |
| Prefix speed   | GIN, milliseconds at 10^4 to 10^5 docs                                                   | Sub-millisecond, but every replica holds the index in RAM and rebuilds on boot | Milliseconds                                                       |
| Consistency    | Transactional with publish, unpublish and moderation                                     | Stale between rebuilds; takedown needs cross-replica invalidation              | Asynchronous; stale window                                         |
| Ops cost       | None new (extension in the existing Postgres image)                                      | Cold start and memory per replica                                              | New service in all 7 compose files plus nginx, health, CI, backups |
| 13 languages   | Own normaliser; CJK and Thai weaker                                                      | Own tokeniser; CJK needs n-grams                                               | Analyzers included, configured per language                        |
| Scale ceiling  | About 10^5 to 10^6 docs                                                                  | About 10^4 docs                                                                | Unlimited                                                          |

## Consequences

- A revoked or unpublished Thread disappears from list, suggest and "did you mean" in the same transaction.
- No new service, no new compose entry.
- Counters are denormalised and can drift between reconcile runs. If that proves too fragile, counts can be computed per page with grouped queries.
- CJK, Thai and Persian search quality is the weakest part and is unverified until the live lane runs; see [the skill](../../skills/add-a-board-search-language.md).
- Prod unknowns: privilege to create extensions, and a UTF-8 non-C collation.
- Revisit option C only if the corpus passes about 10^6 documents or ranking becomes the product's core.

## Addendum 2026-10-14: segmented ja/zh/th text, marker stripping, doc format version

- `normalizeSearchText` now splits Han, kana and Thai runs into words with `Intl.Segmenter` (dictionary chosen by script, not by article locale, so the index and any query always agree). A term inside an unspaced run (免疫 in 免疫系统) is now a real tsv term.
- Because that changes what is stored, `thread_publication_search_docs.doc_version` records the text format (`BOARD_DOC_FORMAT_VERSION`, now 2). The reconcile job re-indexes rows with an older version, 50 per tick, and `backfill()` still works.
- Internal source markers (`[b9e5088333f64bee]`, also doubled brackets) are stripped from title, excerpt and body before indexing.
- The stale-counter refresh inspects the 500 oldest idle rows per tick; only rows whose view/like/dislike/comment counts drifted are rebuilt, the rest are touched. The loop has a 20 s budget. Autovacuum is tuned (scale factor 0.05) on the table.
- A view now calls `BoardCountsPort.viewsChanged` (bounded to 2 s, failure-safe).
- `highlightRanges` (board-index utilities) gives fuzzy highlight ranges for a misspelt query word.

## Addendum 2026-10-14 (search performance, round 2)

- **Indexable operators.** Every trigram arm uses `title_norm % q` and `q <% title_norm`, not `similarity()>=` / `word_similarity()>=` calls, so the GIN indexes serve the query (a seq scan became a BitmapOr on a scratch copy). Thresholds are set per transaction with `set_config(..., true)` inside the repository (`BoardRepository.searching`), not with a database-level `ALTER DATABASE`: a pooled connection, a restored dump or another service on the same server can never change Board results. Measured: the server default `pg_trgm.word_similarity_threshold` is 0.6, outside the transaction, so the per-transaction setting is load-bearing; `%`/`<%` returned the same 3,200 rows as the function form.
- **Short text.** Under 3 characters a trigram index is useless. Suggest runs full-text plus a prefix `LIKE 'q%'` backed by a `text_pattern_ops` btree on `title_norm`; the list may also look inside the title. Suggest needs 2 characters, enforced in the DTO (`BOARD_QUERY_TOO_SHORT`) and again in the service.
- **Words, not operators.** The tsquery is `plainto_tsquery`. A leading `-`, quotes or `OR` are plain words, so `-vector` finds vector articles instead of surprisingly excluding them.
- **Did you mean** reads `thread_board_words` (`lang`, `word`, `freq`, trigram GIN) instead of splitting every title per request. `BoardMaintenanceService` rebuilds it, and the stored `trending_score`, every 2 minutes under an advisory lock; a score is rewritten only if it moved by more than 2%. Trending, discussed and liked each have a btree matching their ORDER BY.
- **Housekeeping.** The unused `body_norm` trigram index is dropped. The two composite indexes keep short names (`board_docs_locale_published_idx`, `board_docs_type_published_idx`) so `prisma migrate diff` shows only the GIN/prefix lines Prisma cannot model. Migration `20261014140000_board_search_perf` is additive and idempotent.
- **Input.** Search text with NUL, over 100 characters, or (suggest) under 2 characters is a 400 with `BOARD_QUERY_INVALID` / `BOARD_QUERY_TOO_LONG` / `BOARD_QUERY_TOO_SHORT`. A page number up to 100000 is accepted; beyond page 500 the list answers an empty page with real `meta`.

## Addendum 2026-10-14 (guest Board)

- Supersedes ADR-178's "the Board is behind login and not linked from marketing pages": guests get a public, indexable, linked Board on the marketing site. The signed-in `/board` stays authenticated. The canonical URL of every Thread stays `/threads/<slug>`.
- **Endpoints.** `GET /api/v1/thread-publications/public/board` and `.../public/board/suggest`, `@Public()`, in `BoardPublicController`. Same zod DTOs, error codes, SQL and visibility predicate as the signed-in routes; both controllers call the same `BoardService.list` / `suggest`, so they cannot drift (a spec compares response keys). A guest passes `userId = null`: no reaction join, `viewerReaction` is always `null`. Items never carry owner, author, hash or safety fields.
- **Limits and cache.** Per address 60/min (list) and 40/min (suggest), against 120 and 60 signed in. List `Cache-Control: public, s-maxage=60, stale-while-revalidate=30` (was 300; shortened 2026-10-14 so a shared cache never holds a new Thread back for six minutes), suggest `public, s-maxage=30`, `Vary: Accept-Language` only, never `Authorization`. A Board read never changes a counter. Page cap (500) and query limits are unchanged.
- **Route order.** `public/board` would match `PublicationPublicController` `public/:slug`, so `BoardModule` is imported before `PublicationsModule` in `AppModule` (a spec guards it). A Thread whose slug is exactly `board` is therefore not reachable through `/public/board`; slug generation must not issue it.
- **Nginx.** `/api/v1/thread-publications` is already proxied whole and nginx does not cache it, so no rule changed; the s-maxage headers serve a CDN in front.
