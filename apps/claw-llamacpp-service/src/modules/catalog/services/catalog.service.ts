import { Injectable, Logger } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors';
import { CatalogRepository } from '../repositories/catalog.repository';
import { CatalogRefreshManager } from '../managers/catalog-refresh.manager';
import {
  type CatalogEntry,
  type CatalogListFilters,
  type CatalogListResult,
} from '../types/catalog.types';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly repo: CatalogRepository,
    private readonly refreshManager: CatalogRefreshManager,
  ) {}

  async list(filters: CatalogListFilters): Promise<CatalogListResult> {
    this.logger.debug(`list: filters=${JSON.stringify(filters)}`);
    const { rows, total } = await this.repo.list(filters);
    return { data: rows, total, nextCursor: null };
  }

  async findById(id: string): Promise<CatalogEntry> {
    this.logger.debug(`findById: id=${id}`);
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', id);
    }
    return entry;
  }

  async refresh(): Promise<{ refreshed: number; failed: number }> {
    this.logger.log('refresh: triggering catalog refresh');
    const { rows } = await this.repo.list({ limit: 200 });
    return this.refreshManager.refreshAll(rows);
  }
}
