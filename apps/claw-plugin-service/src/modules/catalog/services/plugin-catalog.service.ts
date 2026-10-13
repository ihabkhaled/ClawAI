import { Injectable, NotFoundException } from '@nestjs/common';

import { type CatalogDetailQuery, type CatalogListQuery } from '../dto/catalog-query.dto';
import { CatalogPresenterManager } from '../managers/catalog-presenter.manager';
import { CatalogRepository } from '../repositories/catalog.repository';
import { type CatalogCard, type CatalogDetail, type CatalogPage } from '../types/catalog.types';
import { resolveLocale } from '../utilities/resolve-locale.utility';

@Injectable()
export class PluginCatalogService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly presenter: CatalogPresenterManager,
  ) {}

  async list(query: CatalogListQuery, acceptLanguage: string | undefined): Promise<CatalogPage> {
    const locale = resolveLocale(query.locale, acceptLanguage);
    const entries = await this.repository.findVisibleEntries(query.category);
    const cards = entries
      .map((entry) => this.presenter.toCard(entry, locale))
      .filter((card): card is CatalogCard => card !== null)
      .filter((card) => this.matches(card, query.q));
    const start = this.startIndex(cards, query.cursor);
    const items = cards.slice(start, start + query.limit);
    const hasMore = start + query.limit < cards.length;
    return { items, nextCursor: hasMore ? (items.at(-1)?.slug ?? null) : null };
  }

  async detail(
    slug: string,
    query: CatalogDetailQuery,
    acceptLanguage: string | undefined,
  ): Promise<CatalogDetail> {
    const entry = await this.repository.findVisibleEntryBySlug(slug);
    const detail =
      entry === null
        ? null
        : this.presenter.toDetail(entry, resolveLocale(query.locale, acceptLanguage));
    if (detail === null) {
      throw new NotFoundException({ message: 'Plugin not found', errorCode: 'PLUGIN_NOT_FOUND' });
    }
    return detail;
  }

  private matches(card: CatalogCard, search: string | undefined): boolean {
    const needle = search?.toLowerCase();
    return needle === undefined || needle === ''
      ? true
      : [card.name, card.summary, card.slug, card.publisher].some((field) =>
          field.toLowerCase().includes(needle),
        );
  }

  /** Index after the cursor slug; an unknown cursor yields an empty page. */
  private startIndex(cards: CatalogCard[], cursor: string | undefined): number {
    if (cursor === undefined) return 0;
    const position = cards.findIndex((card) => card.slug === cursor);
    return position === -1 ? cards.length : position + 1;
  }
}
