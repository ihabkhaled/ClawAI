import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ConnectorModel, type ConnectorProvider } from "../../../generated/prisma";
import { type NormalizedModel } from "../types/connectors.types";

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
        },
      }),
    );

    const results = await this.prisma.$transaction(operations);
    return results.length;
  }

  async findByConnectorId(connectorId: string): Promise<ConnectorModel[]> {
    return this.prisma.connectorModel.findMany({
      where: { connectorId },
      orderBy: { displayName: "asc" },
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
}
