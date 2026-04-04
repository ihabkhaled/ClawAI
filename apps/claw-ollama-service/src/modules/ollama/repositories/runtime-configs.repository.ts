import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../infrastructure/database/prisma/prisma.service";
import { type RuntimeConfig, type RuntimeType } from "../../../generated/prisma";
import {
  type CreateRuntimeConfigData,
  type UpdateRuntimeConfigData,
} from "../types/ollama.types";

@Injectable()
export class RuntimeConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRuntimeConfigData): Promise<RuntimeConfig> {
    return this.prisma.runtimeConfig.create({ data });
  }

  async findByRuntime(runtime: RuntimeType): Promise<RuntimeConfig | null> {
    return this.prisma.runtimeConfig.findUnique({ where: { runtime } });
  }

  async findAll(): Promise<RuntimeConfig[]> {
    return this.prisma.runtimeConfig.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: UpdateRuntimeConfigData): Promise<RuntimeConfig> {
    return this.prisma.runtimeConfig.update({ where: { id }, data });
  }

  async upsertByRuntime(data: CreateRuntimeConfigData): Promise<RuntimeConfig> {
    return this.prisma.runtimeConfig.upsert({
      where: { runtime: data.runtime },
      update: { baseUrl: data.baseUrl, isEnabled: data.isEnabled },
      create: data,
    });
  }

  async delete(id: string): Promise<RuntimeConfig> {
    return this.prisma.runtimeConfig.delete({ where: { id } });
  }
}
