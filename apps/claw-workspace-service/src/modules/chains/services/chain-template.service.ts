import { HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { BusinessException } from '../../../common/errors/business.exception';
import { WorkspaceConnectorRepository } from '../../workspace/repositories/workspace-connector.repository';
import { CHAIN_TEMPLATE_SEEDS } from '../constants/chain-template-seeds.constants';
import { ChainTemplateRepository } from '../repositories/chain-template.repository';
import type { ChainDsl, InstantiateTemplateInput } from '../types/chain.types';
import { parseProviderPlaceholder } from '../utilities/chain-template-placeholder.utility';
import { ChainService } from './chain.service';
import type { Prisma, WorkspaceChain, WorkspaceChainTemplate } from '../../../generated/prisma';

/**
 * Phase 07 (scoped slice) — seeds and serves the chain template catalog,
 * and instantiates a template into a real, ordinary WorkspaceChain by
 * resolving each step's provider placeholder to the caller's own
 * connector. Once instantiated, the chain is indistinguishable from a
 * hand-written one — it gets the exact same execution, crash-recovery,
 * resume, and error-classification behavior (Phases 05/06) with no extra
 * code needed here.
 */
@Injectable()
export class ChainTemplateService implements OnModuleInit {
  private readonly logger = new Logger(ChainTemplateService.name);

  constructor(
    private readonly templateRepo: ChainTemplateRepository,
    private readonly connectorRepo: WorkspaceConnectorRepository,
    private readonly chainService: ChainService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      let seeded = 0;
      for (const seed of CHAIN_TEMPLATE_SEEDS) {
        await this.templateRepo.upsert(seed.key, {
          key: seed.key,
          name: seed.name,
          description: seed.description,
          category: seed.category,
          requiredProviders: seed.requiredProviders,
          dslTemplate: seed.dslTemplate as unknown as Prisma.InputJsonValue,
          version: seed.version,
        });
        seeded += 1;
      }
      this.logger.log(`seeded ${seeded} workspace chain templates`);
    } catch (error: unknown) {
      this.logger.warn(
        `failed to seed chain templates: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }

  async list(): Promise<WorkspaceChainTemplate[]> {
    return this.templateRepo.findAll();
  }

  async instantiate(
    userId: string,
    key: string,
    input: InstantiateTemplateInput,
  ): Promise<WorkspaceChain> {
    const template = await this.templateRepo.findByKey(key);
    if (template === null) {
      throw new BusinessException(
        'workspace.chain_template.not_found',
        'NOT_FOUND',
        HttpStatus.NOT_FOUND,
      );
    }

    const resolvedConnectors = await this.resolveConnectors(
      userId,
      template,
      input.connectorSelections,
    );
    const dsl = template.dslTemplate as unknown as ChainDsl;
    const resolvedSteps = dsl.steps.map((step) => {
      const providerToken = parseProviderPlaceholder(step.connectorId);
      const realConnectorId =
        providerToken !== null ? resolvedConnectors.get(providerToken) : undefined;
      if (realConnectorId === undefined) {
        // Defensive only — would mean requiredProviders drifted from the
        // template's own dslTemplate, which the seed-sanity test guards.
        throw new BusinessException(
          'workspace.chain_template.unresolved_provider',
          'TEMPLATE_UNRESOLVED_PROVIDER',
          HttpStatus.INTERNAL_SERVER_ERROR,
          { stepId: step.id },
        );
      }
      return { ...step, connectorId: realConnectorId };
    });

    return this.chainService.create(userId, {
      name: input.name,
      description: template.description,
      dsl: { steps: resolvedSteps },
      isEnabled: true,
    });
  }

  private async resolveConnectors(
    userId: string,
    template: WorkspaceChainTemplate,
    connectorSelections: Record<string, string>,
  ): Promise<Map<string, string>> {
    const resolved = new Map<string, string>();
    for (const provider of template.requiredProviders) {
      const connectorId = connectorSelections[provider];
      if (connectorId === undefined) {
        throw new BusinessException(
          'workspace.chain_template.missing_connector',
          'MISSING_CONNECTOR_SELECTION',
          HttpStatus.BAD_REQUEST,
          { provider },
        );
      }
      const connector = await this.connectorRepo.findById(connectorId);
      if (connector === null || connector.userId !== userId) {
        throw new BusinessException(
          'workspace.chain_template.connector_not_found',
          'CONNECTOR_NOT_FOUND',
          HttpStatus.NOT_FOUND,
          { provider },
        );
      }
      if (connector.provider !== provider) {
        throw new BusinessException(
          'workspace.chain_template.connector_provider_mismatch',
          'CONNECTOR_PROVIDER_MISMATCH',
          HttpStatus.BAD_REQUEST,
          { provider, actual: connector.provider },
        );
      }
      if (connector.encryptedTokens === null) {
        throw new BusinessException(
          'workspace.chain_template.connector_unauthenticated',
          'CONNECTOR_UNAUTHENTICATED',
          HttpStatus.BAD_REQUEST,
          { provider },
        );
      }
      resolved.set(provider, connectorId);
    }
    return resolved;
  }
}
