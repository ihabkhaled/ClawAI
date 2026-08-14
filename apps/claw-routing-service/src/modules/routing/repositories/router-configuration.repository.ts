import { Injectable, Logger } from '@nestjs/common';
import { RouterConfigurationStatus } from '../../../generated/prisma';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { ROUTER_CONFIGURATION_GLOBAL_SCOPE } from '../constants/router-chain.constants';
import type {
  RouterConfigurationSnapshot,
  SnapshotChainEntry,
} from '../types/router-chain-resolution.types';

@Injectable()
export class RouterConfigurationRepository {
  private readonly logger = new Logger(RouterConfigurationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads the live configuration and its chain as one frozen view.
   *
   * Both reads happen inside a single transaction so an admin publishing
   * mid-load cannot produce a snapshot that is half revision N and half N+1 —
   * a decision must correspond to exactly one revision that actually existed.
   *
   * Deployments are fetched by id rather than joined because a chain entry
   * holds a plain deploymentId, not a relation: a seeded entry legitimately
   * points at nothing until discovery resolves its alias, and a foreign key
   * would make "not resolved yet" unrepresentable.
   */
  async findPublishedSnapshot(
    scope: string = ROUTER_CONFIGURATION_GLOBAL_SCOPE,
  ): Promise<RouterConfigurationSnapshot | null> {
    this.logger.debug(`findPublishedSnapshot: scope=${scope}`);

    return this.prisma.$transaction(async (transaction) => {
      const configuration = await transaction.routerConfiguration.findFirst({
        where: { scope, status: RouterConfigurationStatus.PUBLISHED },
        include: { entries: { orderBy: { order: 'asc' } } },
      });

      if (!configuration) {
        this.logger.debug(`findPublishedSnapshot: no published configuration for scope=${scope}`);
        return null;
      }

      const deploymentIds = configuration.entries
        .map((entry) => entry.deploymentId)
        .filter((id): id is string => id !== null);

      const deployments =
        deploymentIds.length > 0
          ? await transaction.modelDeployment.findMany({
              where: { id: { in: deploymentIds } },
              select: { id: true, activationState: true, providerModelId: true },
            })
          : [];

      const byId = new Map(deployments.map((deployment) => [deployment.id, deployment]));

      const entries: SnapshotChainEntry[] = configuration.entries.map((entry) => {
        const deployment = entry.deploymentId ? byId.get(entry.deploymentId) : undefined;
        return {
          entryId: entry.id,
          order: entry.order,
          enabled: entry.enabled,
          role: entry.role,
          provider: entry.provider,
          modelAlias: entry.modelAlias,
          // A dangling id — the deployment was deleted out from under the entry
          // — reads as unresolved rather than as a usable endpoint.
          deploymentId: deployment?.id ?? null,
          deploymentActivationState: deployment?.activationState ?? null,
          deploymentProviderModelId: deployment?.providerModelId ?? null,
          attemptTimeoutMs: entry.attemptTimeoutMs,
          retries: entry.retries,
          triggers: entry.triggers,
          billingModel: entry.billingModel,
        };
      });

      return {
        configurationId: configuration.id,
        scope: configuration.scope,
        revision: configuration.revision,
        mode: configuration.mode,
        enabled: configuration.enabled,
        totalDeadlineMs: configuration.totalDeadlineMs,
        maxAttempts: configuration.maxAttempts,
        minConfidence: Number(configuration.minConfidence),
        lowConfidenceAction: configuration.lowConfidenceAction,
        failClosedWhenNoEligibleRouter: configuration.failClosedWhenNoEligibleRouter,
        skipProviderOnProviderWideFailure: configuration.skipProviderOnProviderWideFailure,
        legacyLocalRollbackEnabled: configuration.legacyLocalRollbackEnabled,
        entries,
      };
    });
  }
}
