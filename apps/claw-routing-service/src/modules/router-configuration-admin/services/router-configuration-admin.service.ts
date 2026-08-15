import { HttpStatus, Injectable } from '@nestjs/common';
import { RouterConfigurationStatus } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { RouterConfigurationRepository } from '../../routing/repositories/router-configuration.repository';
import {
  type ChainEntryInputDto,
  type UpdateChainEntriesDto,
} from '../dto/update-chain-entries.dto';
import { type CreateRouterConfigurationDto } from '../dto/create-router-configuration.dto';
import { type ListRouterConfigurationsQueryDto } from '../dto/list-router-configurations-query.dto';
import type {
  ChainEntryInput,
  RouterConfigurationDetail,
  RouterConfigurationSummary,
} from '../types/router-configuration-admin.types';

@Injectable()
export class RouterConfigurationAdminService {
  constructor(private readonly repository: RouterConfigurationRepository) {}

  async list(
    query: ListRouterConfigurationsQueryDto,
  ): Promise<PaginatedResult<RouterConfigurationSummary>> {
    const { page, limit } = query;
    const { items, total } = await this.repository.listRevisions({
      scope: query.scope,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async getById(id: string): Promise<RouterConfigurationDetail> {
    const revision = await this.repository.findRevisionById(id);
    if (revision === null) {
      throw new EntityNotFoundException('RouterConfiguration', id);
    }
    return revision;
  }

  async createDraft(dto: CreateRouterConfigurationDto): Promise<RouterConfigurationDetail> {
    return this.repository.createDraft(dto.scope);
  }

  async updateEntries(id: string, dto: UpdateChainEntriesDto): Promise<RouterConfigurationDetail> {
    const revision = await this.getById(id);
    if (revision.status !== RouterConfigurationStatus.DRAFT) {
      throw new BusinessException(
        `RouterConfiguration '${id}' is ${revision.status}, not DRAFT — only a draft's chain entries may be edited`,
        'REVISION_NOT_DRAFT',
        HttpStatus.CONFLICT,
      );
    }

    const entries = dto.entries.map((entry) => this.toChainEntryInput(entry));
    const updated = await this.repository.replaceEntries(id, entries);
    if (updated === null) {
      throw new EntityNotFoundException('RouterConfiguration', id);
    }
    return updated;
  }

  async publish(id: string, actingUserId: string): Promise<RouterConfigurationDetail> {
    const revision = await this.getById(id);
    if (revision.status !== RouterConfigurationStatus.DRAFT) {
      throw new BusinessException(
        `RouterConfiguration '${id}' is ${revision.status}, not DRAFT — only a draft may be published`,
        'REVISION_NOT_DRAFT',
        HttpStatus.CONFLICT,
      );
    }

    const published = await this.repository.publish(id, actingUserId);
    if (published === null) {
      throw new BusinessException(
        `RouterConfiguration '${id}' could not be published — its status changed before the publish completed`,
        'REVISION_PUBLISH_RACE',
        HttpStatus.CONFLICT,
      );
    }
    return published;
  }

  async setEnabled(scope: string, enabled: boolean): Promise<RouterConfigurationDetail> {
    const updated = await this.repository.setEnabled(scope, enabled);
    if (updated === null) {
      throw new BusinessException(
        `No PUBLISHED RouterConfiguration exists for scope '${scope}' to enable or disable`,
        'NO_PUBLISHED_CONFIGURATION',
        HttpStatus.NOT_FOUND,
      );
    }
    return updated;
  }

  private toChainEntryInput(entry: ChainEntryInputDto): ChainEntryInput {
    return {
      role: entry.role,
      provider: entry.provider,
      modelAlias: entry.modelAlias,
      deploymentId: entry.deploymentId,
      enabled: entry.enabled,
      attemptTimeoutMs: entry.attemptTimeoutMs,
      retries: entry.retries,
      triggers: entry.triggers,
      skipWhenProviderCircuitOpen: entry.skipWhenProviderCircuitOpen,
      minConfidence: entry.minConfidence,
      maxCostMicroUsd: entry.maxCostMicroUsd,
      billingModel: entry.billingModel,
    };
  }
}
