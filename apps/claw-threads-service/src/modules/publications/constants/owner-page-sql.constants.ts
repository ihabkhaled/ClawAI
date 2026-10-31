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
  ) approved ON TRUE`;

export const OWNER_PAGE_SHOWN_TITLE_SQL = Prisma.sql`(CASE
  WHEN newest."review_status" IN ('STALE', 'PENDING') AND approved."title" IS NOT NULL
    THEN approved."title"
  ELSE newest."title"
END)`;
