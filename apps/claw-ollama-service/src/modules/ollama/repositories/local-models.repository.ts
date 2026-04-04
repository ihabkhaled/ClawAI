import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type LocalModel, type Prisma, type RuntimeType } from "../../../generated/prisma";
import {
  type CreateLocalModelData,
  type LocalModelFilters,
} from "../types/ollama.types";

@Injectable()
export class LocalModelsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateLocalModelData): Promise<LocalModel> {
    return this.prisma.localModel.create({ data });
  }

  async findById(id: string): Promise<LocalModel | null> {
    return this.prisma.localModel.findUnique({ where: { id } });
  }

  async findAll(
    filters: LocalModelFilters,
    page: number,
    limit: number,
  ): Promise<LocalModel[]> {
    const where = this.buildWhereClause(filters);
    const skip = (page - 1) * limit;

    return this.prisma.localModel.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { roles: true },
    });
  }

  async countAll(filters: LocalModelFilters): Promise<number> {
    const where = this.buildWhereClause(filters);
    return this.prisma.localModel.count({ where });
  }

  async upsertByNameTagRuntime(
    data: CreateLocalModelData,
  ): Promise<LocalModel> {
    return this.prisma.localModel.upsert({
      where: {
        name_tag_runtime: {
          name: data.name,
          tag: data.tag,
          runtime: data.runtime,
        },
      },
      update: {
        sizeBytes: data.sizeBytes,
        family: data.family,
        parameters: data.parameters,
        quantization: data.quantization,
        isInstalled: data.isInstalled ?? true,
      },
      create: data,
    });
  }

  async findByRuntime(runtime: RuntimeType): Promise<LocalModel[]> {
    return this.prisma.localModel.findMany({
      where: { runtime, isInstalled: true },
      include: { roles: true },
    });
  }

  async delete(id: string): Promise<LocalModel> {
    return this.prisma.localModel.delete({ where: { id } });
  }

  private buildWhereClause(filters: LocalModelFilters): Prisma.LocalModelWhereInput {
    const where: Prisma.LocalModelWhereInput = {};

    if (filters.runtime !== undefined) {
      where.runtime = filters.runtime;
    }

    if (filters.isInstalled !== undefined) {
      where.isInstalled = filters.isInstalled;
    }

    return where;
  }
}
