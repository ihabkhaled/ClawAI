import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { RabbitMQService } from "@claw/shared-rabbitmq";
import { EventPattern } from "@claw/shared-types";
import { LocalModelRole, type RuntimeConfig, type RuntimeType } from "../../generated/prisma";
import { EntityNotFoundException } from "../../common/errors";
import { type PaginatedResult } from "../../common/types";
import { LocalModelsRepository } from "./repositories/local-models.repository";
import { RuntimeConfigsRepository } from "./repositories/runtime-configs.repository";
import { OllamaManager } from "./managers/ollama.manager";
import { type PullModelDto } from "./dto/pull-model.dto";
import { type AssignRoleDto } from "./dto/assign-role.dto";
import { type GenerateDto } from "./dto/generate.dto";
import { type ListModelsQueryDto } from "./dto/list-models-query.dto";
import {
  type GenerateResponse,
  type LocalModel,
  type LocalModelRoleAssignment,
  type RuntimeHealth,
} from "./types/ollama.types";

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);

  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
    private readonly ollamaManager: OllamaManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncModelsFromRuntime();
  }

  /** Sync installed models from Ollama runtime into the database on startup */
  private async syncModelsFromRuntime(): Promise<void> {
    try {
      const runtimeModels = await this.ollamaManager.syncFromRuntime();
      this.logger.log(`Synced ${String(runtimeModels)} models from Ollama runtime`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to sync models from Ollama runtime: ${msg}`);
    }
  }

  async getModels(query: ListModelsQueryDto): Promise<PaginatedResult<LocalModel>> {
    const filters = {
      runtime: query.runtime,
      isInstalled: query.isInstalled,
    };

    const [models, total] = await Promise.all([
      this.localModelsRepository.findAll(filters, query.page, query.limit),
      this.localModelsRepository.countAll(filters),
    ]);

    return {
      data: models,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async pullModel(dto: PullModelDto): Promise<LocalModel> {
    this.logger.log(`pullModel: pulling model ${dto.modelName} runtime=${dto.runtime}`);
    const model = await this.ollamaManager.pullModel(dto.modelName, dto.runtime);
    this.logger.log(`pullModel: completed pulling ${dto.modelName} id=${model.id}`);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_SYNCED, {
      runtime: dto.runtime,
      modelName: dto.modelName,
      modelId: model.id,
      timestamp: new Date().toISOString(),
    });

    return model;
  }

  async assignRole(dto: AssignRoleDto): Promise<LocalModelRoleAssignment> {
    this.logger.log(`assignRole: assigning role=${dto.role} to model ${dto.modelId}`);
    const model = await this.localModelsRepository.findById(dto.modelId);
    if (!model) {
      throw new EntityNotFoundException("LocalModel", dto.modelId);
    }

    const assignment = await this.ollamaManager.assignRole(dto.modelId, dto.role);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_UPDATED, {
      modelId: dto.modelId,
      role: dto.role,
      timestamp: new Date().toISOString(),
    });

    return assignment;
  }

  async generate(dto: GenerateDto): Promise<GenerateResponse> {
    this.logger.debug(`generate: generating with model=${dto.model} stream=${String(dto.stream ?? false)}`);
    return this.ollamaManager.generate({
      model: dto.model,
      prompt: dto.prompt,
      stream: dto.stream,
    });
  }

  async checkHealth(runtime: string): Promise<RuntimeHealth> {
    this.logger.debug(`checkHealth: checking runtime=${runtime}`);
    return this.ollamaManager.checkRuntimeHealth(runtime as RuntimeType);
  }

  async getRuntimes(): Promise<RuntimeConfig[]> {
    return this.runtimeConfigsRepository.findAll();
  }

  async getRouterModelName(): Promise<string | null> {
    const assignment = await this.ollamaManager.getModelForRole("ROUTER" as LocalModelRole);
    if (!assignment) {
      return null;
    }
    const model = await this.localModelsRepository.findById(assignment.modelId);
    return model?.name ?? null;
  }
}
