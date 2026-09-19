import { knownContextWindow } from '@claw/shared-utilities';
import { Injectable } from '@nestjs/common';
import { EntityNotFoundException } from '../../../common/errors';
import { type PaginatedResult } from '../../../common/types';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { RouterModelRegistryManager } from '../managers/router-model-registry.manager';
import {
  type RouterAdminOverrideRecord,
  type RouterModelRegistryRecord,
} from '../types/router-model-registry.types';
import { type CreateRouterModelDto } from '../dto/create-router-model.dto';
import { type UpdateRouterModelDto } from '../dto/update-router-model.dto';
import { type ListRouterModelsQueryDto } from '../dto/list-router-models-query.dto';
import { type ModelContextWindowSnapshot } from '../types/model-context-window.types';

@Injectable()
export class RouterModelsService {
  constructor(
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly registryManager: RouterModelRegistryManager,
  ) {}

  /**
   * The two numbers a prompt budget needs, for an internal caller.
   *
   * Returns `known: false` rather than throwing when there is no catalog row:
   * an unknown model must make the caller fall back to a conservative window,
   * not fail the user's generation. `maxContextTokens` (the enrichment field)
   * wins over `contextWindowTokens` (the sync field) when both are present,
   * because enrichment is the later and more specific of the two.
   */
  async getContextWindowSnapshot(
    provider: string,
    modelKey: string,
  ): Promise<ModelContextWindowSnapshot> {
    const record = await this.registryRepo.findByProviderAndModelKey(provider, modelKey);
    // The catalog row wins; the published family window fills its gap. In
    // production 156 of 175 rows had no window, so chat-service budgeted a
    // 1M-token Gemini as a 32k model and could not tell a small model apart.
    const known = knownContextWindow(provider, modelKey) ?? null;
    if (record === null) {
      return {
        provider,
        modelKey,
        contextWindowTokens: known,
        maxOutputTokens: null,
        known: known !== null,
      };
    }
    return {
      provider,
      modelKey,
      contextWindowTokens: record.maxContextTokens ?? record.contextWindowTokens ?? known,
      maxOutputTokens: record.maxOutputTokensIntel ?? record.maxOutputTokens ?? null,
      known: true,
    };
  }

  async list(query: ListRouterModelsQueryDto): Promise<PaginatedResult<RouterModelRegistryRecord>> {
    const { page, limit } = query;
    const skip = (page - 1) * limit;
    const { items, total } = await this.registryRepo.list({
      provider: query.provider,
      lifecycle: query.lifecycle,
      isLocal: query.isLocal,
      isRouterOnly: query.isRouterOnly,
      isExecutionCapable: query.isExecutionCapable,
      search: query.search,
      skip,
      take: limit,
    });
    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async get(id: string): Promise<RouterModelRegistryRecord> {
    const record = await this.registryRepo.findById(id);
    if (record === null) {
      throw new EntityNotFoundException('RouterModelRegistry', id);
    }
    return record;
  }

  async create(dto: CreateRouterModelDto): Promise<RouterModelRegistryRecord> {
    return this.registryManager.createProfile(dto);
  }

  async update(
    id: string,
    dto: UpdateRouterModelDto,
    actingUserId: string,
  ): Promise<RouterModelRegistryRecord> {
    await this.get(id);
    return this.registryManager.updateProfile(id, dto, actingUserId);
  }

  async softDelete(id: string): Promise<RouterModelRegistryRecord> {
    await this.get(id);
    return this.registryManager.softRemoveProfile(id);
  }

  async listOverrides(id: string): Promise<RouterAdminOverrideRecord[]> {
    await this.get(id);
    return this.registryManager.listOverrides(id);
  }

  async clearOverride(id: string, fieldName: string): Promise<void> {
    await this.get(id);
    await this.registryManager.clearOverride(id, fieldName);
  }
}
