import { Prisma } from '../../../generated/prisma';

/**
 * The SQL twin of `deriveOwnerPageStatus`. `p` is thread_publications. A DRAFT is judged by the
 * stored job state; NULL (not read yet) and GENERATING are both "generating".
 */
export const OWNER_PAGE_STATUS_SQL = Prisma.sql`(CASE
  WHEN p."status" = 'PUBLISHED' THEN 'PUBLISHED'
  WHEN p."status" = 'REVOKED' THEN 'FAILED'
  WHEN p."status" IN ('READY_FOR_REVIEW', 'UNPUBLISHED') THEN 'READY'
  WHEN p."generation_state" IN ('FAILED', 'CANCELLED') THEN 'FAILED'
  WHEN p."generation_state" = 'DONE' THEN 'READY'
  ELSE 'GENERATING'
END)`;

/**
 * The title the list shows, chosen exactly like `pickOwnerListTitle`: the newest revision, unless
 * it is STALE or PENDING and an approved one exists. Both come from the unique
 * (publication_id, revision) index with LIMIT 1, so each row costs two index probes.
 */
export const OWNER_PAGE_TITLE_JOINS = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT r."title", r."review_status"
    FROM "thread_publication_revisions" r
    WHERE r."publication_id" = p."id"
    ORDER BY r."revision" DESC
    LIMIT 1
  ) newest ON TRUE
  LEFT JOIN LATERAL (
    SELECT r."title"
    FROM "thread_publication_revisions" r
    WHERE r."publication_id" = p."id"
      AND r."review_status" = 'OWNER_APPROVED'
      AND r."safety_status" = 'APPROVED'
      AND r."index_eligible"
    ORDER BY r."revision" DESC
    LIMIT 1
  ) approved ON TRUE
  LEFT JOIN LATERAL (
    SELECT r."content"->>'markdown' AS "markdown"
    FROM "thread_publication_revisions" r
    WHERE r."publication_id" = p."id"
      AND r."title" = 'Untitled draft'
    ORDER BY r."revision" DESC
    LIMIT 1
  ) placeholder ON TRUE`;

/** The stored title the list picks (the SQL twin of `pickOwnerListTitle`). */
const PICKED_TITLE_SQL = Prisma.sql`(CASE
  WHEN newest."review_status" IN ('STALE', 'PENDING') AND approved."title" IS NOT NULL
    THEN approved."title"
  ELSE newest."title"
END)`;

/*
 * Constant POSIX patterns (never user input), written as SQL literals. Postgres has
 * standard_conforming_strings on, so a backslash in these literals reaches the regex engine as is.
 */
const LINK_PATTERN = Prisma.raw(String.raw`'!?\[([^\]]*)\]\([^)]*\)'`);
const MARK_PATTERN = Prisma.raw("'[*_`~>#]'");
const SPACE_PATTERN = Prisma.raw(String.raw`'\s+'`);
const HEADING_PATTERN = Prisma.raw(String.raw`'(?n)^#{1,6}[ \t]+(.*)$'`);
const FENCE_PATTERN = Prisma.raw(String.raw`'${'```'}[\s\S]*?${'```'}'`);
const SENTENCE_PATTERN = Prisma.raw(String.raw`'^.+?(?:[.!?؟。](?=\s|$)|$)'`);

/** Markdown marks stripped and whitespace folded: the SQL twin of `plain` in publication-title.utility. */
function plainSql(text: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`btrim(regexp_replace(regexp_replace(regexp_replace(${text}, ${LINK_PATTERN}, '\\1', 'g'), ${MARK_PATTERN}, '', 'g'), ${SPACE_PATTERN}, ' ', 'g'))`;
}

/**
 * The SQL twin of `derivePublicationTitle` for a placeholder-titled article: the first heading,
 * else the first sentence of the text without code fences, at most 120 characters. Empty when
 * nothing is readable (the stored placeholder then shows, as in `resolvePublicationTitle`).
 */
const DERIVED_TITLE_SQL = Prisma.sql`COALESCE(
  NULLIF(left(${plainSql(Prisma.sql`COALESCE(substring(placeholder."markdown" from ${HEADING_PATTERN}), '')`)}, 120), ''),
  NULLIF(left(btrim(COALESCE(substring(${plainSql(Prisma.sql`regexp_replace(COALESCE(placeholder."markdown", ''), ${FENCE_PATTERN}, ' ', 'g')`)} from ${SENTENCE_PATTERN}), '')), 120), ''),
  ''
)`;

/**
 * The title the list DISPLAYS (the same value `hydrate` returns as `title`): the picked stored
 * title, and for the placeholder "Untitled draft" the title derived from the article. NULL when
 * the publication has no revision at all (the UI then shows its own "Untitled").
 */
export const OWNER_PAGE_SHOWN_TITLE_SQL = Prisma.sql`(CASE
  WHEN ${PICKED_TITLE_SQL} IS NULL THEN NULL
  WHEN btrim(${PICKED_TITLE_SQL}) IN ('', 'Untitled draft')
    THEN COALESCE(NULLIF(${DERIVED_TITLE_SQL}, ''), ${PICKED_TITLE_SQL})
  ELSE ${PICKED_TITLE_SQL}
END)`;
