import { ThreadPublicationType } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import type { ThreadBoardState } from '@/types/thread-board.types';

import {
  clampBoardPage,
  hasActiveBoardFilters,
  parseBoardUrlState,
  serialiseBoardUrlState,
} from '../thread-board-url-state.utility';

const parse = (qs: string, lang = 'en') => parseBoardUrlState(new URLSearchParams(qs), lang);

describe('parseBoardUrlState', () => {
  it('returns defaults for an empty URL', () => {
    expect(parse('')).toEqual({
      q: '',
      sort: ThreadBoardSort.Latest,
      lang: 'en',
      type: ThreadBoardAllFilter.All,
      page: 1,
    });
  });

  it.each([
    ['sort=trending', 'trending'],
    ['sort=discussed', 'discussed'],
    ['sort=liked', 'liked'],
    ['sort=bogus', 'latest'],
    ['sort=', 'latest'],
  ])('sort %s -> %s', (qs, expected) => {
    expect(parse(qs).sort).toBe(expected);
  });

  it.each([
    ['lang=all', 'all'],
    ['lang=fr', 'fr'],
    ['lang=xx', 'en'],
    ['lang=', 'en'],
  ])('lang %s -> %s', (qs, expected) => {
    expect(parse(qs).lang).toBe(expected);
  });

  it('uses the supplied default language', () => {
    expect(parse('', 'ar').lang).toBe('ar');
  });

  it.each([
    ['type=guide', 'guide'],
    ['type=research-article', 'research-article'],
    ['type=nope', 'all'],
    ['type=all', 'all'],
  ])('type %s -> %s', (qs, expected) => {
    expect(parse(qs).type).toBe(expected);
  });

  it.each([
    ['page=3', 3],
    ['page=0', 1],
    ['page=-2', 1],
    ['page=abc', 1],
    ['page=1.5', 1],
    ['page=99999', 1000],
  ])('page %s -> %s', (qs, expected) => {
    expect(parse(qs).page).toBe(expected);
  });

  it('trims and caps q', () => {
    expect(parse('q=%20%20hello%20').q).toBe('hello');
    expect(parse(`q=${'a'.repeat(500)}`).q).toHaveLength(200);
  });
});

describe('serialiseBoardUrlState', () => {
  const base: ThreadBoardState = {
    q: '',
    sort: ThreadBoardSort.Latest,
    lang: 'en',
    type: ThreadBoardAllFilter.All,
    page: 1,
  };

  it('omits defaults', () => {
    expect(serialiseBoardUrlState(base, 'en')).toBe('');
  });

  it('writes non-default values', () => {
    const out = serialiseBoardUrlState(
      {
        q: 'rag',
        sort: ThreadBoardSort.Liked,
        lang: 'all',
        type: ThreadPublicationType.GUIDE,
        page: 3,
      },
      'en',
    );
    const params = new URLSearchParams(out);
    expect(Object.fromEntries(params)).toEqual({
      q: 'rag',
      sort: ThreadBoardSort.Liked,
      lang: 'all',
      type: ThreadPublicationType.GUIDE,
      page: '3',
    });
  });

  it('round-trips', () => {
    const state: ThreadBoardState = {
      q: 'a b',
      sort: ThreadBoardSort.Trending,
      lang: 'fr',
      type: ThreadPublicationType.ARTICLE,
      page: 2,
    };
    expect(parse(serialiseBoardUrlState(state, 'en'))).toEqual(state);
  });

  it('clamps page', () => {
    expect(serialiseBoardUrlState({ ...base, page: 0 }, 'en')).toBe('');
    expect(clampBoardPage(Number.NaN)).toBe(1);
    expect(clampBoardPage(5000)).toBe(1000);
  });
});

describe('hasActiveBoardFilters', () => {
  const base: ThreadBoardState = {
    q: '',
    sort: ThreadBoardSort.Latest,
    lang: 'en',
    type: ThreadBoardAllFilter.All,
    page: 1,
  };

  it('is false for defaults, even with a non-default sort or page', () => {
    expect(hasActiveBoardFilters(base, 'en')).toBe(false);
    expect(hasActiveBoardFilters({ ...base, sort: ThreadBoardSort.Liked, page: 4 }, 'en')).toBe(
      false,
    );
  });

  it.each([{ q: 'x' }, { lang: 'all' }, { type: ThreadPublicationType.GUIDE }])(
    'is true for %o',
    (patch) => {
      expect(hasActiveBoardFilters({ ...base, ...patch }, 'en')).toBe(true);
    },
  );
});
