import { describe, expect, it } from 'vitest';

import { VISIBLE_FROM } from '../constants/board-sql.constants';
import {
  buildDictionaryDeleteQuery,
  buildDictionaryUpsertQuery,
  buildTrendingRefreshQuery,
} from '../utilities/board-maintenance-sql.utility';

describe('board maintenance SQL', () => {
  it('builds the dictionary from visible documents only, idempotently', () => {
    const upsert = buildDictionaryUpsertQuery(VISIBLE_FROM, 3, 64);
    expect(upsert.sql).toContain("p.status = 'PUBLISHED'");
    expect(upsert.sql).toContain('ON CONFLICT (lang, word) DO UPDATE');
    expect(upsert.sql).toContain('IS DISTINCT FROM');
    expect(upsert.values).toEqual([3, 64]);
  });

  it('removes words no visible title uses', () => {
    const remove = buildDictionaryDeleteQuery(VISIBLE_FROM, 3, 64);
    expect(remove.sql).toContain('DELETE FROM thread_board_words');
    expect(remove.sql).toContain('NOT EXISTS');
    expect(remove.sql).toContain('index_eligible = true');
  });

  it('rewrites a trending score only when it moved materially', () => {
    const refresh = buildTrendingRefreshQuery();
    expect(refresh.sql).toContain('SET trending_score');
    expect(refresh.sql).toContain('POWER');
    expect(refresh.sql).toContain('abs(d.trending_score - s.score)');
    expect(refresh.values).toEqual([0.001, 0.02]);
  });
});
