import { BadRequestException, Injectable } from '@nestjs/common';
import { PUBLICATION_DISCOVERY_CURSOR_SCHEMA } from '../constants/publication-discovery.constants';
import { PublicationsRepository } from '../repositories/publications.repository';
import {
  type PublicDiscoveryQuery,
  publicDiscoveryQuerySchema,
  type PublicSitemapQuery,
  publicSitemapQuerySchema,
} from '../dto/public-discovery-query.dto';

@Injectable()
export class PublicationDiscoveryService {
  constructor(private readonly publications: PublicationsRepository) {}

  async list(input: PublicDiscoveryQuery) {
    const query = publicDiscoveryQuerySchema.parse(input);
    let cursor: { slug: string; publishedAt: Date } | null = null;
    if (query.cursor) {
      try {
        const decoded = Buffer.from(query.cursor, 'base64url').toString('utf8');
        const parsed = PUBLICATION_DISCOVERY_CURSOR_SCHEMA.safeParse(JSON.parse(decoded));
        if (!parsed.success) throw new Error('Invalid cursor');
        cursor = { slug: parsed.data.slug, publishedAt: new Date(parsed.data.publishedAt) };
      } catch {
        throw new BadRequestException('Invalid discovery cursor');
      }
    }
    const rows = await this.publications.findPublicDiscoveries(
      query.locale,
      cursor,
      query.limit + 1,
    );
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      items,
      nextCursor:
        hasMore && last
          ? Buffer.from(
              JSON.stringify({ slug: last.slug, publishedAt: last.publishedAt.toISOString() }),
            ).toString('base64url')
          : null,
    };
  }

  async sitemap(input: PublicSitemapQuery) {
    const query = publicSitemapQuerySchema.parse(input);
    const skip = query.page * query.limit;
    const [total, items] = await Promise.all([
      this.publications.countPublicDiscoveries(query.locale),
      this.publications.findPublicSitemapItems(query.locale, skip, query.limit),
    ]);
    return { total, page: query.page, limit: query.limit, items };
  }
}
