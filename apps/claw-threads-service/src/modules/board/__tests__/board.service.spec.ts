import { describe, expect, it, vi } from 'vitest';

import type { BoardRepository } from '../repositories/board.repository';
import { BoardService } from '../services/board.service';
import type { BoardRow } from '../types/board.types';

const row = (slug: string, title = 'Kubernetes Guide'): BoardRow => ({
  slug,
  title,
  excerpt: 'e',
  contentLocale: 'en',
  publicationType: 'guide',
  publishedAt: new Date('2026-01-02T00:00:00Z'),
  readingMinutes: 3,
  sourceCount: 2,
  likeCount: 1,
  commentCount: 0,
  viewCount: 9,
  viewerReaction: 'LIKE',
});

function fake(overrides: Record<string, () => unknown> = {}): {
  repo: BoardRepository;
  mocks: Record<string, ReturnType<typeof vi.fn>>;
} {
  const mocks: Record<string, ReturnType<typeof vi.fn>> = {
    list: vi.fn().mockResolvedValue([row('a')]),
    count: vi.fn().mockResolvedValue(25),
    suggest: vi.fn().mockResolvedValue([row('a')]),
    suggestCount: vi.fn().mockResolvedValue(1),
    closestWords: vi.fn().mockResolvedValue([]),
  };
  for (const [key, value] of Object.entries(overrides)) mocks[key] = vi.fn(value);
  return { repo: mocks as unknown as BoardRepository, mocks };
}

const query = { sort: 'latest', lang: 'all', type: 'all', page: 2, limit: 12 } as const;

describe('BoardService.list', () => {
  it('returns items, meta and no suggestion when results are plentiful', async () => {
    const { repo, mocks } = fake();
    const result = await new BoardService(repo).list('u1', { ...query, q: 'Kubernetes' });
    expect(result.meta).toEqual({ total: 25, page: 2, limit: 12, totalPages: 3 });
    expect(result.items[0]?.publishedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(result.items[0]?.viewerReaction).toBe('LIKE');
    expect(result.didYouMean).toBeNull();
    expect(mocks['closestWords']).not.toHaveBeenCalled();
    expect(mocks['list']).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', q: 'kubernetes' }),
    );
  });

  it('suggests a correction on few hits', async () => {
    const { repo } = fake({
      count: () => Promise.resolve(0),
      list: () => Promise.resolve([]),
      closestWords: () => Promise.resolve([{ token: 'kubernets', word: 'kubernetes' }]),
    });
    const result = await new BoardService(repo).list('u1', { ...query, q: 'kubernets' });
    expect(result.didYouMean).toBe('kubernetes');
    expect(result.meta.totalPages).toBe(0);
  });

  it('skips didYouMean without a query', async () => {
    const { repo, mocks } = fake({ count: () => Promise.resolve(0) });
    const result = await new BoardService(repo).list('u1', query);
    expect(result.didYouMean).toBeNull();
    expect(mocks['closestWords']).not.toHaveBeenCalled();
  });
});

describe('BoardService.suggest', () => {
  it('adds match offsets and reports the real total', async () => {
    const { repo } = fake({ suggestCount: () => Promise.resolve(40) });
    const result = await new BoardService(repo).suggest({ q: 'guide', lang: 'all' });
    expect(result.suggestions[0]?.match).toEqual([[11, 16]]);
    expect(result).toMatchObject({ total: 40, totalCapped: false, didYouMean: null });
  });

  it('caps the total at 100', async () => {
    const { repo } = fake({ suggestCount: () => Promise.resolve(101) });
    const result = await new BoardService(repo).suggest({ q: 'guide', lang: 'all' });
    expect(result).toMatchObject({ total: 100, totalCapped: true });
  });

  it('returns empty for text that normalises to nothing', async () => {
    const { repo, mocks } = fake();
    const result = await new BoardService(repo).suggest({ q: '​', lang: 'all' });
    expect(result.suggestions).toEqual([]);
    expect(mocks['suggest']).not.toHaveBeenCalled();
  });
});
