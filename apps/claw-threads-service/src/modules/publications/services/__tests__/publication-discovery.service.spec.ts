import { BadRequestException } from '@nestjs/common';
import { PublicationDiscoveryService } from '../publication-discovery.service';
import { Locale } from '@claw/shared-types';

describe('PublicationDiscoveryService', () => {
  it('paginates public discoveries with an opaque stable cursor', async () => {
    const publishedAt = new Date('2026-10-05T12:00:00.000Z');
    const publications = {
      findPublicDiscoveries: vi.fn().mockResolvedValue([
        {
          slug: 'article-a',
          title: 'A',
          excerpt: 'A',
          contentLocale: 'en',
          publicationType: 'article',
          publishedAt,
        },
        {
          slug: 'article-b',
          title: 'B',
          excerpt: 'B',
          contentLocale: 'en',
          publicationType: 'article',
          publishedAt,
        },
      ]),
    };
    const service = new PublicationDiscoveryService(publications as never);

    const page = await service.list({ locale: Locale.EN, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    expect(Buffer.from(page.nextCursor!, 'base64url').toString('utf8')).toContain('article-a');
  });

  it('rejects malformed discovery cursors', async () => {
    const service = new PublicationDiscoveryService({ findPublicDiscoveries: vi.fn() } as never);
    await expect(
      service.list({ locale: Locale.EN, cursor: 'bad', limit: 10 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paged sitemap items with the locale count', async () => {
    const publications = {
      countPublicDiscoveries: vi.fn().mockResolvedValue(12),
      findPublicSitemapItems: vi.fn().mockResolvedValue([]),
    };
    const service = new PublicationDiscoveryService(publications as never);

    await expect(service.sitemap({ locale: Locale.AR, page: 1, limit: 5 })).resolves.toEqual({
      total: 12,
      page: 1,
      limit: 5,
      items: [],
    });
    expect(publications.findPublicSitemapItems).toHaveBeenCalledWith(Locale.AR, 5, 5);
  });
});
