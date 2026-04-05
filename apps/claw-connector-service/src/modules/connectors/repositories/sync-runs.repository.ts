import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type ModelSyncRun } from '../../../generated/prisma';
import { type CreateSyncRunData } from '../types/connectors.types';

@Injectable()
export class SyncRunsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSyncRunData): Promise<ModelSyncRun> {
    return this.prisma.modelSyncRun.create({ data });
  }

  async update(
    id: string,
    data: Partial<CreateSyncRunData> & { completedAt?: Date },
  ): Promise<ModelSyncRun> {
    return this.prisma.modelSyncRun.update({ where: { id }, data });
  }

  async findByConnectorId(connectorId: string, limit: number): Promise<ModelSyncRun[]> {
    return this.prisma.modelSyncRun.findMany({
      where: { connectorId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }
}
