import { Injectable, Logger } from "@nestjs/common";
import { type RuntimeConfig, PullJobStatus, RuntimeType } from "../../../generated/prisma";
import { LocalModelsRepository } from "../repositories/local-models.repository";
import { RoleAssignmentsRepository } from "../repositories/role-assignments.repository";
import { PullJobsRepository } from "../repositories/pull-jobs.repository";
import { RuntimeConfigsRepository } from "../repositories/runtime-configs.repository";
import { getRuntimeAdapter } from "./adapters/runtime-adapter-factory";
import {
  type GenerateRequest,
  type GenerateResponse,
  type RuntimeHealth,
  type LocalModelRole,
  type LocalModel,
  type LocalModelRoleAssignment,
} from "../types/ollama.types";

@Injectable()
export class OllamaManager {
  private readonly logger = new Logger(OllamaManager.name);

  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly roleAssignmentsRepository: RoleAssignmentsRepository,
    private readonly pullJobsRepository: PullJobsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
  ) {}

  async listInstalledModels(runtime?: RuntimeType): Promise<LocalModel[]> {
    if (runtime) {
      return this.localModelsRepository.findByRuntime(runtime);
    }
    return this.localModelsRepository.findAll({ isInstalled: true }, 1, 1000);
  }

  async pullModel(name: string, runtime: RuntimeType): Promise<LocalModel> {
    const adapter = getRuntimeAdapter(runtime);

    const pullJob = await this.pullJobsRepository.create({
      modelName: name,
      runtime,
      status: PullJobStatus.IN_PROGRESS,
    });

    try {
      await adapter.pullModel(name);
      const models = await adapter.listModels();
      const pulled = models.find((m) => m.name === name || `${m.name}:${m.tag}` === name);

      const modelData = pulled ?? { name, tag: "latest", sizeBytes: null, family: null, parameters: null, quantization: null };

      const localModel = await this.localModelsRepository.upsertByNameTagRuntime({
        name: modelData.name,
        tag: modelData.tag,
        runtime,
        sizeBytes: modelData.sizeBytes,
        family: modelData.family,
        parameters: modelData.parameters,
        quantization: modelData.quantization,
        isInstalled: true,
      });

      await this.pullJobsRepository.update(pullJob.id, {
        status: PullJobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      });

      return localModel;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown pull error";
      this.logger.error(`Failed to pull model ${name}: ${errorMessage}`);

      await this.pullJobsRepository.update(pullJob.id, {
        status: PullJobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  async assignRole(
    modelId: string,
    role: LocalModelRole,
  ): Promise<LocalModelRoleAssignment> {
    await this.roleAssignmentsRepository.deactivateByRole(role);

    return this.roleAssignmentsRepository.create({
      modelId,
      role,
      isActive: true,
    });
  }

  async getModelForRole(role: LocalModelRole): Promise<LocalModelRoleAssignment | null> {
    return this.roleAssignmentsRepository.findActiveByRole(role);
  }

  async checkRuntimeHealth(runtime: RuntimeType): Promise<RuntimeHealth> {
    const adapter = getRuntimeAdapter(runtime);
    return adapter.healthCheck();
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const runtime = RuntimeType.OLLAMA;
    const adapter = getRuntimeAdapter(runtime);
    return adapter.generate(request);
  }

  async getRuntimeConfigs(): Promise<RuntimeConfig[]> {
    return this.runtimeConfigsRepository.findAll();
  }
}
