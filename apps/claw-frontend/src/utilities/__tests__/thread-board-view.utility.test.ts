import { describe, expect, it } from 'vitest';

import { BoardChipKind } from '@/enums/board-chip-kind.enum';
import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';

import {
  boardItemPath,
  buildBoardChips,
  countBoardFilters,
  toBoardSort,
  toBoardType,
} from '../thread-board-view.utility';

const t = (key: string): string => key;

describe('thread-board-view utility', () => {
  it('narrows unknown selects to defaults', () => {
    expect(toBoardSort('liked')).toBe(ThreadBoardSort.Liked);
    expect(toBoardSort('nope')).toBe(ThreadBoardSort.Latest);
    expect(toBoardType('nope')).toBe('all');
  });

  it('counts only non-all filters', () => {
    expect(countBoardFilters({ lang: 'all', type: 'all' })).toBe(0);
    expect(countBoardFilters({ lang: 'de', type: 'all' })).toBe(1);
    expect(countBoardFilters({ lang: 'de', type: 'guide' })).toBe(2);
  });

  it('builds chips for query and language only when set', () => {
    const chips = buildBoardChips({ q: ' hi ', lang: 'de', type: ThreadBoardAllFilter.All }, t);
    expect(chips.map((c) => c.kind)).toEqual([BoardChipKind.Query, BoardChipKind.Language]);
    expect(chips[0]?.label).toBe('"hi"');
    expect(buildBoardChips({ q: '', lang: 'all', type: ThreadBoardAllFilter.All }, t)).toEqual([]);
  });

  it('encodes slugs in the reader path', () => {
    expect(boardItemPath('a b')).toBe('/board/a%20b');
  });
});
