import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import type { Prisma, WorkspaceChainTemplate } from '../../../generated/prisma';

@Injectable()
export class ChainTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<WorkspaceChainTemplate[]> {
    return this.prisma.workspaceChainTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async findByKey(key: string): Promise<WorkspaceChainTemplate | null> {
    return this.prisma.workspaceChainTemplate.findUnique({ where: { key } });
  }

  async upsert(
    key: string,
    data: Prisma.WorkspaceChainTemplateCreateInput,
  ): Promise<WorkspaceChainTemplate> {
    const update: Prisma.WorkspaceChainTemplateUpdateInput = {
      name: data.name,
      description: data.description,
      category: data.category,
      requiredProviders: data.requiredProviders,
      dslTemplate: data.dslTemplate,
      version: data.version,
    };
    return this.prisma.workspaceChainTemplate.upsert({ where: { key }, update, create: data });
  }
}
