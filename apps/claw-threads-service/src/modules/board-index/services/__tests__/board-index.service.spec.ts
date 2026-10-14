import { describe, expect, it, vi } from 'vitest';

import type { BoardIndexSource, BoardIndexStore } from '../../types/board-index.types';
import { BoardIndexService } from '../board-index.service';

const SOURCE: BoardIndexSource = {
  publicationId: 'p1',
  slug: 'hello',
  contentLocale: 'en',
  publicationType: 'article',
  publishedAt: new Date('2026-10-01T00:00:00Z'),
  viewCount: 7,
  title: 'Crème Title',
  markdown: '# Heading\n\nSome **body** text here.',
  sourceCount: 2,
  likeCount: 3,
  dislikeCount: 1,
  commentCount: 4,
};

function fakeRepository(source: BoardIndexSource | null) {
  return {
    loadVisibleSource: vi.fn<BoardIndexStore['loadVisibleSource']>().mockResolvedValue(source),
    upsertDoc: vi.fn<BoardIndexStore['upsertDoc']>().mockResolvedValue(undefined),
    deleteDoc: vi.fn<BoardIndexStore['deleteDoc']>().mockResolvedValue(true),
    findChangedSince: vi.fn<BoardIndexStore['findChangedSince']>().mockResolvedValue([]),
    findStaleDocIds: vi.fn<BoardIndexStore['findStaleDocIds']>().mockResolvedValue([]),
    findOutdatedDocIds: vi.fn<BoardIndexStore['findOutdatedDocIds']>().mockResolvedValue([]),
    findInvisibleDocIds: vi.fn<BoardIndexStore['findInvisibleDocIds']>().mockResolvedValue([]),
  } satisfies BoardIndexStore;
}

describe('BoardIndexService', () => {
  it('upserts a normalised doc for a visible publication', async () => {
    const repository = fakeRepository(SOURCE);
    const service = new BoardIndexService(repository);
    await expect(service.syncPublication('p1')).resolves.toBe(true);
    expect(repository.deleteDoc).not.toHaveBeenCalled();
    expect(repository.upsertDoc).toHaveBeenCalledWith(
      expect.objectContaining({
        publicationId: 'p1',
        titleNorm: 'creme title',
        excerpt: 'Some body text here.',
        textSearchConfig: 'english',
        readingMinutes: 1,
        sourceCount: 2,
        likeCount: 3,
        commentCount: 4,
        viewCount: 7,
      }),
    );
  });

  it('deletes the row when the publication is not visible', async () => {
    const repository = fakeRepository(null);
    const service = new BoardIndexService(repository);
    await expect(service.syncPublication('p1')).resolves.toBe(false);
    expect(repository.deleteDoc).toHaveBeenCalledWith('p1');
    expect(repository.upsertDoc).not.toHaveBeenCalled();
  });

  it('removePublication deletes the row', async () => {
    const repository = fakeRepository(SOURCE);
    const service = new BoardIndexService(repository);
    await service.removePublication('p1');
    expect(repository.deleteDoc).toHaveBeenCalledWith('p1');
  });

  it('uses simple search config for an unmapped locale and caps the body', async () => {
    const repository = fakeRepository({
      ...SOURCE,
      contentLocale: 'ar',
      markdown: 'كلمة '.repeat(10_000),
    });
    const service = new BoardIndexService(repository);
    await service.syncPublication('p1');
    const doc = repository.upsertDoc.mock.calls[0]?.[0];
    expect(doc?.textSearchConfig).toBe('simple');
    expect(doc?.bodyNorm.length).toBeLessThanOrEqual(20_000);
  });
});
