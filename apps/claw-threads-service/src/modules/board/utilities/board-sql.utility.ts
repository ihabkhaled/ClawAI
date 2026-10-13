import { Prisma } from '../../../generated/prisma';
import {
  BOARD_ALL,
  BOARD_DID_YOU_MEAN_MIN_SIMILARITY,
  BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH,
  BOARD_SIMILARITY_THRESHOLD,
  BOARD_SUGGEST_LIMIT,
  BOARD_SUGGEST_TOTAL_CAP,
  BOARD_TRIGRAM_WEIGHT,
  BOARD_TS_CONFIG,
  BOARD_WORD_SIMILARITY_THRESHOLD,
} from '../constants/board.constants';
import type { BoardFilters, BoardListParams, BoardSort } from '../types/board.types';
import { TIE_BREAK, VISIBLE_FROM } from '../constants/board-sql.constants';
import { escapeLike } from './board-text.utility';

function tsQuery(q: string): Prisma.Sql {
  return Prisma.sql`websearch_to_tsquery(${BOARD_TS_CONFIG}::regconfig, ${q})`;
}

function titleScore(q: string): Prisma.Sql {
  return Prisma.sql`GREATEST(similarity(d.title_norm, ${q}), word_similarity(${q}, d.title_norm))`;
}

/** Relevance: full-text rank plus weighted trigram similarity of the title. */
export function relevanceScore(q: string): Prisma.Sql {
  return Prisma.sql`(ts_rank_cd(d.tsv, ${tsQuery(q)}) + ${BOARD_TRIGRAM_WEIGHT}::float8 * ${titleScore(q)})`;
}

function filterClauses(filters: BoardFilters): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [];
  if (filters.lang !== BOARD_ALL) clauses.push(Prisma.sql`d.content_locale = ${filters.lang}`);
  if (filters.type !== BOARD_ALL) clauses.push(Prisma.sql`d.publication_type = ${filters.type}`);
  return clauses;
}

function matchClause(q: string): Prisma.Sql {
  const contains = `%${escapeLike(q)}%`;
  return Prisma.sql`(
    d.tsv @@ ${tsQuery(q)}
    OR d.title_norm LIKE ${contains} ESCAPE '\\'
    OR similarity(d.title_norm, ${q}) >= ${BOARD_SIMILARITY_THRESHOLD}::float8
    OR word_similarity(${q}, d.title_norm) >= ${BOARD_WORD_SIMILARITY_THRESHOLD}::float8
  )`;
}

export function buildWhere(filters: BoardFilters): Prisma.Sql {
  const clauses = filterClauses(filters);
  if (filters.q) clauses.push(matchClause(filters.q));
  return clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}

export function buildOrderBy(sort: BoardSort, q: string): Prisma.Sql {
  if (q && sort === 'latest') return Prisma.sql`ORDER BY ${relevanceScore(q)} DESC, ${TIE_BREAK}`;
  switch (sort) {
    case 'trending':
      return Prisma.sql`ORDER BY (
        ((d.like_count - d.dislike_count) + 2 * d.comment_count + 0.1 * d.view_count)
        / POWER(EXTRACT(EPOCH FROM (now() - d.published_at)) / 86400.0 + 2, 1.2)
      ) DESC, ${TIE_BREAK}`;
    case 'discussed':
      return Prisma.sql`ORDER BY d.comment_count DESC, ${TIE_BREAK}`;
    case 'liked':
      return Prisma.sql`ORDER BY d.like_count DESC, ${TIE_BREAK}`;
    default:
      return Prisma.sql`ORDER BY ${TIE_BREAK}`;
  }
}

export function buildListQuery(params: BoardListParams): Prisma.Sql {
  const offset = (params.page - 1) * params.limit;
  return Prisma.sql`
    SELECT d.slug, d.title, d.excerpt, d.content_locale AS "contentLocale",
      d.publication_type AS "publicationType", d.published_at AS "publishedAt",
      d.reading_minutes AS "readingMinutes", d.source_count AS "sourceCount",
      d.like_count AS "likeCount", d.comment_count AS "commentCount", d.view_count AS "viewCount",
      rx.value::text AS "viewerReaction"
    FROM ${VISIBLE_FROM}
    LEFT JOIN thread_publication_reactions rx
      ON rx.publication_id = d.publication_id AND rx.user_id = ${params.userId}
    ${buildWhere(params)}
    ${buildOrderBy(params.sort, params.q)}
    LIMIT ${params.limit} OFFSET ${offset}`;
}

export function buildCountQuery(filters: BoardFilters): Prisma.Sql {
  return Prisma.sql`SELECT count(*)::int AS total FROM ${VISIBLE_FROM} ${buildWhere(filters)}`;
}

/** Title-first candidates: word-start prefix, trigram and full-text matches, prefix hits first. */
export function buildSuggestQuery(q: string, lang: string): Prisma.Sql {
  const filters: BoardFilters = { q, lang, type: BOARD_ALL };
  const escaped = escapeLike(q);
  return Prisma.sql`
    SELECT d.slug, d.title, d.publication_type AS "publicationType",
      d.content_locale AS "contentLocale", d.published_at AS "publishedAt"
    FROM ${VISIBLE_FROM}
    ${buildWhere(filters)}
    ORDER BY (d.title_norm LIKE ${`${escaped}%`} ESCAPE '\\' OR d.title_norm LIKE ${`% ${escaped}%`} ESCAPE '\\') DESC,
      ${relevanceScore(q)} DESC, ${TIE_BREAK}
    LIMIT ${BOARD_SUGGEST_LIMIT}`;
}

/** Counts matches but stops after the cap, so a broad query stays cheap. */
export function buildSuggestCountQuery(q: string, lang: string): Prisma.Sql {
  const filters: BoardFilters = { q, lang, type: BOARD_ALL };
  return Prisma.sql`
    SELECT count(*)::int AS total FROM (
      SELECT 1 FROM ${VISIBLE_FROM} ${buildWhere(filters)} LIMIT ${BOARD_SUGGEST_TOTAL_CAP + 1}
    ) capped`;
}

/** Closest title word per query word, from visible documents only. */
export function buildDidYouMeanQuery(tokens: readonly string[], lang: string): Prisma.Sql {
  const langClause = lang !== BOARD_ALL ? Prisma.sql`AND d.content_locale = ${lang}` : Prisma.empty;
  return Prisma.sql`
    SELECT t.token AS token, v.word AS word
    FROM unnest(${[...tokens]}::text[]) AS t(token)
    CROSS JOIN LATERAL (
      SELECT w.word
      FROM ${VISIBLE_FROM}
      CROSS JOIN LATERAL regexp_split_to_table(d.title_norm, '\\s+') AS w(word)
      WHERE char_length(w.word) >= ${BOARD_DID_YOU_MEAN_MIN_WORD_LENGTH}
        AND similarity(w.word, t.token) >= ${BOARD_DID_YOU_MEAN_MIN_SIMILARITY}::float8
        ${langClause}
      ORDER BY similarity(w.word, t.token) DESC, w.word ASC
      LIMIT 1
    ) v`;
}
