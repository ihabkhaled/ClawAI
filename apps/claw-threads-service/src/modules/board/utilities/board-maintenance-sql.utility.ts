import { Prisma } from '../../../generated/prisma';
import {
  BOARD_TRENDING_REWRITE_FLOOR,
  BOARD_TRENDING_REWRITE_SHARE,
} from '../constants/board.constants';

/** Distinct visible title words per locale with how many titles use each. */
function visibleWords(visibleFrom: Prisma.Sql, minLength: number, maxLength: number): Prisma.Sql {
  return Prisma.sql`
    SELECT d.content_locale AS lang, w.word AS word, count(*)::int AS freq
    FROM ${visibleFrom}
    CROSS JOIN LATERAL regexp_split_to_table(d.title_norm, ' ') AS w(word)
    WHERE char_length(w.word) BETWEEN ${minLength} AND ${maxLength}
    GROUP BY d.content_locale, w.word`;
}

/** Adds new words and corrects changed frequencies; untouched rows are not rewritten. */
export function buildDictionaryUpsertQuery(
  visibleFrom: Prisma.Sql,
  minLength: number,
  maxLength: number,
): Prisma.Sql {
  return Prisma.sql`
    INSERT INTO thread_board_words (lang, word, freq)
    SELECT lang, word, freq FROM (${visibleWords(visibleFrom, minLength, maxLength)}) v
    ON CONFLICT (lang, word) DO UPDATE SET freq = EXCLUDED.freq
    WHERE thread_board_words.freq IS DISTINCT FROM EXCLUDED.freq`;
}

/** Removes words that no visible title uses any more. */
export function buildDictionaryDeleteQuery(
  visibleFrom: Prisma.Sql,
  minLength: number,
  maxLength: number,
): Prisma.Sql {
  return Prisma.sql`
    DELETE FROM thread_board_words b
    WHERE NOT EXISTS (
      SELECT 1 FROM (${visibleWords(visibleFrom, minLength, maxLength)}) v
      WHERE v.lang = b.lang AND v.word = b.word
    )`;
}

/**
 * Recomputes the stored trending score (counters weighed, divided by age^1.2). A row is only written
 * when the score moved by more than a small share, so a quiet board does not rewrite every index each pass.
 */
export function buildTrendingRefreshQuery(): Prisma.Sql {
  return Prisma.sql`
    UPDATE thread_publication_search_docs d SET trending_score = s.score
    FROM (
      SELECT publication_id,
        ((like_count - dislike_count) + 2 * comment_count + 0.1 * view_count)
          / POWER(EXTRACT(EPOCH FROM (now() - published_at)) / 86400.0 + 2, 1.2) AS score
      FROM thread_publication_search_docs
    ) s
    WHERE s.publication_id = d.publication_id
      AND abs(d.trending_score - s.score)
        > ${BOARD_TRENDING_REWRITE_FLOOR}::float8 + ${BOARD_TRENDING_REWRITE_SHARE}::float8 * abs(s.score)`;
}
