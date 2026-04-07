import { Injectable } from "@nestjs/common";
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
export class OllamaService {
  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
    private readonly ollamaManager: OllamaManager,
    private readonly rabbitMQService: RabbitMQService,
  ) {}

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
    const model = await this.ollamaManager.pullModel(dto.modelName, dto.runtime);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_SYNCED, {
      runtime: dto.runtime,
      modelName: dto.modelName,
      modelId: model.id,
      timestamp: new Date().toISOString(),
    });

    return model;
  }

  async assignRole(dto: AssignRoleDto): Promise<LocalModelRoleAssignment> {
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
    return this.ollamaManager.generate({
      model: dto.model,
      prompt: dto.prompt,
      stream: dto.stream,
    });
  }

  async checkHealth(runtime: string): Promise<RuntimeHealth> {
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
