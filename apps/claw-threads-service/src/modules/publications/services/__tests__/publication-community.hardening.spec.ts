import { NotFoundException } from '@nestjs/common';

import { PublicationCommunityService } from '../publication-community.service';

describe('PublicationCommunityService hardening', () => {
  function create(extra: { counts?: unknown; notifier?: unknown } = {}) {
    const publications = {
      setPublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 2, dislikes: 1, viewerReaction: 'LIKE' }),
      removePublicReaction: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 1, viewerReaction: null }),
      findPublicReactionSummary: vi
        .fn()
        .mockResolvedValue({ likes: 1, dislikes: 0, viewerReaction: 'LIKE' }),
    };
    const service = new PublicationCommunityService(
      publications as never,
      {} as never,
      extra.counts as never,
      extra.notifier as never,
    );
    return { service, publications };
  }

  it('passes the viewer so their own reaction is returned', async () => {
    const { service, publications } = create();
    await expect(service.getReactionSummary('s', 'user-1')).resolves.toMatchObject({
      viewerReaction: 'LIKE',
    });
    expect(publications.findPublicReactionSummary).toHaveBeenCalledWith('s', 'user-1');
  });

  it('returns empty data instead of 500 when a read throws unexpectedly', async () => {
    const { service, publications } = create();
    publications.findPublicReactionSummary.mockRejectedValue(new Error('boom'));
    await expect(service.getReactionSummary('s')).resolves.toEqual({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
  });

  it('keeps 404 for an unknown slug', async () => {
    const { service, publications } = create();
    publications.findPublicReactionSummary.mockResolvedValue(null);
    await expect(service.getReactionSummary('s')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates board counts after reactions, and survives a port failure', async () => {
    const counts = {
      commentsChanged: vi.fn().mockResolvedValue(undefined),
      reactionsChanged: vi.fn().mockRejectedValue(new Error('down')),
    };
    const { service } = create({ counts });
    await expect(service.setReaction('s', 'u', { value: 'LIKE' })).resolves.toMatchObject({
      likes: 2,
    });
    await service.removeReaction('s', 'u');
    expect(counts.reactionsChanged).toHaveBeenCalledWith('s', 2, 1);
    expect(counts.reactionsChanged).toHaveBeenCalledWith('s', 1, 1);
  });
});
