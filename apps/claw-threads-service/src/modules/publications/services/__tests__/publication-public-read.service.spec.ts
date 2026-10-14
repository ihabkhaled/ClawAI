import { NotFoundException } from '@nestjs/common';

import { PublicationPublicReadService } from '../publication-public-read.service';

const record = {
  slug: 'a-slug',
  ownerId: 'owner-1',
  title: 'A Title',
  contentLocale: 'en',
  publicationType: 'article',
  content: { markdown: '# x', citations: [] },
  publishedAt: new Date('2026-10-01T00:00:00Z'),
  viewCount: 5,
  readerCount: 2,
};

function create() {
  const publications = { findPublic: vi.fn().mockResolvedValue(record) };
  const identity = {
    resolveOne: vi.fn().mockResolvedValue({ username: 'ada', displayName: 'Ada' }),
  };
  return {
    publications,
    identity,
    service: new PublicationPublicReadService(publications as never, identity as never),
  };
}

describe('PublicationPublicReadService', () => {
  it('adds the publisher name and never exposes the owner id', async () => {
    const { service, identity } = create();
    const result = await service.get('a-slug');
    expect(identity.resolveOne).toHaveBeenCalledWith('owner-1');
    expect(result.owner).toEqual({ username: 'ada', displayName: 'Ada' });
    expect(result).not.toHaveProperty('ownerId');
    expect(result.title).toBe('A Title');
  });

  it('leaves the owner null when the account is gone or the name cannot be read', async () => {
    const { service, identity, publications } = create();
    identity.resolveOne.mockResolvedValue(null);
    await expect(service.get('a-slug')).resolves.toMatchObject({ owner: null });
    publications.findPublic.mockResolvedValue({ ...record, ownerId: null });
    await expect(service.get('a-slug')).resolves.toMatchObject({ owner: null });
  });

  it('is 404 for an unknown or unpublished slug', async () => {
    const { service, publications } = create();
    publications.findPublic.mockResolvedValue(null);
    await expect(service.get('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});
