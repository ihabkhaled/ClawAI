import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type ModelSyncRun, type ModelSyncStatus } from "../../../generated/prisma";

export interface CreateSyncRunData {
  connectorId: string;
  status: ModelSyncStatus;
  modelsFound?: number;
  modelsAdded?: number;
  modelsRemoved?: number;
  errorMessage?: string;
  completedAt?: Date;
}

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
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }
}
