import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma';
import { EntityNotFoundException } from '../../../common/errors';
import { INTELLIGENCE_OVERRIDE_FIELDS } from '../constants/model-intelligence.constants';
import { type UpdateModelIntelligenceDto } from '../dto/update-model-intelligence.dto';
import { RouterModelRegistryRepository } from '../repositories/router-model-registry.repository';
import { type ResolvedModelIntelligence } from '../types/model-intelligence.types';
import { pickOverrideFields } from '../utilities/model-intelligence-merge.utility';
import { resolveModelIntelligenceView } from '../utilities/resolve-intelligence-view.utility';

/// Phase 3: admin-facing CRUD for the Model Intelligence Registry.
///
/// Rules:
///  - `adminOverrideJson` is the freeze block. Every PATCH replaces the
///    block by merging the new fields on top of the existing override.
///  - PATCH also writes the override fields onto their typed columns so
///    consumers (planner, scoring, sync) can read the row without parsing
///    JSON. Sync workers later skip any column that's pinned.
///  - `reset()` clears the override block. Sync passes can then re-enrich
///    the row freely.
@Injectable()
export class ModelIntelligenceService {
  private readonly logger = new Logger(ModelIntelligenceService.name);

  constructor(private readonly registryRepo: RouterModelRegistryRepository) {}

  async getIntelligence(
    provider: string,
    modelKey: string,
  ): Promise<ResolvedModelIntelligence> {
    this.logger.debug(`getIntelligence provider=${provider} modelKey=${modelKey}`);
    const row = await this.registryRepo.findByProviderAndModelKey(provider, modelKey);
    if (row === null) {
      throw new EntityNotFoundException(
        'RouterModelRegistry',
        `${provider}::${modelKey}`,
      );
    }
    return resolveModelIntelligenceView(row);
  }

  async patchIntelligence(
    provider: string,
    modelKey: string,
    dto: UpdateModelIntelligenceDto,
  ): Promise<ResolvedModelIntelligence> {
    this.logger.debug(`patchIntelligence provider=${provider} modelKey=${modelKey}`);
    const row = await this.registryRepo.findByProviderAndModelKey(provider, modelKey);
    if (row === null) {
      throw new EntityNotFoundException(
        'RouterModelRegistry',
        `${provider}::${modelKey}`,
      );
    }
    const overrideKeysInPayload = this.overrideKeysIn(dto);
    const nextOverride = {
      ...(row.adminOverrideJson ?? {}),
      ...pickOverrideFields(dto as Record<string, unknown>),
    };
    const updateInput = this.toRegistryUpdateInput(dto);
    updateInput.adminOverrideJson = nextOverride as Prisma.InputJsonValue;
    const updated = await this.registryRepo.patchIntelligence(row.id, updateInput);
    this.logger.log(
      `patchIntelligence: updated ${provider}/${modelKey} pinnedKeys=${overrideKeysInPayload.length}`,
    );
    return resolveModelIntelligenceView(updated);
  }

  async resetOverride(
    provider: string,
    modelKey: string,
  ): Promise<ResolvedModelIntelligence> {
    this.logger.debug(`resetOverride provider=${provider} modelKey=${modelKey}`);
    const row = await this.registryRepo.findByProviderAndModelKey(provider, modelKey);
    if (row === null) {
      throw new EntityNotFoundException(
        'RouterModelRegistry',
        `${provider}::${modelKey}`,
      );
    }
    const updated = await this.registryRepo.patchIntelligence(row.id, {
      adminOverrideJson: Prisma.DbNull,
    } as Prisma.RouterModelRegistryUpdateInput);
    this.logger.log(`resetOverride: cleared override for ${provider}/${modelKey}`);
    return resolveModelIntelligenceView(updated);
  }

  /// Returns the keys in the freeze block for a (provider, modelKey). Used
  /// by `RouterSyncManager` to skip protected columns. Returns an empty set
  /// if the row has no override block or the row doesn't exist.
  async getProtectedIntelligenceKeys(
    provider: string,
    modelKey: string,
  ): Promise<Set<string>> {
    const row = await this.registryRepo.findByProviderAndModelKey(provider, modelKey);
    if (row === null || row.adminOverrideJson === null) {
      return new Set<string>();
    }
    return new Set(Object.keys(row.adminOverrideJson));
  }

  private overrideKeysIn(dto: UpdateModelIntelligenceDto): string[] {
    const dtoMap = dto as Record<string, unknown>;
    return INTELLIGENCE_OVERRIDE_FIELDS.filter(
      (key) => dtoMap[key] !== undefined,
    );
  }

  private toRegistryUpdateInput(
    dto: UpdateModelIntelligenceDto,
  ): Prisma.RouterModelRegistryUpdateInput {
    const dtoMap = dto as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of INTELLIGENCE_OVERRIDE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(dtoMap, key)) {
        out[key] = dtoMap[key];
      }
    }
    return out as Prisma.RouterModelRegistryUpdateInput;
  }

}
