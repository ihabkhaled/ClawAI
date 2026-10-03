import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  type ConnectorModel,
  type ConnectorProvider,
  ModelUsageTier,
  type Prisma,
} from '../../../generated/prisma';
import { type NormalizedModel } from '../types/connectors.types';
import {
  MODEL_UNAVAILABLE_RETIRE_THRESHOLD,
  MODEL_UNAVAILABLE_WINDOW_MS,
} from '../constants/model-unavailable.constants';
import { adapterKindFields } from '../utilities/adapter-kind-fields.utility';
import { nonChatKind } from '../utilities/model-kind.utility';
import { isConnectorProvider } from '../utilities/connector-provider.utility';

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
          supportsVideoInput: model.capabilities.supportsVideoInput,
          supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
          maxContextTokens: model.capabilities.maxContextTokens,
          maxOutputTokens: model.capabilities.maxOutputTokens,
          usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
          inputUsdPerMillion: model.usage?.inputUsdPerMillion,
          cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
          outputUsdPerMillion: model.usage?.outputUsdPerMillion,
          ...nonChatKind(model.modelKey),
          ...adapterKindFields(model, true),
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
          supportsVideoInput: model.capabilities.supportsVideoInput,
          supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
          maxContextTokens: model.capabilities.maxContextTokens,
          maxOutputTokens: model.capabilities.maxOutputTokens,
          usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
          inputUsdPerMillion: model.usage?.inputUsdPerMillion,
          cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
          outputUsdPerMillion: model.usage?.outputUsdPerMillion,
          ...nonChatKind(model.modelKey),
          ...adapterKindFields(model, false),
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
    // The prompt-caching switch (F093) goes back to OFF for the same reason: it changes
    // what a request costs, so a model that returns must be switched on again on purpose.
    const operations = [
      this.prisma.connectorModel.updateMany({
        where: {
          connectorId,
          ...(modelKeys.length > 0 ? { modelKey: { notIn: modelKeys } } : {}),
          lifecycle: { not: 'REMOVED' },
        },
        data: { lifecycle: 'REMOVED', exposure: 'UNEXPOSED', promptCaching: false },
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
            supportsVideoInput: model.capabilities.supportsVideoInput,
            supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
            maxContextTokens: model.capabilities.maxContextTokens,
            maxOutputTokens: model.capabilities.maxOutputTokens,
            usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
            inputUsdPerMillion: model.usage?.inputUsdPerMillion,
            cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
            outputUsdPerMillion: model.usage?.outputUsdPerMillion,
            ...nonChatKind(model.modelKey),
            ...adapterKindFields(model, true),
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
            supportsVideoInput: model.capabilities.supportsVideoInput,
            supportsStructuredOutput: model.capabilities.supportsStructuredOutput,
            maxContextTokens: model.capabilities.maxContextTokens,
            maxOutputTokens: model.capabilities.maxOutputTokens,
            usageTier: model.usage?.tier ?? ModelUsageTier.UNKNOWN,
            inputUsdPerMillion: model.usage?.inputUsdPerMillion,
            cachedInputUsdPerMillion: model.usage?.cachedInputUsdPerMillion,
            outputUsdPerMillion: model.usage?.outputUsdPerMillion,
            ...nonChatKind(model.modelKey),
            ...adapterKindFields(model, false),
            lastSeenAt: new Date(),
          },
        }),
      ),
    ];

    // A model chat-service keeps seeing refused as gone stays retired: the
    // upserts above set the provider's own lifecycle, which would bring it back.
    operations.push(
      this.prisma.connectorModel.updateMany({
        where: {
          connectorId,
          unavailableCount: { gte: MODEL_UNAVAILABLE_RETIRE_THRESHOLD },
          lifecycle: 'ACTIVE',
        },
        data: { lifecycle: 'SUNSET', exposure: 'UNEXPOSED' },
      }),
    );

    // `removed` is now models marked REMOVED rather than rows destroyed.
    const [removed] = await this.prisma.$transaction(operations);
    return { deleted: (removed as { count: number }).count, upserted: uniqueModels.length };
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
    Array<
      ConnectorModel & {
        connector: {
          status: string;
          isEnabled: boolean;
          providerDefinition: { key: string; displayName: string; adapterFamily: string } | null;
        };
      }
    >
  > {
    return this.prisma.connectorModel.findMany({
      where: {
        connector: {
          isEnabled: true,
          OR: [{ providerDefinitionId: null }, { providerDefinition: { isActive: true } }],
        },
        lifecycle: 'ACTIVE',
      },
      include: {
        connector: {
          select: {
            status: true,
            isEnabled: true,
            providerDefinition: { select: { key: true, displayName: true, adapterFamily: true } },
          },
        },
      },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    });
  }

  // User-facing catalog: a model reaches a user only if its connector is enabled,
  // it is ACTIVE, an administrator has EXPOSED it, and it is a CHAT model rather than
  // router infrastructure or an embedding or reranker deployment. The snapshot query
  // (findAllForSnapshot) stays unfiltered on purpose because the router needs
  // infrastructure models that are never user-executable.
  async findExposedForCatalog(): Promise<
    Array<
      ConnectorModel & {
        connector: {
          status: string;
          isEnabled: boolean;
          providerDefinition: { key: string; displayName: string; adapterFamily: string } | null;
        };
      }
    >
  > {
    return this.prisma.connectorModel.findMany({
      where: {
        connector: {
          isEnabled: true,
          OR: [{ providerDefinitionId: null }, { providerDefinition: { isActive: true } }],
        },
        lifecycle: 'ACTIVE',
        exposure: 'EXPOSED',
        kind: 'CHAT',
      },
      include: {
        connector: {
          select: {
            status: true,
            isEnabled: true,
            providerDefinition: { select: { key: true, displayName: true, adapterFamily: true } },
          },
        },
      },
      orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
    });
  }

  // Only a model that already exists on this connector and is not REMOVED may be
  // exposed. A forged or stale modelKey must change nothing rather than create a row.
  async setExposure(
    connectorId: string,
    modelKeys: string[],
    exposed: boolean,
  ): Promise<{ updated: number }> {
    const result = await this.prisma.connectorModel.updateMany({
      where: { connectorId, modelKey: { in: modelKeys }, lifecycle: { not: 'REMOVED' } },
      // An administrator who re-exposes a model clears its unavailable reports.
      data: exposed
        ? { exposure: 'EXPOSED', unavailableCount: 0, unavailableAt: null }
        : { exposure: 'UNEXPOSED' },
    });
    return { updated: result.count };
  }

  // F093: switches Anthropic prompt caching for a bounded set of one connector's
  // models. Same safety as setExposure (existing, non-REMOVED rows only), and
  // ANTHROPIC-only: the flag is meaningless on every other provider, so a
  // forged key for one changes nothing rather than storing a dead switch.
  async setPromptCaching(
    connectorId: string,
    modelKeys: string[],
    enabled: boolean,
  ): Promise<{ updated: number }> {
    const result = await this.prisma.connectorModel.updateMany({
      where: {
        connectorId,
        provider: 'ANTHROPIC',
        modelKey: { in: modelKeys },
        lifecycle: { not: 'REMOVED' },
      },
      data: { promptCaching: enabled },
    });
    return { updated: result.count };
  }

  // Which of these keys are currently exposed. The caller uses this to show what an
  // unexpose would actually take away before it is committed.
  async findExposedKeys(connectorId: string, modelKeys: string[]): Promise<string[]> {
    const rows = await this.prisma.connectorModel.findMany({
      where: { connectorId, modelKey: { in: modelKeys }, exposure: 'EXPOSED' },
      select: { modelKey: true },
    });
    return rows.map((row) => row.modelKey);
  }

  // Records an output ceiling learned from a provider refusal (ADR-125). Only
  // ever LOWERS it: a row whose learned value is already at or below `max`
  // is left alone, so one mis-parsed refusal can never widen a model's cap.
  async lowerLearnedMaxOutputTokens(
    provider: ConnectorProvider,
    modelKeys: string[],
    max: number,
  ): Promise<number> {
    const result = await this.prisma.connectorModel.updateMany({
      where: {
        provider,
        modelKey: { in: modelKeys },
        OR: [{ learnedMaxOutputTokens: null }, { learnedMaxOutputTokens: { gt: max } }],
      },
      data: { learnedMaxOutputTokens: max, learnedMaxOutputAt: new Date() },
    });
    return result.count;
  }

  // Counts one "the provider says this model does not exist" report (ADR-151)
  // and retires the row once MODEL_UNAVAILABLE_RETIRE_THRESHOLD reports landed
  // inside MODEL_UNAVAILABLE_WINDOW_MS. A retired row is hidden from every
  // catalog (lifecycle is no longer ACTIVE) and a sync does not bring it back.
  async recordUnavailable(
    provider: ConnectorProvider,
    modelKeys: string[],
  ): Promise<{ counted: number; retired: number }> {
    const now = new Date();
    const match = { provider, modelKey: { in: modelKeys } };
    const [, counted, retired] = await this.prisma.$transaction([
      this.prisma.connectorModel.updateMany({
        where: {
          ...match,
          unavailableAt: { lt: new Date(now.getTime() - MODEL_UNAVAILABLE_WINDOW_MS) },
        },
        data: { unavailableCount: 0 },
      }),
      this.prisma.connectorModel.updateMany({
        where: { ...match, lifecycle: { not: 'REMOVED' } },
        data: { unavailableCount: { increment: 1 }, unavailableAt: now },
      }),
      this.prisma.connectorModel.updateMany({
        where: {
          ...match,
          unavailableCount: { gte: MODEL_UNAVAILABLE_RETIRE_THRESHOLD },
          lifecycle: 'ACTIVE',
        },
        data: { lifecycle: 'SUNSET', exposure: 'UNEXPOSED' },
      }),
    ]);
    return { counted: counted.count, retired: retired.count };
  }

  // Which of these (provider, model) pairs are real, exposed, chat-capable
  // deployments right now. One query for the whole set, so a plan with 200
  // models costs one round trip. A pair that matches nothing is simply absent.
  async findExposedPairs(
    pairs: Array<{ provider: string; model: string }>,
  ): Promise<Array<{ provider: string; model: string }>> {
    const pairFilters: Prisma.ConnectorModelWhereInput[] = [];
    for (const pair of pairs) {
      pairFilters.push(
        isConnectorProvider(pair.provider)
          ? { provider: pair.provider, modelKey: pair.model }
          : {
              modelKey: pair.model,
              connector: { providerDefinition: { key: pair.provider, isActive: true } },
            },
      );
    }
    const rows = await this.prisma.connectorModel.findMany({
      where: {
        OR: pairFilters,
        exposure: 'EXPOSED',
        kind: 'CHAT',
        lifecycle: 'ACTIVE',
        connector: { isEnabled: true },
      },
      select: {
        provider: true,
        modelKey: true,
        connector: { select: { providerDefinition: { select: { key: true } } } },
      },
    });
    return rows.map((row) => ({
      provider: row.connector.providerDefinition?.key ?? row.provider,
      model: row.modelKey,
    }));
  }
}
