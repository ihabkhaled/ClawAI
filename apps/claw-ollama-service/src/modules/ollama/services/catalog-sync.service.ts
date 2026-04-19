import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfig } from '../../../app/config/app.config';
import {
  BusinessException,
  EntityNotFoundException,
} from '../../../common/errors/business.exception';
import type { ModelCatalogEntry } from '../../../generated/prisma';
import { ModelCatalogRepository } from '../repositories/model-catalog.repository';
import type {
  CreateCatalogEntryServiceInput,
  UpdateCatalogEntryServiceInput,
} from '../types/discovery.types';
import { DiscoverySourceService } from './discovery-source.service';
import { DiscoveryJobService } from './discovery-job.service';
import { DISCOVERY_DEFAULT_SOURCES } from '../constants/discovery.constants';

@Injectable()
export class CatalogSyncService implements OnModuleInit {
  private readonly logger = new Logger(CatalogSyncService.name);

  constructor(
    private readonly catalogRepo: ModelCatalogRepository,
    private readonly sourceService: DiscoverySourceService,
    private readonly jobService: DiscoveryJobService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const created = await this.sourceService.ensureDefaultSourcesExist(DISCOVERY_DEFAULT_SOURCES);
      if (created > 0) {
        this.logger.log(`seeded ${created} default discovery sources`);
      }
    } catch (error: unknown) {
      this.logger.warn(
        `failed to seed default sources: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'ollama-catalog-auto-refresh' })
  async scheduledRefresh(): Promise<void> {
    const config = AppConfig.get();
    if (!config.DISCOVERY_AUTO_REFRESH_ENABLED) {
      return;
    }
    try {
      this.logger.log('scheduled catalog refresh triggered');
      await this.jobService.triggerRefresh({
        isDryRun: false,
        triggeredBy: 'scheduler',
      });
    } catch (error: unknown) {
      this.logger.error(
        `scheduled refresh failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async createEntry(input: CreateCatalogEntryServiceInput): Promise<ModelCatalogEntry> {
    const existing = await this.catalogRepo.findByOllamaName(
      input.ollamaName ?? `${input.name}:${input.tag}`,
    );
    if (existing !== null) {
      throw new BusinessException(
        'A catalog entry with this ollamaName already exists',
        'DUPLICATE_CATALOG_ENTRY',
        HttpStatus.CONFLICT,
      );
    }
    return this.catalogRepo.createAdminEntry({
      name: input.name,
      tag: input.tag,
      displayName: input.displayName,
      category: input.category,
      description: input.description,
      parameterCount: input.parameterCount,
      runtime: input.runtime,
      ollamaName: input.ollamaName,
      isRecommended: input.isRecommended,
      capabilities: input.capabilities,
      businessCategories: input.businessCategories,
      hardwareProfiles: input.hardwareProfiles,
      isDiscovered: false,
    });
  }

  async updateEntry(id: string, input: UpdateCatalogEntryServiceInput): Promise<ModelCatalogEntry> {
    const existing = await this.catalogRepo.findById(id);
    if (existing === null) {
      throw new EntityNotFoundException('ModelCatalogEntry', id);
    }
    return this.catalogRepo.updateById(id, {
      displayName: input.displayName,
      category: input.category,
      description: input.description,
      parameterCount: input.parameterCount,
      ollamaName: input.ollamaName,
      isRecommended: input.isRecommended,
      capabilities: input.capabilities,
      businessCategories: input.businessCategories,
      hardwareProfiles: input.hardwareProfiles,
    });
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.catalogRepo.findById(id);
    if (existing === null) {
      throw new EntityNotFoundException('ModelCatalogEntry', id);
    }
    await this.catalogRepo.deleteById(id);
  }
}
