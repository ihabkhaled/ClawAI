import { Prisma } from '../../../generated/prisma';
import {
  OWNER_PAGE_SHOWN_TITLE_SQL,
  OWNER_PAGE_STATUS_SQL,
  OWNER_PAGE_TITLE_JOINS,
} from '../constants/owner-page-sql.constants';
import type { OwnerPageFilter } from '../types/owner-publication-page.types';

/** Escapes the three LIKE metacharacters so user text is matched literally (`ESCAPE '\'`). */
export function escapeLikePattern(text: string): string {
  return text.replaceAll(/[\\%_]/g, String.raw`\$&`);
}

function whereClause(filter: OwnerPageFilter): Prisma.Sql {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."owner_id" = ${filter.ownerId}`];
  if (filter.status !== 'ALL')
    conditions.push(Prisma.sql`${OWNER_PAGE_STATUS_SQL} = ${filter.status}`);
  if (filter.q) {
    // ILIKE on an escaped literal: no regex, so no ReDoS. A scan bounded to this owner's rows.
    const pattern = `%${escapeLikePattern(filter.q)}%`;
    conditions.push(Prisma.sql`${OWNER_PAGE_SHOWN_TITLE_SQL} ILIKE ${pattern} ESCAPE '\\'`);
  }
  return Prisma.join(conditions, ' AND ');
}

/** The ids of one page, newest first; the id breaks ties so pages never overlap or skip. */
export function buildOwnerPageIdsQuery(
  filter: OwnerPageFilter,
  limit: number,
  offset: number,
): Prisma.Sql {
  return Prisma.sql`
    SELECT p."id" AS "id"
    FROM "thread_publications" p
    ${filter.q ? OWNER_PAGE_TITLE_JOINS : Prisma.empty}
    WHERE ${whereClause(filter)}
    ORDER BY p."created_at" DESC, p."id" DESC
    LIMIT ${limit} OFFSET ${offset}`;
}

/** COUNT of the same filter, for `total`. */
export function buildOwnerPageCountQuery(filter: OwnerPageFilter): Prisma.Sql {
  return Prisma.sql`
    SELECT COUNT(*)::int AS "total"
    FROM "thread_publications" p
    ${filter.q ? OWNER_PAGE_TITLE_JOINS : Prisma.empty}
    WHERE ${whereClause(filter)}`;
}
