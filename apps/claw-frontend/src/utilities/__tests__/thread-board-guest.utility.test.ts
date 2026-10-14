import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { ThreadBoardAllFilter } from '@/enums/thread-board-all-filter.enum';
import { ThreadBoardMode } from '@/enums/thread-board-mode.enum';
import { ThreadBoardSort } from '@/enums/thread-board-sort.enum';
import {
  guestRegisterHref,
  guestReturnTarget,
  guestSignInHref,
  registerHrefFromSignIn,
} from '@/utilities/thread-board-guest.utility';
import { boardParamReader, isIndexableBoardView } from '@/utilities/thread-board-seo.utility';
import { isSameBoardState } from '@/utilities/thread-board-url-state.utility';
import { boardItemHref } from '@/utilities/thread-board-view.utility';

describe('guest sign-in links', () => {
  it('returns to the same view without the language prefix', () => {
    expect(guestReturnTarget('/ar/threads/board', 'q=rag&page=2')).toBe(
      '/threads/board?q=rag&page=2',
    );
    expect(guestReturnTarget('/threads/board', '')).toBe('/threads/board');
  });

  it('encodes the return target', () => {
    expect(guestSignInHref('/threads/board?q=a b')).toBe(
      '/login?returnTo=%2Fthreads%2Fboard%3Fq%3Da%20b',
    );
    expect(guestRegisterHref('/threads/x')).toBe('/register?returnTo=%2Fthreads%2Fx');
  });

  it('derives the sign-up link from a sign-in link', () => {
    expect(registerHrefFromSignIn('/login?returnTo=%2Fthreads%2Fx')).toBe(
      '/register?returnTo=%2Fthreads%2Fx',
    );
    expect(registerHrefFromSignIn('/somewhere-else')).toBe('/register');
  });
});

describe('boardItemHref', () => {
  it('sends a guest to the canonical public Thread page in their language', () => {
    expect(boardItemHref(ThreadBoardMode.Guest, 'a b', Locale.AR)).toBe('/ar/threads/a%20b');
  });

  it('sends a member to the portal reader', () => {
    expect(boardItemHref(ThreadBoardMode.Member, 'a-slug', Locale.AR)).toBe('/board/a-slug');
  });
});

describe('isSameBoardState', () => {
  const base = {
    q: '',
    sort: ThreadBoardSort.Latest,
    lang: ThreadBoardAllFilter.All,
    type: ThreadBoardAllFilter.All,
    page: 1,
  };

  it('compares every part of the view', () => {
    expect(isSameBoardState(base, { ...base })).toBe(true);
    expect(isSameBoardState(base, { ...base, q: 'x' })).toBe(false);
    expect(isSameBoardState(base, { ...base, sort: ThreadBoardSort.Liked })).toBe(false);
    expect(isSameBoardState(base, { ...base, lang: 'en' })).toBe(false);
    expect(isSameBoardState(base, { ...base, page: 2 })).toBe(false);
  });
});

describe('Board SEO rules', () => {
  it('indexes only the plain Board and its first page', () => {
    expect(isIndexableBoardView({})).toBe(true);
    expect(isIndexableBoardView({ page: '1' })).toBe(true);
    expect(isIndexableBoardView({ page: '2' })).toBe(false);
    expect(isIndexableBoardView({ q: 'rag' })).toBe(false);
    expect(isIndexableBoardView({ sort: 'liked' })).toBe(false);
    expect(isIndexableBoardView({ lang: 'ar' })).toBe(false);
    expect(isIndexableBoardView({ type: 'guide' })).toBe(false);
    expect(isIndexableBoardView({ q: ['a', 'b'] })).toBe(false);
  });

  it('reads the first value of a repeated query parameter', () => {
    const reader = boardParamReader({ q: ['first', 'second'], page: undefined });
    expect(reader.get('q')).toBe('first');
    expect(reader.get('page')).toBeNull();
    expect(reader.get('missing')).toBeNull();
  });
});
