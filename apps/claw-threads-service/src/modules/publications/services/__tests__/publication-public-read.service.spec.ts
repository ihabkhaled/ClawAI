import { NotFoundException } from '@nestjs/common';

import { PublicationPublicReadService } from '../publication-public-read.service';

const record = {
  publicationId: 'pub-1',
  revision: 3,
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
  const translations = {
    listReadyLocales: vi.fn().mockResolvedValue(['ar', 'de']),
    findReady: vi.fn().mockResolvedValue({ title: 'عنوان', markdown: '# نص' }),
  };
  return {
    publications,
    identity,
    translations,
    service: new PublicationPublicReadService(
      publications as never,
      translations as never,
      identity as never,
    ),
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

  it('passes the gaps-disclosed flag through to the public payload (ADR-194)', async () => {
    const { service, publications } = create();
    publications.findPublic.mockResolvedValue({ ...record, gapsDisclosed: true });

    await expect(service.get('a-slug')).resolves.toMatchObject({ gapsDisclosed: true });
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

  it('serves the translated copy for ?lang and keeps the app free of it', async () => {
    const { service, translations } = create();
    const result = await service.get('a-slug', 'ar');
    expect(translations.findReady).toHaveBeenCalledWith('pub-1', 'ar', 3);
    expect(result).toMatchObject({
      title: 'عنوان',
      contentLocale: 'ar',
      sourceLocale: 'en',
      translated: true,
      availableLocales: ['en', 'ar', 'de'],
    });
    expect(result.content.markdown).toBe('# نص');
    expect(result).not.toHaveProperty('publicationId');
    expect(result).not.toHaveProperty('revision');
  });

  it('falls back to the written language when no current copy exists or the language is unknown', async () => {
    const { service, translations } = create();
    translations.listReadyLocales.mockResolvedValue([]);
    await expect(service.get('a-slug', 'ar')).resolves.toMatchObject({
      contentLocale: 'en',
      translated: false,
      availableLocales: ['en'],
    });
    translations.listReadyLocales.mockResolvedValue(['ar']);
    await expect(service.get('a-slug', 'xx')).resolves.toMatchObject({ translated: false });
    await expect(service.get('a-slug', 'en')).resolves.toMatchObject({ translated: false });
    expect(translations.findReady).not.toHaveBeenCalled();
  });
});
