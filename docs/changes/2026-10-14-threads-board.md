# Threads Board: browse, search and react to published Threads in the portal (2026-10-14)

**Why.** Published Threads were reachable only through public pages and direct links. Signed-in users had no list, no search and no way to find what others published. A search over revision JSON cannot be indexed, so a projection table is needed.

**What.**

- threads-service: table `thread_publication_search_docs` (projection, written in the publish, unpublish, revoke and approved-edit transactions), board list and suggest endpoints, one pure search normaliser, counter bumps in comment, reaction and view paths, a reconcile job, and a moderation revoke endpoint. Migration adds `pg_trgm`, `unaccent`, GIN and btree indexes and a backfill. Decision: [ADR-177](../13-adr/adr-177-threads-board-search-is-a-postgres-projection.md).
- Frontend: routes `/board` and `/board/[slug]`, hooks in `src/hooks/threads/board/`, components in `src/components/threads/board/`, URL-held state, 41 `chat.threadBoard*` keys x 13 locales in `thread-board-translations.ts`, sidebar entry beside Threads. Decision: [ADR-178](../13-adr/adr-178-the-board-is-a-portal-surface-seo-stays-on-threads-slug.md).
- Docs: [service guide](../04-backend/service-guide-threads.md), [frontend note](../05-frontend/threads-board.md), product spec, flagship note, database ownership map, workspace CLAUDE.md files, skill [add-a-board-search-language](../../skills/add-a-board-search-language.md).

**Files by area.** `apps/claw-threads-service` (prisma schema and migration, publications, board and moderation modules); `apps/claw-frontend` (app/(portal)/board, hooks, components, i18n locales); `docs/`, `skills/`, `context/`.

**Decisions and owner questions (defaults chosen).**

| Question                                                                     | Default chosen                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Authorship on cards                                                          | Nothing shown in v1 (privacy); API has no author field                      |
| Is a moderator role staffed                                                  | Unknown; the revoke endpoint ships with the Board so takedown exists        |
| Sidebar shape                                                                | Board as a sibling of Threads                                               |
| Language default                                                             | UI locale, with a visible "All languages" option                            |
| Trending formula and view weight                                             | Reaction, comment and view counts; formula tunable, unreviewed by the owner |
| CJK, Thai, Persian quality                                                   | Trigram "good enough"; add n-grams if live checks show poor results         |
| Prod unknowns (extension privilege, collation, cause of the community error) | Unverified; check before deploy                                             |
| Counter drift                                                                | Reconcile job; fall back to grouped count queries per page if too fragile   |
| Emoji on buttons                                                             | Only for reactions and toasts; decorative and `aria-hidden` elsewhere       |
| Redirect after publish                                                       | None                                                                        |

**Alternatives.** In-process fuzzy index; external engine. Compared in ADR-177.

**Risks.** Denormalised counters drift between reconcile runs. Extension privileges on prod are unconfirmed. Search quality for CJK, Thai and Persian is unverified. A feature flag defaults OFF; the OFF state must be tested.

**Not verified.** Nothing here has run live: no browser, device or load check, and no EXPLAIN on a 10k-row corpus. The [QA evidence record](../qa-evidence/2026-10-14-threads-board.md) lists every lane as NOT_RUN.

**What would make this stale.** A change to the visibility predicate, the contract fields, the normaliser, the throttles, the language filter default, or showing authors on cards.

## Wiring (integration)

- `BoardIndexModule` is imported by `PublicationsModule`, `PublicationModerationModule` and `PublicationCommunityModule`; Nest builds it once, so the 60 s reconcile timer starts once and `OnModuleDestroy` clears it.
- `PublicationLifecycleService` syncs the Board row after publish (also a repeat or a republish after unpublish) and after an edit, and removes it after unpublish. `BOARD_INDEX_PORT` (revoke and report-resolve) is bound to `BoardIndexService`; `BOARD_COUNTS_PORT` is bound to `BoardCountsAdapter`, which re-syncs the whole row from the source tables on a comment or reaction change (the passed totals are ignored). Every call is wrapped: a failure is logged and the reconcile heals it, the user's request never fails.
- Hiding one comment through a report does not push a count update; the row's comment count catches up on the next stale refresh (5 minutes).
- The search vector holds both the exact words (`simple`, what queries are parsed with) and the locale's stems, so `qubits` and `qubit` both find an English article that says `qubits`.
- One normaliser: `board-index/utilities/board-search-normalizer.utility.ts` serves the index, the query and the title highlight.
