import { Injectable, Logger, Optional } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { type ModelLifecycle, type Prisma } from '../../../generated/prisma';
import { OVERRIDE_MANAGED_FIELDS } from '../constants/router-models.constants';
import { type CreateRouterModelDto } from '../dto/create-router-model.dto';
import { type UpdateRouterModelDto } from '../dto/update-router-model.dto';
import { RouterAdminOverrideRepository } from '../repositories/router-admin-override.repository';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import {
  type RouterAdminOverrideRecord,
  type RouterModelRegistryRecord,
} from '../types/router-model-registry.types';
import { dtoToUpdateInput } from '../utilities/dto-to-update-input.utility';

@Injectable()
export class RouterModelRegistryManager {
  private readonly logger = new Logger(RouterModelRegistryManager.name);

  constructor(
    private readonly registryRepo: RouterModelRegistryRepository,
    private readonly overrideRepo: RouterAdminOverrideRepository,
    @Optional() private readonly rabbitMQ?: RabbitMQService,
  ) {}

  async createProfile(dto: CreateRouterModelDto): Promise<RouterModelRegistryRecord> {
    this.logger.debug(`createProfile provider=${dto.provider} modelKey=${dto.modelKey}`);
    const data = this.dtoToCreateInput(dto);
    const record = await this.registryRepo.create(data);
    void this.safePublish(EventPattern.ROUTING_PROFILE_CREATED, {
      profileId: record.id,
      provider: record.provider,
      modelKey: record.modelKey,
    });
    return record;
  }

  async updateProfile(
    id: string,
    dto: UpdateRouterModelDto,
    actingUserId: string,
  ): Promise<RouterModelRegistryRecord> {
    this.logger.debug(`updateProfile id=${id} actingUserId=${actingUserId}`);
    const data = dtoToUpdateInput(dto);
    await this.recordOverridesForChangedFields(id, dto, actingUserId);
    const record = await this.registryRepo.update(id, data);
    void this.safePublish(EventPattern.ROUTING_PROFILE_UPDATED, {
      profileId: id,
      actingUserId,
      changedFields: Object.keys(data),
    });
    return record;
  }

  private async recordOverridesForChangedFields(
    profileId: string,
    dto: UpdateRouterModelDto,
    actingUserId: string,
  ): Promise<void> {
    const dtoMap = dto as Record<string, unknown>;
    for (const fieldName of OVERRIDE_MANAGED_FIELDS) {
      const value = dtoMap[fieldName];
      if (value === undefined) continue;
      await this.overrideRepo.upsertOverride({
        profileId,
        fieldName,
        fieldValue: value,
        reason: dto.overrideReason,
        setBy: actingUserId,
      });
    }
  }

  async listOverrides(profileId: string): Promise<RouterAdminOverrideRecord[]> {
    return this.overrideRepo.listByProfileId(profileId, true);
  }

  async clearOverride(profileId: string, fieldName: string): Promise<void> {
    this.logger.log(`clearOverride profileId=${profileId} fieldName=${fieldName}`);
    await this.overrideRepo.deactivate(profileId, fieldName);
  }

  /// Returns the override-managed fields for a profile so sync workers know
  /// which fields to skip (preserving admin pins across upstream syncs).
  async getProtectedFieldNames(profileId: string): Promise<Set<string>> {
    const overrides = await this.overrideRepo.listByProfileId(profileId, true);
    return new Set(overrides.map((o) => o.fieldName));
  }

  async softRemoveProfile(id: string): Promise<RouterModelRegistryRecord> {
    return this.registryRepo.softDelete(id);
  }

  async transitionLifecycle(id: string, next: ModelLifecycle): Promise<RouterModelRegistryRecord> {
    this.logger.log(`transitionLifecycle id=${id} -> ${next}`);
    const record = await this.registryRepo.update(id, { lifecycle: next });
    void this.safePublish(EventPattern.ROUTING_PROFILE_LIFECYCLE_CHANGED, {
      profileId: id,
      lifecycle: next,
    });
    return record;
  }

  private async safePublish(pattern: EventPattern, payload: unknown): Promise<void> {
    if (this.rabbitMQ === undefined) return;
    try {
      await this.rabbitMQ.publish(pattern, payload);
    } catch (error) {
      this.logger.warn(`event publish failed pattern=${pattern}: ${(error as Error).message}`);
    }
  }

  private dtoToCreateInput(dto: CreateRouterModelDto): Prisma.RouterModelRegistryCreateInput {
    return {
      provider: dto.provider,
      modelKey: dto.modelKey,
      displayName: dto.displayName,
      family: dto.family ?? null,
      connectorId: dto.connectorId ?? null,
      runtimeId: dto.runtimeId ?? null,
      isLocal: dto.isLocal,
      isRouterOnly: dto.isRouterOnly,
      isExecutionCapable: dto.isExecutionCapable,
      lifecycle: dto.lifecycle,
      modalitiesIn: dto.modalitiesIn,
      modalitiesOut: dto.modalitiesOut,
      contextWindowTokens: dto.contextWindowTokens ?? null,
      maxOutputTokens: dto.maxOutputTokens ?? null,
      domainTags: dto.domainTags,
      notRecommendedFor: dto.notRecommendedFor,
      inputCostPer1M: dto.inputCostPer1M ?? null,
      outputCostPer1M: dto.outputCostPer1M ?? null,
      costConfidence: dto.costConfidence,
      costClass: dto.costClass ?? null,
      latencyP50Ms: dto.latencyP50Ms ?? null,
      latencyP95Ms: dto.latencyP95Ms ?? null,
      latencyClass: dto.latencyClass ?? null,
      qualityTier: dto.qualityTier,
      hallucinationRisk: dto.hallucinationRisk ?? null,
      judgeSuitability: dto.judgeSuitability,
      searchSuitability: dto.searchSuitability,
      fallbackSuitability: dto.fallbackSuitability,
      privacySupport: dto.privacySupport,
      metadataSource: dto.metadataSource,
      externalCardUrl: dto.externalCardUrl ?? null,
      notes: dto.notes ?? null,
    };
  }
}
