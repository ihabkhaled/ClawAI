import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { type RuntimeConfig, type UpdateRuntimeConfigPayload } from '../types/process.types';

@Injectable()
export class RuntimeConfigManager {
  private readonly logger = new Logger(RuntimeConfigManager.name);

  constructor(private readonly prisma: PrismaService) {}

  async resolve(modelId: string): Promise<RuntimeConfig> {
    this.logger.debug(`resolve: modelId=${modelId}`);
    const existing = await this.prisma.runtimeConfig.findUnique({ where: { modelId } });
    if (existing) {
      return {
        modelId,
        nGpuLayers: existing.nGpuLayers,
        ctxSize: existing.ctxSize,
        cpuMoe: existing.cpuMoe,
        threads: existing.threads,
        customArgs: existing.customArgs,
      };
    }
    return {
      modelId,
      nGpuLayers: null,
      ctxSize: AppConfig.get().LLAMACPP_DEFAULT_CTX_SIZE,
      cpuMoe: false,
      threads: null,
      customArgs: null,
    };
  }

  async update(modelId: string, payload: UpdateRuntimeConfigPayload): Promise<RuntimeConfig> {
    this.logger.log(`update: modelId=${modelId}`);
    const data = {
      nGpuLayers: payload.nGpuLayers ?? null,
      ctxSize: payload.ctxSize ?? AppConfig.get().LLAMACPP_DEFAULT_CTX_SIZE,
      cpuMoe: payload.cpuMoe ?? false,
      threads: payload.threads ?? null,
      customArgs: payload.customArgs ?? null,
    };
    await this.prisma.runtimeConfig.upsert({
      where: { modelId },
      create: { modelId, ...data },
      update: data,
    });
    return this.resolve(modelId);
  }
}
