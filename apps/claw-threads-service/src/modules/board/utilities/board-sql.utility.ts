import { Prisma } from '../../../generated/prisma';
import {
  BOARD_ALL,
  BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH,
  BOARD_DID_YOU_MEAN_MIN_SIMILARITY,
  BOARD_DID_YOU_MEAN_SHORT_MIN_SIMILARITY,
  BOARD_DID_YOU_MEAN_SHORT_WORD_MAX_LENGTH,
  BOARD_SIMILARITY_THRESHOLD,
  BOARD_SUGGEST_LIMIT,
  BOARD_SUGGEST_TOTAL_CAP,
  BOARD_TRIGRAM_MIN_LENGTH,
  BOARD_TRIGRAM_WEIGHT,
  BOARD_TS_CONFIG,
  BOARD_WORD_SIMILARITY_THRESHOLD,
} from '../constants/board.constants';
import type {
  BoardFilters,
  BoardListParams,
  BoardMatchMode,
  BoardSort,
} from '../types/board.types';
import { TIE_BREAK, VISIBLE_FROM } from '../constants/board-sql.constants';
import { charCount, escapeLike } from './board-text.utility';

/**
 * plainto_tsquery, not websearch_to_tsquery: user text is words, never operators, so a leading '-',
 * quotes or the word OR cannot exclude or re-shape a search (B-05).
 */
