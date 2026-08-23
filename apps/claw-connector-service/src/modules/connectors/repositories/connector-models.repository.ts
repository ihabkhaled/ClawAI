import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ConnectorModel,
  type ConnectorProvider,
  ModelUsageTier,
} from '../../../generated/prisma';
import { type NormalizedModel } from '../types/connectors.types';

@Injectable()
export class ConnectorModelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(
    connectorId: string,
    provider: ConnectorProvider,
    models: NormalizedModel[],
  ): Promise<number> {
    const operations = models.map((model) =>
      this.prisma.connectorModel.upsert({
        where: {
          connectorId_modelKey: { connectorId, modelKey: model.modelKey },
        },
        update: {
          displayName: model.displayName,
          lifecycle: model.lifecycle,
          supportsStreaming: model.capabilities.supportsStreaming,
          supportsTools: model.capabilities.supportsTools,
          supportsVision: model.capabilities.supportsVision,
          supportsAudio: model.capabilities.supportsAudio,
          supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
          maxContextTokens: model.capabilities.maxContextTokens,
          usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
          inputUsdPerMillion: model.usage?.inputUsdPerMillion,
          cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
          outputUsdPerMillion: model.usage?.outputUsdPerMillion,
          syncedAt: new Date(),
        },
        create: {
          connectorId,
          provider,
          modelKey: model.modelKey,
          displayName: model.displayName,
          lifecycle: model.lifecycle,
          supportsStreaming: model.capabilities.supportsStreaming,
          supportsTools: model.capabilities.supportsTools,
          supportsVision: model.capabilities.supportsVision,
          supportsAudio: model.capabilities.supportsAudio,
          supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
          maxContextTokens: model.capabilities.maxContextTokens,
          usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
          inputUsdPerMillion: model.usage?.inputUsdPerMillion,
          cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
          outputUsdPerMillion: model.usage?.outputUsdPerMillion,
        },
      }),
    );

    const results = await this.prisma.$transaction(operations);
    return results.length;
  }

  async replaceMany(
    connectorId: string,
    provider: ConnectorProvider,
    models: NormalizedModel[],
  ): Promise<{ upserted: number; deleted: number }> {
    const uniqueModels = [...new Map(models.map((model) => [model.modelKey, model])).values()];
    const modelKeys = uniqueModels.map((model) => model.modelKey);

    // A provider listing that is truncated, rate-limited or briefly failing used to
    // erase inventory permanently, taking with it the identity that plan entitlements
    // and audit history point at. Marking REMOVED keeps the row and its id, and forcing
    // exposure back to UNEXPOSED means a model that disappears cannot keep serving users.
    const operations = [
      this.prisma.connectorModel.updateMany({
        where: {
          connectorId,
          ...(modelKeys.length > 0 ? { modelKey: { notIn: modelKeys } } : {}),
          lifecycle: { not: 'REMOVED' },
        },
        data: { lifecycle: 'REMOVED', exposure: 'UNEXPOSED' },
      }),
      ...uniqueModels.map((model) =>
        this.prisma.connectorModel.upsert({
          where: {
            connectorId_modelKey: { connectorId, modelKey: model.modelKey },
          },
          update: {
            displayName: model.displayName,
            lifecycle: model.lifecycle,
            supportsStreaming: model.capabilities.supportsStreaming,
            supportsTools: model.capabilities.supportsTools,
            supportsVision: model.capabilities.supportsVision,
            supportsAudio: model.capabilities.supportsAudio,
            supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
            maxContextTokens: model.capabilities.maxContextTokens,
            usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
            inputUsdPerMillion: model.usage?.inputUsdPerMillion,
            cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
            outputUsdPerMillion: model.usage?.outputUsdPerMillion,
            syncedAt: new Date(),
            lastSeenAt: new Date(),
          },
          create: {
            connectorId,
            provider,
            modelKey: model.modelKey,
            displayName: model.displayName,
            lifecycle: model.lifecycle,
            supportsStreaming: model.capabilities.supportsStreaming,
            supportsTools: model.capabilities.supportsTools,
            supportsVision: model.capabilities.supportsVision,
            supportsAudio: model.capabilities.supportsAudio,
            supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
            maxContextTokens: model.capabilities.maxContextTokens,
            usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
            inputUsdPerMillion: model.usage?.inputUsdPerMillion,
            cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
            outputUsdPerMillion: model.usage?.outputUsdPerMillion,
            lastSeenAt: new Date(),
          },
        }),
      ),
    ];

    // `removed` is now models marked REMOVED rather than rows destroyed.
    const [removed, ...upserted] = await this.prisma.$transaction(operations);
    return { deleted: (removed as { count: number }).count, upserted: upserted.length };
  }

  async findByConnectorId(connectorId: string): Promise<ConnectorModel[]> {
    return this.prisma.connectorModel.findMany({
      where: { connectorId },
      orderBy: { displayName: 'asc' },
    });
  }

  async deleteByConnectorId(connectorId: string): Promise<number> {
    const result = await this.prisma.connectorModel.deleteMany({
      where: { connectorId },
    });
    return result.count;
  }

  async countByConnectorId(connectorId: string): Promise<number> {
    return this.prisma.connectorModel.count({ where: { connectorId } });
  }

  async findAllForSnapshot(): Promise<
    Array<ConnectorModel & { connector: { status: string; isEnabled: boolean } }>
  > {
    return this.prisma.connectorModel.findMany({
      where: {
        connector: { isEnabled: true },
        lifecycle: 'ACTIVE',
      },
      include: { connector: { select: { status: true, isEnabled: true } } },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    }) as Promise<Array<ConnectorModel & { connector: { status: string; isEnabled: boolean } }>>;
  }

  // User-facing catalog: a model reaches a user only if its connector is enabled,
  // it is ACTIVE, an administrator has EXPOSED it, and it is a CHAT model rather than
  // router infrastructure or an embedding or reranker deployment. The snapshot query
  // (findAllForSnapshot) stays unfiltered on purpose because the router needs
  // infrastructure models that are never user-executable.
  async findExposedForCatalog(): Promise<
    Array<ConnectorModel & { connector: { status: string; isEnabled: boolean } }>
  > {
    return this.prisma.connectorModel.findMany({
      where: {
        connector: { isEnabled: true },
        lifecycle: 'ACTIVE',
        exposure: 'EXPOSED',
        kind: 'CHAT',
      },
      include: { connector: { select: { status: true, isEnabled: true } } },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    }) as Promise<Array<ConnectorModel & { connector: { status: string; isEnabled: boolean } }>>;
  }
}
