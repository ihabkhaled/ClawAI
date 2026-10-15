-- ADR-189 addendum: one title for a Thread everywhere. Legacy revisions carry the placeholder
-- "Untitled draft"; give them the first H1/H2 of their own article. Idempotent and safe: only rows
-- whose title EQUALS the placeholder change, only when the article has such a heading, and a real
-- title is never touched. A second run finds nothing to do. Articles without a heading keep the
-- placeholder in the row; the service resolves those at read time (first sentence).
WITH derived AS (
  SELECT
    r."id",
    left(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              substring(r."content"->>'markdown' from '(?n)^#{1,2}[ \t]+(.+)$'),
              '[ \t#]+$', ''
            ),
            '[*_`~>]', '', 'g'
          ),
          '\s+', ' ', 'g'
        )
      ),
      120
    ) AS "title"
  FROM "thread_publication_revisions" r
  WHERE r."title" = 'Untitled draft'
    AND jsonb_typeof(r."content"->'markdown') = 'string'
)
UPDATE "thread_publication_revisions" r
SET "title" = d."title"
FROM derived d
WHERE r."id" = d."id"
  AND r."title" = 'Untitled draft'
  AND d."title" IS NOT NULL
  AND d."title" <> '';

-- The Board's search document shows the same title as the page.
UPDATE "thread_publication_search_docs" s
SET "title" = latest."title"
FROM (
  SELECT DISTINCT ON (r."publication_id") r."publication_id", r."title"
  FROM "thread_publication_revisions" r
  WHERE r."title" <> 'Untitled draft'
  ORDER BY r."publication_id", r."revision" DESC
) latest
WHERE s."publication_id" = latest."publication_id"
  AND s."title" = 'Untitled draft';
