---
name: add-a-board-search-language
summary: Tune Threads Board search (normaliser, text-search config, trigram behaviour) for a new or weak locale.
task_keywords:
  [
    board search,
    threads board,
    search language,
    locale,
    normaliser,
    pg_trgm,
    tsvector,
    typo tolerance,
    didYouMean,
  ]
applies_to: [apps/claw-threads-service, apps/claw-frontend]
required_rules: [02-backend-rules, 08-security-rules, 20-i18n-and-user-facing-messages]
required_context: [database-ownership-map]
affected_workspaces: [apps/claw-threads-service, apps/claw-frontend]
required_tests: [normaliser spec, query spec]
required_docs:
  [
    docs/04-backend/service-guide-threads.md,
    docs/13-adr/adr-177-threads-board-search-is-a-postgres-projection.md,
  ]
validation_lane: the hooks (git commit, then git push) gate this change for its type — rules/23 gate matrix
---

# Skill: Add or tune a Board search language

The Board search ([ADR-177](../docs/13-adr/adr-177-threads-board-search-is-a-postgres-projection.md)) normalises text in one pure TypeScript function used for both the indexed columns and the query. Index and query must always agree.

## Steps

1. Collect real titles in the locale, with the typos users make (omission, swap, wrong accent or hamza).
2. Add the folding rules to the normaliser: NFKD, strip combining marks for Latin and Cyrillic only, never for Devanagari or Thai; Arabic-script folds (alef, ya, ta-marbuta, tashkeel, tatweel). Put every new rule in a spec with a before and after pair.
3. Pick the text-search config for the locale: a Postgres language config when one exists, otherwise `simple`. A query is parsed with the user's config and `simple`, so cross-language hits keep working.
4. For scripts without spaces (Chinese, Japanese, Thai) check that trigram matching on the normalised title finds a 2 to 3 character query. If it does not, add n-gram expansion in the normaliser step, not in SQL.
5. Reindex: the projection stores normalised text, so a normaliser change needs the search rows rebuilt (the reconcile job or a one-off rebuild); say which in the change record.
6. Test against the dev Postgres container (pg_trgm is not in pglite): list, suggest and "did you mean" with a typo, with accents, with the wrong script variant.
7. Check the tightened rules do not change other locales: run the normaliser spec for all 13.
8. Update the service guide and the change record, and the QA evidence lanes you actually ran.

## Do not

- Do not string-build SQL or pass user wildcards to ILIKE.
- Do not strip marks for Devanagari or Thai.
- Do not add an external search engine without a new ADR (it needs the full infra checklist, rule 05).
