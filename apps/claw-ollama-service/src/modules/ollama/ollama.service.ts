import { Injectable, Logger, type MessageEvent, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { EventPattern } from '@claw/shared-types';
import { map, Observable } from 'rxjs';
import {
  LocalModelRole,
  type ModelCatalogEntry,
  type PullJob,
  PullJobStatus,
  type RuntimeConfig,
  type RuntimeType,
} from '../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../common/errors';
import { type PaginatedResult } from '../../common/types';
import { LocalModelsRepository } from './repositories/local-models.repository';
import { RuntimeConfigsRepository } from './repositories/runtime-configs.repository';
import { ModelCatalogRepository } from './repositories/model-catalog.repository';
import { PullJobsRepository } from './repositories/pull-jobs.repository';
import { OllamaManager } from './managers/ollama.manager';
import { type PullModelDto } from './dto/pull-model.dto';
import { type AssignRoleDto } from './dto/assign-role.dto';
import { type GenerateDto } from './dto/generate.dto';
import { type ListModelsQueryDto } from './dto/list-models-query.dto';
import { type ListCatalogQueryDto } from './dto/list-catalog-query.dto';
import {
  type GenerateResponse,
  type LocalModel,
  type LocalModelRoleAssignment,
  type RuntimeHealth,
} from './types/ollama.types';
import type { CatalogEntryWithInstallStatus, InstalledModelInfo } from './types/catalog.types';
import { PULL_JOBS_RECENT_LIMIT, SSE_EVENT_PULL_PROGRESS } from './constants/catalog.constants';

@Injectable()
export class OllamaService implements OnModuleInit {
  private readonly logger = new Logger(OllamaService.name);

  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
    private readonly modelCatalogRepository: ModelCatalogRepository,
    private readonly pullJobsRepository: PullJobsRepository,
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
      const msg = error instanceof Error ? error.message : 'Unknown error';
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
      throw new EntityNotFoundException('LocalModel', dto.modelId);
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
    this.logger.debug(
      `generate: generating with model=${dto.model} stream=${String(dto.stream ?? false)}`,
    );
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

  async getCatalog(
    query: ListCatalogQueryDto,
  ): Promise<PaginatedResult<CatalogEntryWithInstallStatus>> {
    const filters = { category: query.category, runtime: query.runtime, search: query.search };

    const [entries, total] = await Promise.all([
      this.modelCatalogRepository.findAll(filters, query.page, query.limit),
      this.modelCatalogRepository.countAll(filters),
    ]);

    const enriched = await this.enrichCatalogEntries(entries);

    return {
      data: enriched,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getCatalogEntry(id: string): Promise<CatalogEntryWithInstallStatus> {
    const entry = await this.modelCatalogRepository.findById(id);
    if (!entry) {
      throw new EntityNotFoundException('ModelCatalogEntry', id);
    }
    const [enriched] = await this.enrichCatalogEntries([entry]);
    return enriched as CatalogEntryWithInstallStatus;
  }

  async pullFromCatalog(catalogId: string): Promise<{ pullJobId: string }> {
    const entry = await this.modelCatalogRepository.findById(catalogId);
    if (!entry) {
      throw new EntityNotFoundException('ModelCatalogEntry', catalogId);
    }
    this.logger.log(`pullFromCatalog: starting pull for catalog entry ${catalogId}`);
    return this.ollamaManager.pullModelFromCatalog(entry);
  }

  async getPullJobs(): Promise<PullJob[]> {
    return this.pullJobsRepository.findRecent(PULL_JOBS_RECENT_LIMIT);
  }

  getPullJobProgress(pullJobId: string): Observable<MessageEvent> {
    const subject = this.ollamaManager.getPullProgressSubject(pullJobId);
    if (!subject) {
      throw new BusinessException('No active pull job found with this ID', 'PULL_JOB_NOT_FOUND');
    }

    return subject.asObservable().pipe(
      map(
        (event): MessageEvent => ({
          type: SSE_EVENT_PULL_PROGRESS,
          data: JSON.stringify(event),
        }),
      ),
    );
  }

  async cancelPullJob(pullJobId: string): Promise<PullJob> {
    const job = await this.pullJobsRepository.findById(pullJobId);
    if (!job) {
      throw new EntityNotFoundException('PullJob', pullJobId);
    }

    this.logger.log(`cancelPullJob: cancelling pull job ${pullJobId}`);
    return this.pullJobsRepository.update(pullJobId, {
      status: PullJobStatus.FAILED,
      errorMessage: 'Cancelled by user',
      completedAt: new Date(),
    });
  }

  async getInstalledModelsWithDetails(): Promise<InstalledModelInfo[]> {
    const models = await this.localModelsRepository.findAllInstalledWithRoles();
    return this.mapToInstalledModelInfo(models);
  }

  private mapToInstalledModelInfo(
    models: (LocalModel & { roles?: { role: string }[] })[],
  ): InstalledModelInfo[] {
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      tag: model.tag,
      category: model.category ?? null,
      roles: (model.roles ?? []).map((r) => r.role),
      capabilities: [],
      parameterCount: model.parameters,
      sizeBytes: model.sizeBytes,
    }));
  }

  private async enrichCatalogEntries(
    entries: ModelCatalogEntry[],
  ): Promise<CatalogEntryWithInstallStatus[]> {
    const installed = await this.localModelsRepository.findAllInstalled();
    const installedMap = new Map(installed.map((m) => [`${m.name}:${m.tag}:${m.runtime}`, m.id]));

    return Promise.all(
      entries.map(async (entry) => {
        const key = `${entry.name}:${entry.tag}:${entry.runtime}`;
        const installedModelId = installedMap.get(key) ?? null;
        const pullJob = await this.pullJobsRepository.findLatestByModelName(
          entry.ollamaName ?? `${entry.name}:${entry.tag}`,
        );

        return {
          ...entry,
          isInstalled: installedModelId !== null,
          installedModelId,
          pullJobStatus: pullJob?.status ?? null,
        };
      }),
    );
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = await this.localModelsRepository.findById(modelId);
    if (!model) {
      throw new EntityNotFoundException('LocalModel', modelId);
    }
    const fullName = `${model.name}:${model.tag}`;
    this.logger.log(`deleteModel: deleting model ${fullName} id=${modelId}`);
    await this.ollamaManager.deleteModel(modelId);
    await this.pullJobsRepository.deleteByModelName(fullName);
    this.logger.log(`deleteModel: cleaned up pull jobs for ${fullName}`);

    void this.rabbitMQService.publish(EventPattern.CONNECTOR_UPDATED, {
      action: 'MODEL_DELETED',
      modelId,
      modelName: `${model.name}:${model.tag}`,
      timestamp: new Date().toISOString(),
    });
  }

  async getRouterModelName(): Promise<string | null> {
    const assignment = await this.ollamaManager.getModelForRole('ROUTER' as LocalModelRole);
    if (!assignment) {
      return null;
    }
    const model = await this.localModelsRepository.findById(assignment.modelId);
    return model?.name ?? null;
  }
}
