import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceProvider,
  WorkspaceProviderDefinition,
} from '../../../generated/prisma';

@Injectable()
export class ProviderDefinitionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<WorkspaceProviderDefinition[]> {
    return this.prisma.workspaceProviderDefinition.findMany({
      orderBy: { displayName: 'asc' },
    });
  }

  async findByProvider(provider: WorkspaceProvider): Promise<WorkspaceProviderDefinition | null> {
    return this.prisma.workspaceProviderDefinition.findUnique({ where: { provider } });
  }

  async findById(id: string): Promise<WorkspaceProviderDefinition | null> {
    return this.prisma.workspaceProviderDefinition.findUnique({ where: { id } });
  }

  async upsert(
    provider: WorkspaceProvider,
    data: Prisma.WorkspaceProviderDefinitionCreateInput,
  ): Promise<WorkspaceProviderDefinition> {
    const update: Prisma.WorkspaceProviderDefinitionUpdateInput = {
      displayName: data.displayName,
      description: data.description,
      authModes: data.authModes,
      defaultAuthMode: data.defaultAuthMode,
      configSchema: data.configSchema,
      capabilities: data.capabilities,
      supportedObjects: data.supportedObjects,
      supportedActions: data.supportedActions,
      iconUrl: data.iconUrl,
      docsUrl: data.docsUrl,
      adapterKey: data.adapterKey,
      status: data.status,
      version: data.version,
    };
    return this.prisma.workspaceProviderDefinition.upsert({
      where: { provider },
      update,
      create: data,
    });
  }
}
