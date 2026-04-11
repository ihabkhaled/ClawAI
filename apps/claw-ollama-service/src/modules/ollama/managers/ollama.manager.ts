import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  type ModelCatalogEntry,
  PullJobStatus,
  type RuntimeConfig,
  RuntimeType,
} from '../../../generated/prisma';
import { LocalModelsRepository } from '../repositories/local-models.repository';
import { RoleAssignmentsRepository } from '../repositories/role-assignments.repository';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { RuntimeConfigsRepository } from '../repositories/runtime-configs.repository';
import { getRuntimeAdapter } from './adapters/runtime-adapter-factory';
import { OllamaRuntimeAdapter } from './adapters/ollama-runtime.adapter';
import {
  type GenerateRequest,
  type GenerateResponse,
  type LocalModel,
  type LocalModelRole,
  type LocalModelRoleAssignment,
  type RuntimeHealth,
} from '../types/ollama.types';
import type { PullProgressEvent } from '../types/pull-progress.types';

@Injectable()
export class OllamaManager {
  private readonly logger = new Logger(OllamaManager.name);

  private readonly pullProgressSubjects = new Map<string, Subject<PullProgressEvent>>();

  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly roleAssignmentsRepository: RoleAssignmentsRepository,
    private readonly pullJobsRepository: PullJobsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
  ) {}

  async listInstalledModels(runtime?: RuntimeType): Promise<LocalModel[]> {
    this.logger.debug(`listInstalledModels: listing models — runtime=${runtime ?? 'all'}`);
    if (runtime) {
      const models = await this.localModelsRepository.findByRuntime(runtime);
      this.logger.debug(
        `listInstalledModels: found ${String(models.length)} models for runtime=${runtime}`,
      );
      return models;
    }
    const models = await this.localModelsRepository.findAll({ isInstalled: true }, 1, 1000);
    this.logger.debug(`listInstalledModels: found ${String(models.length)} installed models`);
    return models;
  }

  async pullModel(name: string, runtime: RuntimeType): Promise<LocalModel> {
    this.logger.log(`pullModel: pulling model ${name} on runtime=${runtime}`);
    this.logger.debug(`pullModel: getting runtime adapter for ${runtime}`);
    const adapter = getRuntimeAdapter(runtime);

    this.logger.debug('pullModel: creating pull job record');
    const pullJob = await this.pullJobsRepository.create({
      modelName: name,
      runtime,
      status: PullJobStatus.IN_PROGRESS,
    });
    this.logger.debug(`pullModel: pull job created id=${pullJob.id}`);

    try {
      this.logger.debug(`pullModel: initiating model pull for ${name}`);
      await adapter.pullModel(name);
      this.logger.debug('pullModel: pull completed — listing runtime models');
      const models = await adapter.listModels();
      this.logger.debug(
        `pullModel: runtime has ${String(models.length)} models — searching for pulled model`,
      );
      const pulled = models.find((m) => m.name === name || `${m.name}:${m.tag}` === name);

      const modelData = pulled ?? {
        name,
        tag: 'latest',
        sizeBytes: null,
        family: null,
        parameters: null,
        quantization: null,
      };
      this.logger.debug(
        `pullModel: upserting model record — name=${modelData.name} tag=${modelData.tag}`,
      );

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

      this.logger.debug('pullModel: updating pull job as COMPLETED');
      await this.pullJobsRepository.update(pullJob.id, {
        status: PullJobStatus.COMPLETED,
        progress: 100,
        completedAt: new Date(),
      });

      this.logger.log(`pullModel: completed pulling ${name}, id=${localModel.id}`);
      return localModel;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown pull error';
      this.logger.error(`pullModel: failed to pull model ${name}: ${errorMessage}`);

      this.logger.debug('pullModel: updating pull job as FAILED');
      await this.pullJobsRepository.update(pullJob.id, {
        status: PullJobStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });
      throw error;
    }
  }

  async pullModelFromCatalog(catalogEntry: ModelCatalogEntry): Promise<{ pullJobId: string }> {
    const modelFullName = catalogEntry.ollamaName ?? `${catalogEntry.name}:${catalogEntry.tag}`;
    this.logger.log(
      `pullModelFromCatalog: pulling ${modelFullName} from catalog id=${catalogEntry.id}`,
    );

    const existingJob = await this.pullJobsRepository.findActiveByModelName(modelFullName);
    if (existingJob) {
      this.logger.log(
        `pullModelFromCatalog: reusing existing job ${existingJob.id} for ${modelFullName}`,
      );
      return { pullJobId: existingJob.id };
    }

    const pullJob = await this.pullJobsRepository.create({
      modelName: modelFullName,
      runtime: catalogEntry.runtime,
      status: PullJobStatus.IN_PROGRESS,
    });

    const subject = new Subject<PullProgressEvent>();
    this.pullProgressSubjects.set(pullJob.id, subject);

    void this.executeCatalogPull(catalogEntry, pullJob.id, modelFullName, subject);

    return { pullJobId: pullJob.id };
  }

  private async executeCatalogPull(
    catalogEntry: ModelCatalogEntry,
    pullJobId: string,
    modelFullName: string,
    subject: Subject<PullProgressEvent>,
  ): Promise<void> {
    try {
      const adapter = getRuntimeAdapter(catalogEntry.runtime);

      await (adapter instanceof OllamaRuntimeAdapter
        ? this.pullWithProgressTracking(adapter, modelFullName, pullJobId, subject)
        : adapter.pullModel(modelFullName));

      await this.upsertModelFromCatalog(catalogEntry, modelFullName);
      await this.completePullJob(pullJobId);
      subject.complete();
    } catch (error: unknown) {
      await this.failPullJob(pullJobId, error);
      subject.error(error);
    } finally {
      this.pullProgressSubjects.delete(pullJobId);
    }
  }

  private async pullWithProgressTracking(
    adapter: OllamaRuntimeAdapter,
    modelFullName: string,
    pullJobId: string,
    subject: Subject<PullProgressEvent>,
  ): Promise<void> {
    await adapter.pullModelWithProgress(modelFullName, (event) => {
      subject.next(event);
      void this.pullJobsRepository.update(pullJobId, {
        progress: event.percentage,
        totalBytes: event.total !== undefined ? BigInt(event.total) : null,
        downloadedBytes: event.completed !== undefined ? BigInt(event.completed) : null,
      });
    });
  }

  private async upsertModelFromCatalog(
    catalogEntry: ModelCatalogEntry,
    modelFullName: string,
  ): Promise<void> {
    const parts = modelFullName.split(':');
    const name = parts[0] ?? modelFullName;
    const tag = parts[1] ?? 'latest';

    await this.localModelsRepository.upsertByNameTagRuntime({
      name,
      tag,
      runtime: catalogEntry.runtime,
      sizeBytes: catalogEntry.sizeBytes,
      parameters: catalogEntry.parameterCount,
      category: catalogEntry.category,
      isInstalled: true,
    });
  }

  private async completePullJob(pullJobId: string): Promise<void> {
    await this.pullJobsRepository.update(pullJobId, {
      status: PullJobStatus.COMPLETED,
      progress: 100,
      completedAt: new Date(),
    });
  }

  private async failPullJob(pullJobId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown pull error';
    this.logger.error(`pullModelFromCatalog: failed pullJobId=${pullJobId}: ${errorMessage}`);

    await this.pullJobsRepository.update(pullJobId, {
      status: PullJobStatus.FAILED,
      errorMessage,
      completedAt: new Date(),
    });
  }

  async deleteModel(modelId: string): Promise<void> {
    const model = await this.localModelsRepository.findById(modelId);
    if (!model) {
      return;
    }

    const fullName = `${model.name}:${model.tag}`;
    this.logger.log(`deleteModel: removing ${fullName} from runtime and DB`);

    try {
      const adapter = getRuntimeAdapter(model.runtime);
      if (adapter instanceof OllamaRuntimeAdapter) {
        await adapter.deleteModel(fullName);
        this.logger.debug(`deleteModel: removed ${fullName} from Ollama runtime`);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`deleteModel: runtime removal failed for ${fullName}: ${msg}`);
    }

    await this.localModelsRepository.delete(modelId);
    this.logger.log(`deleteModel: removed ${fullName} from database`);
  }

  getPullProgressSubject(pullJobId: string): Subject<PullProgressEvent> | undefined {
    return this.pullProgressSubjects.get(pullJobId);
  }

  async assignRole(modelId: string, role: LocalModelRole): Promise<LocalModelRoleAssignment> {
    this.logger.log(`assignRole: assigning role=${String(role)} to model ${modelId}`);
    this.logger.debug(`assignRole: deactivating existing assignments for role=${String(role)}`);
    await this.roleAssignmentsRepository.deactivateByRole(role);

    this.logger.debug('assignRole: creating new role assignment');
    const assignment = await this.roleAssignmentsRepository.create({
      modelId,
      role,
      isActive: true,
    });
    this.logger.debug(`assignRole: assignment created id=${assignment.id}`);
    return assignment;
  }

  async getModelForRole(role: LocalModelRole): Promise<LocalModelRoleAssignment | null> {
    this.logger.debug(`getModelForRole: looking up active model for role=${String(role)}`);
    const assignment = await this.roleAssignmentsRepository.findActiveByRole(role);
    this.logger.debug(
      `getModelForRole: ${assignment ? `found modelId=${assignment.modelId}` : 'no active assignment'}`,
    );
    return assignment;
  }

  async checkRuntimeHealth(runtime: RuntimeType): Promise<RuntimeHealth> {
    this.logger.debug(`checkRuntimeHealth: checking health for runtime=${runtime}`);
    const adapter = getRuntimeAdapter(runtime);
    const health = await adapter.healthCheck();
    this.logger.debug(`checkRuntimeHealth: runtime=${runtime} healthy=${String(health.healthy)}`);
    return health;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    this.logger.debug(
      `generate: calling Ollama model=${request.model} stream=${String(request.stream ?? false)}`,
    );
    const startTime = Date.now();
    const runtime = RuntimeType.OLLAMA;
    const adapter = getRuntimeAdapter(runtime);
    this.logger.debug('generate: sending request to Ollama runtime');
    const response = await adapter.generate(request);
    const durationMs = Date.now() - startTime;
    this.logger.debug(
      `generate: completed model=${request.model} durationMs=${String(durationMs)} responseLen=${String(response.response.length)}`,
    );
    return response;
  }

  async getRuntimeConfigs(): Promise<RuntimeConfig[]> {
    this.logger.debug('getRuntimeConfigs: fetching all runtime configs');
    const configs = await this.runtimeConfigsRepository.findAll();
    this.logger.debug(`getRuntimeConfigs: found ${String(configs.length)} configs`);
    return configs;
  }

  async syncFromRuntime(): Promise<number> {
    this.logger.log('syncFromRuntime: syncing models from Ollama runtime');
    const adapter = getRuntimeAdapter(RuntimeType.OLLAMA);
    this.logger.debug('syncFromRuntime: listing models from runtime');
    const runtimeModels = await adapter.listModels();
    this.logger.debug(`syncFromRuntime: runtime has ${String(runtimeModels.length)} models`);

    for (const model of runtimeModels) {
      this.logger.debug(`syncFromRuntime: upserting model ${model.name}:${model.tag}`);
      await this.localModelsRepository.upsertByNameTagRuntime({
        name: model.name,
        tag: model.tag,
        runtime: RuntimeType.OLLAMA,
        sizeBytes: model.sizeBytes,
        family: model.family,
        parameters: model.parameters,
        quantization: model.quantization,
        isInstalled: true,
      });
    }

    this.logger.log(`syncFromRuntime: synced ${String(runtimeModels.length)} models`);
    return runtimeModels.length;
  }
}
