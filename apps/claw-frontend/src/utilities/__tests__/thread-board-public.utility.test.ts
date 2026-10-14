import { describe, expect, it, vi } from 'vitest';

import {
  toPublicBoardItem,
  toPublicBoardList,
  toPublicBoardSuggest,
} from '@/utilities/thread-board-public.utility';

const RAW_ITEM = {
  slug: 'clear-writing',
  title: 'Clear writing',
  excerpt: 'Short and plain.',
  contentLocale: 'en',
  publicationType: 'article',
  publishedAt: '2026-10-01T10:00:00.000Z',
  readingMinutes: 4,
  sourceCount: 3,
  likeCount: 7,
  commentCount: 2,
  viewCount: 120,
};

const PRIVATE_FIELDS = {
  ownerId: 'user-1',
  authorId: 'user-2',
  readerHash: 'abc',
  viewHash: 'def',
  safetyReasons: ['x'],
  safetyStatus: 'APPROVED',
  sourceSnapshot: { a: 1 },
  viewerReaction: 'LIKE',
};

describe('toPublicBoardItem', () => {
  it('keeps the public fields and nothing the server might add later', () => {
    const item = toPublicBoardItem({ ...RAW_ITEM, ...PRIVATE_FIELDS });
    expect(item).toEqual({ ...RAW_ITEM, viewerReaction: null });
    expect(Object.keys(item ?? {}).sort()).toEqual(
      [...Object.keys(RAW_ITEM), 'viewerReaction'].sort(),
    );
  });

  it('never carries a viewer-specific value', () => {
    expect(
      toPublicBoardItem({ ...RAW_ITEM, viewerReaction: 'DISLIKE' })?.viewerReaction,
    ).toBeNull();
  });

  it.each([
    ['not an object', 'text'],
    ['an array', [1]],
    ['null', null],
    ['no slug', { ...RAW_ITEM, slug: '' }],
    ['no title', { ...RAW_ITEM, title: undefined }],
    ['no locale', { ...RAW_ITEM, contentLocale: 5 }],
    ['an unknown type', { ...RAW_ITEM, publicationType: 'SECRET' }],
    ['no date', { ...RAW_ITEM, publishedAt: undefined }],
  ])('drops an item with %s', (_name, value) => {
    expect(toPublicBoardItem(value)).toBeNull();
  });

  it.each([
    ['Arabic', 'كيف-يعمل-التمثيل-الضوئي-a1b2c3d4'],
    ['Persian', 'فتوسنتز-در-گیاهان-a1b2c3d4'],
    ['Hindi (combining marks)', 'प्रकाश-संश्लेषण-कैसे-a1b2c3d4'],
    ['Japanese', '茶道-入門-a1b2c3d4'],
  ])('keeps a %s slug', (_name, slug) => {
    expect(toPublicBoardItem({ ...RAW_ITEM, slug })?.slug).toBe(slug);
  });

  it('still shows an item with an unexpected slug, and reports it once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = toPublicBoardItem({ ...RAW_ITEM, slug: '../odd slug' });
    toPublicBoardItem({ ...RAW_ITEM, slug: '../odd slug' });
    expect(first?.slug).toBe('../odd slug');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('keeps every item of a list, so the header count and the cards agree', () => {
    const list = toPublicBoardList({
      items: [
        RAW_ITEM,
        { ...RAW_ITEM, slug: 'فتوسنتز-a1b2c3d4' },
        { ...RAW_ITEM, slug: '茶道-a1b2c3d4' },
      ],
      meta: { total: 3 },
    });
    expect(list?.items).toHaveLength(3);
  });

  it('turns missing or invalid counts into zero and a missing excerpt into empty text', () => {
    const item = toPublicBoardItem({
      ...RAW_ITEM,
      excerpt: undefined,
      likeCount: -4,
      commentCount: 'many',
      viewCount: Number.NaN,
      sourceCount: 2.9,
    });
    expect(item).toMatchObject({
      excerpt: '',
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      sourceCount: 2,
    });
  });
});

describe('toPublicBoardList', () => {
  it('maps items, meta and the spelling hint', () => {
    const list = toPublicBoardList({
      items: [RAW_ITEM, { ...RAW_ITEM, slug: 'second', ownerId: 'u' }],
      meta: { total: 30, page: 2, limit: 12, totalPages: 3, nextCursor: 'secret' },
      didYouMean: 'writing',
    });
    expect(list?.items.map((item) => item.slug)).toEqual(['clear-writing', 'second']);
    expect(list?.meta).toEqual({ total: 30, page: 2, limit: 12, totalPages: 3 });
    expect(list?.didYouMean).toBe('writing');
  });

  it('skips unreadable items instead of failing the page', () => {
    const list = toPublicBoardList({ items: [RAW_ITEM, { slug: 1 }], meta: {} });
    expect(list?.items).toHaveLength(1);
    expect(list?.meta.total).toBe(1);
    expect(list?.meta.page).toBe(1);
    expect(list?.didYouMean).toBeNull();
  });

  it('returns null for a body that is not a list, so the caller can show an error', () => {
    expect(toPublicBoardList({ message: 'boom' })).toBeNull();
    expect(toPublicBoardList('an html page')).toBeNull();
    expect(toPublicBoardList(undefined)).toBeNull();
  });
});

describe('toPublicBoardSuggest', () => {
  it('keeps title, type, locale, date and valid highlight ranges only', () => {
    const result = toPublicBoardSuggest({
      suggestions: [
        { ...RAW_ITEM, ...PRIVATE_FIELDS, match: [[0, 5], [9, 3], 'x', [1]] },
        { slug: 'bad' },
      ],
      didYouMean: null,
      total: 12,
      totalCapped: true,
    });
    expect(result?.suggestions).toEqual([
      {
        slug: 'clear-writing',
        title: 'Clear writing',
        publicationType: 'article',
        contentLocale: 'en',
        publishedAt: '2026-10-01T10:00:00.000Z',
        match: [[0, 5]],
      },
    ]);
    expect(result).toMatchObject({ total: 12, totalCapped: true, didYouMean: null });
  });

  it('is null for an unreadable body', () => {
    expect(toPublicBoardSuggest({})).toBeNull();
  });
});
