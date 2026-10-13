import { HttpException, NotFoundException } from '@nestjs/common';

import { PublicationCommunityService } from '../publication-community.service';

describe('PublicationCommunityService hardening', () => {
  function create(extra: { limit?: unknown; counts?: unknown } = {}) {
    const publications = {
      findPublicComments: vi.fn().mockResolvedValue([]),
      createPublicComment: vi.fn().mockResolvedValue({ id: 'c1' }),
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
      extra.limit as never,
      extra.counts as never,
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
    publications.findPublicComments.mockRejectedValue(new Error('boom'));
    publications.findPublicReactionSummary.mockRejectedValue(new Error('boom'));
    await expect(service.listComments('s')).resolves.toEqual([]);
    await expect(service.getReactionSummary('s')).resolves.toEqual({
      likes: 0,
      dislikes: 0,
      viewerReaction: null,
    });
  });

  it('keeps 404 for an unknown slug', async () => {
    const { service, publications } = create();
    publications.findPublicComments.mockResolvedValue(null);
    await expect(service.listComments('s')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('blocks a comment over the rate limit before writing', async () => {
    const limit = { assertAllowed: vi.fn().mockRejectedValue(new HttpException('x', 429)) };
    const { service, publications } = create({ limit });
    await expect(service.addComment('s', 'u', { content: 'hi' })).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(publications.createPublicComment).not.toHaveBeenCalled();
  });

  it('updates board counts after comment and reactions, and survives a port failure', async () => {
    const counts = {
      commentsChanged: vi.fn().mockResolvedValue(undefined),
      reactionsChanged: vi.fn().mockRejectedValue(new Error('down')),
    };
    const { service } = create({ counts });
    await service.addComment('s', 'u', { content: 'hi' });
    await expect(service.setReaction('s', 'u', { value: 'LIKE' })).resolves.toMatchObject({
      likes: 2,
    });
    await service.removeReaction('s', 'u');
    expect(counts.commentsChanged).toHaveBeenCalledWith('s');
    expect(counts.reactionsChanged).toHaveBeenCalledWith('s', 2, 1);
    expect(counts.reactionsChanged).toHaveBeenCalledWith('s', 1, 1);
  });
});
