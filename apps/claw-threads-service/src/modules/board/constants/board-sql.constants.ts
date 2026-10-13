import { Prisma } from '../../../generated/prisma';

/**
 * The projection holds visible rows only, but a stale row must never leak, so every query also
 * joins the live visibility predicate (PUBLISHED, owner approved, safety approved, index eligible).
 */
export const VISIBLE_FROM = Prisma.sql`
  thread_publication_search_docs d
  JOIN thread_publications p ON p.id = d.publication_id
    AND p.status = 'PUBLISHED'::"PublicationStatus"
  AND EXISTS (
    SELECT 1 FROM thread_publication_revisions r
    WHERE r.publication_id = p.id
      AND r.review_status = 'OWNER_APPROVED'::"RevisionReviewStatus"
      AND r.safety_status = 'APPROVED'::"PublicationSafetyStatus"
      AND r.index_eligible = true
  )`;

export const TIE_BREAK = Prisma.sql`d.published_at DESC, d.slug DESC`;
