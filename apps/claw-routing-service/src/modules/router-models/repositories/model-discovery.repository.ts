import { Injectable, Logger } from '@nestjs/common';
import { recordGet } from '../../../common/utilities';
import { DeploymentType, type RouterProvider } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER,
  DISCOVERY_METADATA_SOURCE,
} from '../constants/model-discovery.constants';
import { DEPLOYMENT_KEY_SEPARATOR } from '../constants/deployment-seed.constants';
import type {
  AliasMatchCandidate,
  DiscoveredModel,
  DiscoveryImportResult,
} from '../types/model-discovery.types';

@Injectable()
export class ModelDiscoveryRepository {
  private readonly logger = new Logger(ModelDiscoveryRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Imports a connector catalogue as definitions and their endpoints.
   *
   * A ModelDeployment needs a RouterModelRegistry definition to point at, and on
   * this installation the registry is empty, so discovery creates both. The
   * definition is upserted by its natural key and the deployment by its
   * deploymentKey, making a re-import a no-op rather than a duplicate.
   *
   * Every deployment lands in the schema's REQUIRES_VALIDATION default.
   * Discovery proves a model is LISTED; only a health check proves it is
   * USABLE, and conflating the two would make an unreachable endpoint routable.
   */
  async importModels(models: readonly DiscoveredModel[]): Promise<DiscoveryImportResult> {
    let definitionsCreated = 0;
    let deploymentsCreated = 0;
    let skipped = 0;

    for (const model of models) {
      const provider = recordGet(
        CONNECTOR_PROVIDER_TO_ROUTER_PROVIDER,
        model.provider.toUpperCase(),
      );
      if (!provider || model.modelKey.trim().length === 0) {
        skipped += 1;
        continue;
      }

      const definition = await this.prisma.routerModelRegistry.upsert({
        where: { provider_modelKey: { provider: model.provider, modelKey: model.modelKey } },
        create: {
          provider: model.provider,
          modelKey: model.modelKey,
          displayName: model.displayName,
          family: model.family ?? null,
          contextWindowTokens: model.contextWindowTokens ?? null,
          maxOutputTokens: model.maxOutputTokens ?? null,
          metadataSource: DISCOVERY_METADATA_SOURCE,
        },
        // Never clobber curated or admin-edited metadata on a re-import.
        update: { lastSyncedAt: new Date() },
      });
      if (definition.metadataSource === DISCOVERY_METADATA_SOURCE) {
        definitionsCreated += 1;
      }

      const deploymentKey = [provider, model.modelKey, 'connector'].join(DEPLOYMENT_KEY_SEPARATOR);

      await this.prisma.modelDeployment.upsert({
        where: { deploymentKey },
        create: {
          definitionId: definition.id,
          deploymentKey,
          provider,
          providerModelId: model.modelKey,
          deploymentType: DeploymentType.CLOUD_API,
          contextWindowTokens: model.contextWindowTokens ?? null,
          maxOutputTokens: model.maxOutputTokens ?? null,
          metadataSource: DISCOVERY_METADATA_SOURCE,
        },
        update: {},
      });
      deploymentsCreated += 1;
    }

    this.logger.log(
      `importModels: definitions=${String(definitionsCreated)} deployments=${String(deploymentsCreated)} skipped=${String(skipped)}`,
    );
    return { definitionsCreated, deploymentsCreated, skipped };
  }

  /** Deployments a chain alias may resolve to. */
  async findAliasCandidates(): Promise<AliasMatchCandidate[]> {
    const rows = await this.prisma.modelDeployment.findMany({
      select: { id: true, provider: true, providerModelId: true },
    });
    return rows.map((row) => ({
      deploymentId: row.id,
      provider: row.provider,
      providerModelId: row.providerModelId,
    }));
  }

  /** Chain entries still waiting for their alias to resolve. */
  async findUnresolvedChainEntries(): Promise<
    Array<{ id: string; order: number; provider: RouterProvider; modelAlias: string }>
  > {
    return this.prisma.routerChainEntry.findMany({
      where: { deploymentId: null },
      select: { id: true, order: true, provider: true, modelAlias: true },
      orderBy: { order: 'asc' },
    });
  }

  async linkChainEntry(entryId: string, deploymentId: string): Promise<void> {
    await this.prisma.routerChainEntry.update({
      where: { id: entryId },
      data: { deploymentId, lastValidatedAt: new Date() },
    });
  }

  /**
   * Promotes listed endpoints to routable.
   *
   * Separate from import on purpose: being in a provider's catalogue is not
   * evidence that a call to it will succeed. Kept narrow — only rows still in
   * REQUIRES_VALIDATION move, so a QUARANTINED or RETIRED endpoint is never
   * silently revived.
   */
  async activateDeployments(deploymentIds: readonly string[]): Promise<number> {
    if (deploymentIds.length === 0) {
      return 0;
    }
    const result = await this.prisma.modelDeployment.updateMany({
      where: { id: { in: [...deploymentIds] }, activationState: 'REQUIRES_VALIDATION' },
      // lastHealthyAt is deliberately NOT set: discovery proves a model is
      // LISTED, and no request has been made to this endpoint. Claiming health
      // here would contradict this method's own contract and make an
      // unreachable endpoint look recently verified.
      data: { activationState: 'ACTIVE', lastValidatedAt: new Date() },
    });
    return result.count;
  }
}