function tsQuery(q: string): Prisma.Sql {
  return Prisma.sql`plainto_tsquery(${BOARD_TS_CONFIG}::regconfig, ${q})`;
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

/** True when the text is too short for trigram matching to be useful or indexable. */
export function isShortQuery(q: string): boolean {
  return charCount(q) < BOARD_TRIGRAM_MIN_LENGTH;
}

/**
 * Every arm is indexable: tsv (GIN), LIKE (trigram GIN for 3+ characters, or the text_pattern_ops btree
 * for a prefix), `%` and `<%` (trigram GIN, thresholds set per transaction by the repository).
 * A short text uses full-text plus prefix only; the list may also look inside the title because a
 * submitted search is rare and bounded, but a keystroke suggestion never scans.
 */
function matchClause(q: string, mode: BoardMatchMode): Prisma.Sql {
  const escaped = escapeLike(q);
  const prefix = `${escaped}%`;
  if (isShortQuery(q)) {
    const inside = mode === 'list' ? `%${escaped}%` : prefix;
    return Prisma.sql`(
      d.tsv @@ ${tsQuery(q)}
      OR d.title_norm LIKE ${inside} ESCAPE '\\'
    )`;
  }
  return Prisma.sql`(
    d.tsv @@ ${tsQuery(q)}
    OR d.title_norm LIKE ${`%${escaped}%`} ESCAPE '\\'
    OR d.title_norm % ${q}
    OR ${q} <% d.title_norm
  )`;
}

export function buildWhere(filters: BoardFilters, mode: BoardMatchMode = 'list'): Prisma.Sql {
  const clauses = filterClauses(filters);
  if (filters.q) clauses.push(matchClause(filters.q, mode));
  return clauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}

export function buildOrderBy(sort: BoardSort, q: string): Prisma.Sql {
  if (q && sort === 'latest') return Prisma.sql`ORDER BY ${relevanceScore(q)} DESC, ${TIE_BREAK}`;
  switch (sort) {
    case 'trending':
      // Stored score (BoardMaintenanceService) so a btree can serve the order.
      return Prisma.sql`ORDER BY d.trending_score DESC, ${TIE_BREAK}`;
    case 'discussed':
      return Prisma.sql`ORDER BY d.comment_count DESC, ${TIE_BREAK}`;
    case 'liked':
      return Prisma.sql`ORDER BY d.like_count DESC, ${TIE_BREAK}`;
    default:
      return Prisma.sql`ORDER BY ${TIE_BREAK}`;
  }
}

function viewerReactionColumn(userId: string | null): Prisma.Sql {
  return userId === null
    ? Prisma.sql`NULL::text AS "viewerReaction"`
    : Prisma.sql`rx.value::text AS "viewerReaction"`;
}

function viewerReactionJoin(userId: string | null): Prisma.Sql {
  return userId === null
    ? Prisma.empty
    : Prisma.sql`LEFT JOIN thread_publication_reactions rx
      ON rx.publication_id = d.publication_id AND rx.user_id = ${userId}`;
}

export function buildListQuery(params: BoardListParams): Prisma.Sql {
  const offset = (params.page - 1) * params.limit;
  return Prisma.sql`
    SELECT d.slug, d.title, d.excerpt, d.content_locale AS "contentLocale",
      d.publication_type AS "publicationType", d.published_at AS "publishedAt",
      d.reading_minutes AS "readingMinutes", d.source_count AS "sourceCount",
      d.like_count AS "likeCount", d.comment_count AS "commentCount", d.view_count AS "viewCount",
      ${viewerReactionColumn(params.userId)}
    FROM ${VISIBLE_FROM}
    ${viewerReactionJoin(params.userId)}
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
    ${buildWhere(filters, 'suggest')}
    ORDER BY (d.title_norm LIKE ${`${escaped}%`} ESCAPE '\\' OR d.title_norm LIKE ${`% ${escaped}%`} ESCAPE '\\') DESC,
      ${relevanceScore(q)} DESC, ${TIE_BREAK}
    LIMIT ${BOARD_SUGGEST_LIMIT}`;
}

/** Counts matches but stops after the cap, so a broad query stays cheap. */
export function buildSuggestCountQuery(q: string, lang: string): Prisma.Sql {
  const filters: BoardFilters = { q, lang, type: BOARD_ALL };
  return Prisma.sql`
    SELECT count(*)::int AS total FROM (
      SELECT 1 FROM ${VISIBLE_FROM} ${buildWhere(filters, 'suggest')} LIMIT ${BOARD_SUGGEST_TOTAL_CAP + 1}
    ) capped`;
}

/** Sets the trigram operator thresholds for the current transaction only. */
export function buildThresholdQuery(): Prisma.Sql {
  return Prisma.sql`SELECT
    set_config('pg_trgm.similarity_threshold', ${String(BOARD_SIMILARITY_THRESHOLD)}, true),
    set_config('pg_trgm.word_similarity_threshold', ${String(BOARD_WORD_SIMILARITY_THRESHOLD)}, true)`;
}

/**
 * Closest dictionary word per query word. `%` lets the trigram GIN index pick candidates; the explicit
 * similarity floor keeps the result identical to the old per-request scan.
 */
export function buildDidYouMeanQuery(tokens: readonly string[], lang: string): Prisma.Sql {
  const langClause = lang !== BOARD_ALL ? Prisma.sql`AND w.lang = ${lang}` : Prisma.empty;
  return Prisma.sql`
    SELECT t.token AS token, v.word AS word
    FROM unnest(${[...tokens]}::text[]) AS t(token)
    CROSS JOIN LATERAL (
      SELECT w.word
      FROM thread_board_words w
      WHERE (
          (w.word % t.token
            AND similarity(w.word, t.token) >= ${BOARD_DID_YOU_MEAN_MIN_SIMILARITY}::float8)
          OR (char_length(t.token) <= ${BOARD_DID_YOU_MEAN_SHORT_WORD_MAX_LENGTH}
            AND left(w.word, 1) = left(t.token, 1)
            AND similarity(w.word, t.token) >= ${BOARD_DID_YOU_MEAN_SHORT_MIN_SIMILARITY}::float8)
        )
        AND char_length(w.word) <= ${BOARD_DID_YOU_MEAN_MAX_WORD_LENGTH}
        ${langClause}
      ORDER BY similarity(w.word, t.token) DESC, w.freq DESC, w.word ASC
      LIMIT 1
    ) v`;
}
