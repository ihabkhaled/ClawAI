import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type {
  Prisma,
  WorkspaceProvider,
  WorkspaceProviderAppConfig,
} from '../../../generated/prisma';

@Injectable()
export class ProviderAppConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(provider?: WorkspaceProvider): Promise<WorkspaceProviderAppConfig[]> {
    return this.prisma.workspaceProviderAppConfig.findMany({
      where: provider !== undefined ? { provider } : undefined,
      orderBy: [{ provider: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string): Promise<WorkspaceProviderAppConfig | null> {
    return this.prisma.workspaceProviderAppConfig.findUnique({ where: { id } });
  }

  async findByProviderAndName(
    provider: WorkspaceProvider,
    name: string,
  ): Promise<WorkspaceProviderAppConfig | null> {
    return this.prisma.workspaceProviderAppConfig.findUnique({
      where: { provider_name: { provider, name } },
    });
  }

  async create(
    data: Prisma.WorkspaceProviderAppConfigCreateInput,
  ): Promise<WorkspaceProviderAppConfig> {
    return this.prisma.workspaceProviderAppConfig.create({ data });
  }

  async update(
    id: string,
    data: Prisma.WorkspaceProviderAppConfigUpdateInput,
  ): Promise<WorkspaceProviderAppConfig> {
    return this.prisma.workspaceProviderAppConfig.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.workspaceProviderAppConfig.delete({ where: { id } });
  }
}
