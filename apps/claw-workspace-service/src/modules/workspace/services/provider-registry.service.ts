import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BusinessException } from '../../../common/errors/business.exception';
import { EntityNotFoundException } from '../../../common/errors/entity-not-found.exception';
import {
  WorkspaceProvider,
  type WorkspaceProviderDefinition,
  WorkspaceProviderDefinitionStatus,
} from '../../../generated/prisma';
import { PROVIDER_DEFINITION_SEEDS } from '../constants/provider-registry.constants';
import { ProviderDefinitionRepository } from '../repositories/provider-definition.repository';

@Injectable()
export class ProviderRegistryService implements OnModuleInit {
  private readonly logger = new Logger(ProviderRegistryService.name);

  constructor(private readonly repo: ProviderDefinitionRepository) {}

  async onModuleInit(): Promise<void> {
    try {
      let seeded = 0;
      for (const seed of PROVIDER_DEFINITION_SEEDS) {
        await this.repo.upsert(seed.provider, {
          provider: seed.provider,
          displayName: seed.displayName,
          description: seed.description,
          authModes: seed.authModes,
          defaultAuthMode: seed.defaultAuthMode,
          configSchema: seed.configSchema,
          capabilities: seed.capabilities,
          supportedObjects: seed.supportedObjects,
          supportedActions: seed.supportedActions,
          iconUrl: seed.iconUrl,
          docsUrl: seed.docsUrl,
          adapterKey: seed.adapterKey,
          status: WorkspaceProviderDefinitionStatus.ACTIVE,
          version: seed.configSchema.version,
        });
        seeded += 1;
      }
      this.logger.log(`seeded ${seeded} workspace provider definitions`);
    } catch (error: unknown) {
      this.logger.warn(
        `failed to seed provider definitions: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async list(): Promise<WorkspaceProviderDefinition[]> {
    return this.repo.findAll();
  }

  async getByProvider(provider: WorkspaceProvider): Promise<WorkspaceProviderDefinition> {
    if (!Object.values(WorkspaceProvider).includes(provider)) {
      throw new EntityNotFoundException('WorkspaceProviderDefinition', String(provider));
    }
    const def = await this.repo.findByProvider(provider);
    if (def === null) {
      throw new EntityNotFoundException('WorkspaceProviderDefinition', provider);
    }
    if (def.status === WorkspaceProviderDefinitionStatus.DISABLED) {
      throw new BusinessException(
        `Provider ${provider} is disabled`,
        'PROVIDER_DISABLED',
        HttpStatus.BAD_REQUEST,
      );
    }
    return def;
  }

  async getById(id: string): Promise<WorkspaceProviderDefinition> {
    const def = await this.repo.findById(id);
    if (def === null) {
      throw new EntityNotFoundException('WorkspaceProviderDefinition', id);
    }
    return def;
  }
}
