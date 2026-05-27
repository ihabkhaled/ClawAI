import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import {
  type ModelCatalogEntry,
  PullJobStatus,
  type RuntimeConfig,
  RuntimeType,
} from '../../../generated/prisma';
import { PullJobPhase } from '../../../common/enums';
import { LocalModelsRepository } from '../repositories/local-models.repository';
import { RoleAssignmentsRepository } from '../repositories/role-assignments.repository';
import { PullJobsRepository } from '../repositories/pull-jobs.repository';
import { RuntimeConfigsRepository } from '../repositories/runtime-configs.repository';
import { DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS } from '../constants/default-models.constants';
import { COMFYUI_DEFAULT_FAMILY } from '../constants/comfyui.constants';
import {
  INSTALL_RETRY_BASE_MS,
  INSTALL_RETRY_MAX,
  PROGRESS_DB_THROTTLE_MS,
  PROGRESS_SSE_THROTTLE_MS,
  PULL_RETRY_BASE_MS,
  PULL_RETRY_MAX,
  PULL_RETRY_MAX_BACKOFF_MS,
} from '../constants/pull-resilience.constants';
import { getRuntimeAdapter } from './adapters/runtime-adapter-factory';
import { OllamaRuntimeAdapter } from './adapters/ollama-runtime.adapter';
import { BusinessException } from '../../../common/errors';
import {
  type GenerateRequest,
  type GenerateResponse,
  type LocalModel,
  type LocalModelInfo,
  type LocalModelRole,
  type LocalModelRoleAssignment,
  type RuntimeAdapter,
  type RuntimeHealth,
} from '../types/ollama.types';
import type { PullProgressBase, PullProgressEvent } from '../types/pull-progress.types';
import { type DownloadStatsState } from '../types/download-stats.types';
import { createStatsState, tickStats } from '../utilities/download-stats.utility';

@Injectable()
export class OllamaManager {
  private readonly logger = new Logger(OllamaManager.name);

  private readonly pullProgressSubjects = new Map<string, Subject<PullProgressEvent>>();
  private readonly activePullJobs = new Set<string>();

  constructor(
    private readonly localModelsRepository: LocalModelsRepository,
    private readonly roleAssignmentsRepository: RoleAssignmentsRepository,
    private readonly pullJobsRepository: PullJobsRepository,
    private readonly runtimeConfigsRepository: RuntimeConfigsRepository,
  ) {}

  isPullJobRunning(jobId: string): boolean {
    return this.activePullJobs.has(jobId);
  }

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
      const modelData = await this.resolveInstalledModelInfo(adapter, name);
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

  async pullModelFromCatalog(
    catalogEntry: ModelCatalogEntry,
    modelFullNameOverride?: string,
  ): Promise<{ pullJobId: string }> {
    const modelFullName =
      modelFullNameOverride ??
      catalogEntry.ollamaName ??
      `${catalogEntry.name}:${catalogEntry.tag}`;
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
      phase: PullJobPhase.DOWNLOADING,
    });

    const subject = new Subject<PullProgressEvent>();
    this.pullProgressSubjects.set(pullJob.id, subject);

    void this.executeCatalogPull(catalogEntry, pullJob.id, modelFullName, subject, false);

    return { pullJobId: pullJob.id };
  }

  async resumeCatalogPull(
    catalogEntry: ModelCatalogEntry,
    pullJobId: string,
    modelFullName: string,
  ): Promise<void> {
    if (this.activePullJobs.has(pullJobId)) {
      this.logger.warn(`resumeCatalogPull: ${pullJobId} already running, skipping`);
      return;
    }
    this.logger.log(`resumeCatalogPull: resuming ${pullJobId} for ${modelFullName}`);
    await this.pullJobsRepository.markResumed(pullJobId);
    const subject = new Subject<PullProgressEvent>();
    this.pullProgressSubjects.set(pullJobId, subject);
    void this.executeCatalogPull(catalogEntry, pullJobId, modelFullName, subject, true);
  }

  private async executeCatalogPull(
    catalogEntry: ModelCatalogEntry,
    pullJobId: string,
    modelFullName: string,
    subject: Subject<PullProgressEvent>,
    isResume: boolean,
  ): Promise<void> {
    this.activePullJobs.add(pullJobId);
    try {
      const adapter = getRuntimeAdapter(catalogEntry.runtime);

      if (adapter instanceof OllamaRuntimeAdapter) {
        await this.runOllamaPullWithRetries(adapter, modelFullName, pullJobId, subject, isResume);
      } else {
        await adapter.pullModel(modelFullName);
      }

      // installCatalogModel wraps resolution + DB upsert in a retry loop
      // (agent #1's INSTALL_RETRY_MAX) and is ComfyUI-aware (synthesizes
      // LocalModelInfo from the catalog entry instead of querying the
      // runtime, because the ComfyUI registry has no 1:1 model entry).
      const installedModel = await this.installCatalogModel(
        catalogEntry,
        pullJobId,
        adapter,
        modelFullName,
        subject,
      );
      await this.completePullJob(pullJobId);
      this.emitPhase(subject, pullJobId, PullJobPhase.DONE, {
        status: 'success',
        percentage: 100,
        total: Number(installedModel.sizeBytes ?? 0n),
        completed: Number(installedModel.sizeBytes ?? 0n),
      });
      await this.pullJobsRepository.deleteOlderByModelName(modelFullName, pullJobId);
      subject.complete();
    } catch (error: unknown) {
      await this.failPullJob(pullJobId, error);
      subject.error(error);
    } finally {
      this.pullProgressSubjects.delete(pullJobId);
      this.activePullJobs.delete(pullJobId);
    }
  }

  private async runOllamaPullWithRetries(
    adapter: OllamaRuntimeAdapter,
    modelFullName: string,
    pullJobId: string,
    subject: Subject<PullProgressEvent>,
    isResume: boolean,
  ): Promise<void> {
    let attempt = 0;
    while (attempt < PULL_RETRY_MAX) {
      try {
        await this.pullWithProgressTracking(adapter, modelFullName, pullJobId, subject);
        return;
      } catch (error) {
        attempt++;
        const errMsg = error instanceof Error ? error.message : 'unknown';
        await this.pullJobsRepository.incrementRetryAttempts(pullJobId);
        if (attempt >= PULL_RETRY_MAX) {
          throw error;
        }
        const delay = Math.min(
          PULL_RETRY_BASE_MS * Math.pow(2, attempt - 1),
          PULL_RETRY_MAX_BACKOFF_MS,
        );
        this.logger.warn(
          `runOllamaPullWithRetries: ${pullJobId} attempt ${attempt}/${PULL_RETRY_MAX} after ${delay}ms — ${errMsg}${isResume ? ' (resume)' : ''}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private buildComfyUiInstalledModelInfo(catalogEntry: ModelCatalogEntry): LocalModelInfo {
    return {
      name: catalogEntry.name,
      tag: catalogEntry.tag,
      sizeBytes: catalogEntry.sizeBytes ?? null,
      family: COMFYUI_DEFAULT_FAMILY,
      parameters: catalogEntry.parameterCount,
      quantization: null,
    };
  }

  private async pullWithProgressTracking(
    adapter: OllamaRuntimeAdapter,
    modelFullName: string,
    pullJobId: string,
    subject: Subject<PullProgressEvent>,
  ): Promise<void> {
    const job = await this.pullJobsRepository.findById(pullJobId);
    const startedAtMs = job?.startedAt.getTime() ?? Date.now();
    const initialBytes = Number(job?.downloadedBytes ?? 0n);
    const stats: DownloadStatsState = createStatsState(initialBytes, startedAtMs);
    let lastDbWrite = 0;
    let lastSseEmit = 0;
    let lastPhase: PullJobPhase = PullJobPhase.DOWNLOADING;

    await adapter.pullModelWithProgress(modelFullName, (event) => {
      const total = event.total ?? 0;
      const completed = event.completed ?? 0;
      const now = Date.now();
      const snap = tickStats(stats, completed, total, startedAtMs, now);
      const phase = event.phase ?? PullJobPhase.DOWNLOADING;

      // On phase transition emit immediately + persist
      const phaseChanged = phase !== lastPhase;
      if (phaseChanged) {
        lastPhase = phase;
        const newStatus =
          phase === PullJobPhase.INSTALLING || phase === PullJobPhase.FINALIZING
            ? PullJobStatus.INSTALLING
            : PullJobStatus.IN_PROGRESS;
        void this.pullJobsRepository.update(pullJobId, {
          phase,
          status: newStatus,
          installStep: phase === PullJobPhase.INSTALLING ? event.status : null,
          lastProgressAt: new Date(),
        });
        subject.next({
          ...event,
          phase,
          installStep: event.installStep,
          speedBytesPerSec: snap.speedBytesPerSec,
          mbps: snap.mbps,
          etaSeconds: snap.etaSeconds,
          elapsedMs: snap.elapsedMs,
        });
        return;
      }

      // Throttled DB write
      if (now - lastDbWrite > PROGRESS_DB_THROTTLE_MS) {
        lastDbWrite = now;
        void this.pullJobsRepository.update(pullJobId, {
          progress: event.percentage,
          totalBytes: event.total !== undefined ? BigInt(event.total) : null,
          downloadedBytes: event.completed !== undefined ? BigInt(event.completed) : null,
          phase,
          lastProgressAt: new Date(),
        });
      }
      // Throttled SSE emit
      if (now - lastSseEmit > PROGRESS_SSE_THROTTLE_MS) {
        lastSseEmit = now;
        subject.next({
          ...event,
          phase,
          speedBytesPerSec: snap.speedBytesPerSec,
          mbps: snap.mbps,
          etaSeconds: snap.etaSeconds,
          elapsedMs: snap.elapsedMs,
        });
      }
    });
  }

  private async installCatalogModel(
    catalogEntry: ModelCatalogEntry,
    pullJobId: string,
    adapter: RuntimeAdapter,
    modelFullName: string,
    subject: Subject<PullProgressEvent>,
  ): Promise<LocalModelInfo> {
    // Switch to INSTALLING status if not already (covers non-Ollama adapters where
    // we didn't see install-phase keywords in the stream).
    const currentJob = await this.pullJobsRepository.findById(pullJobId);
    if (currentJob && currentJob.status !== PullJobStatus.INSTALLING) {
      await this.pullJobsRepository.update(pullJobId, {
        status: PullJobStatus.INSTALLING,
        phase: PullJobPhase.INSTALLING,
        installStep: 'registering-model',
      });
    }
    this.emitPhase(subject, pullJobId, PullJobPhase.INSTALLING, {
      status: 'registering-model',
      percentage: 100,
    });

    let attempt = 0;
    let lastError: unknown;
    while (attempt < INSTALL_RETRY_MAX) {
      try {
        // ComfyUI catalog pulls don't surface via the runtime's "list models"
        // RPC (weights are dropped into the models/ tree on disk, and the
        // catalog key drives routing/policies, not the runtime registry).
        // Synthesize the LocalModelInfo from the catalog row instead of
        // scanning the runtime.
        const installedModel =
          catalogEntry.runtime === RuntimeType.COMFYUI
            ? this.buildComfyUiInstalledModelInfo(catalogEntry)
            : await this.resolveInstalledModelInfo(adapter, modelFullName);
        await this.upsertModelFromCatalog(catalogEntry, installedModel);
        return installedModel;
      } catch (error) {
        lastError = error;
        attempt++;
        await this.pullJobsRepository.incrementInstallAttempts(pullJobId);
        if (attempt >= INSTALL_RETRY_MAX) {
          break;
        }
        const delay = INSTALL_RETRY_BASE_MS * Math.pow(2, attempt - 1);
        this.logger.warn(
          `installCatalogModel: ${pullJobId} install attempt ${attempt}/${INSTALL_RETRY_MAX} after ${delay}ms — ${(error as Error).message}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError ?? new Error('Install retries exhausted');
  }

  private emitPhase(
    subject: Subject<PullProgressEvent>,
    _jobId: string,
    phase: PullJobPhase,
    base: PullProgressBase,
  ): void {
    subject.next({
      ...base,
      phase,
      installStep: phase === PullJobPhase.INSTALLING ? base.status : undefined,
    });
  }

  private async upsertModelFromCatalog(
    catalogEntry: ModelCatalogEntry,
    installedModel: LocalModelInfo,
  ): Promise<void> {
    await this.localModelsRepository.upsertByNameTagRuntime({
      name: installedModel.name,
      tag: installedModel.tag,
      runtime: catalogEntry.runtime,
      sizeBytes: installedModel.sizeBytes,
      family: installedModel.family,
      parameters: installedModel.parameters ?? catalogEntry.parameterCount,
      quantization: installedModel.quantization,
      category: catalogEntry.category,
      isInstalled: true,
    });
  }

  private async resolveInstalledModelInfo(
    adapter: RuntimeAdapter,
    modelFullName: string,
  ): Promise<LocalModelInfo> {
    this.logger.debug(`resolveInstalledModelInfo: verifying ${modelFullName} exists in runtime`);
    const models = await adapter.listModels();
    this.logger.debug(
      `resolveInstalledModelInfo: runtime has ${String(models.length)} models after pull`,
    );

    const installedModel = models.find(
      (model) => model.name === modelFullName || `${model.name}:${model.tag}` === modelFullName,
    );

    if (installedModel === undefined) {
      throw new Error(`Model ${modelFullName} was not found in the runtime after pull`);
    }

    return installedModel;
  }

  private async completePullJob(pullJobId: string): Promise<void> {
    await this.pullJobsRepository.update(pullJobId, {
      status: PullJobStatus.COMPLETED,
      phase: PullJobPhase.DONE,
      progress: 100,
      completedAt: new Date(),
    });
  }

  private async failPullJob(pullJobId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown pull error';
    this.logger.error(`pullModelFromCatalog: failed pullJobId=${pullJobId}: ${errorMessage}`);

    await this.pullJobsRepository.update(pullJobId, {
      status: PullJobStatus.FAILED,
      phase: PullJobPhase.DONE,
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

  async clearOtherRolesForModel(modelId: string, keepRole?: LocalModelRole): Promise<number> {
    this.logger.log(
      `clearOtherRolesForModel: removing stale roles for model=${modelId} keepRole=${keepRole ?? 'none'}`,
    );
    const assignments = await this.roleAssignmentsRepository.findByModelId(modelId);
    const removable = assignments.filter((assignment) => assignment.role !== keepRole);

    for (const assignment of removable) {
      await this.roleAssignmentsRepository.delete(assignment.id);
    }

    this.logger.debug(
      `clearOtherRolesForModel: removed ${String(removable.length)} stale assignments for model=${modelId}`,
    );
    return removable.length;
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
    try {
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
    } catch (error: unknown) {
      const errorMessage = this.extractGenerateErrorMessage(error);
      this.logger.error(`generate: failed model=${request.model} error=${errorMessage}`);
      throw new BusinessException(errorMessage, 'OLLAMA_REQUEST_FAILED', HttpStatus.BAD_GATEWAY);
    }
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

    const runtimeKeys: string[] = [];

    for (const model of runtimeModels) {
      const modelKey = `${model.name}:${model.tag}`;
      if (
        DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS.has(model.name) ||
        DEPRECATED_DEFAULT_LOCAL_MODEL_KEYS.has(modelKey)
      ) {
        this.logger.log(`syncFromRuntime: pruning deprecated model ${modelKey}`);
        try {
          if (adapter instanceof OllamaRuntimeAdapter) {
            await adapter.deleteModel(modelKey);
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`syncFromRuntime: failed to prune ${modelKey} from runtime: ${msg}`);
        }
        continue;
      }

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
      runtimeKeys.push(modelKey);
    }

    const deletedDeprecated = await this.localModelsRepository.deleteDeprecatedDefaults(
      RuntimeType.OLLAMA,
    );
    if (deletedDeprecated > 0) {
      this.logger.log(
        `syncFromRuntime: deleted ${String(deletedDeprecated)} deprecated model rows from DB`,
      );
    }

    const removed = await this.localModelsRepository.markMissingAsUninstalled(
      runtimeKeys,
      RuntimeType.OLLAMA,
    );
    if (removed > 0) {
      this.logger.log(`syncFromRuntime: marked ${String(removed)} phantom models as uninstalled`);
    }

    this.logger.log(`syncFromRuntime: synced ${String(runtimeModels.length)} models`);
    return runtimeModels.length;
  }

  private extractGenerateErrorMessage(error: unknown): string {
    if (error !== null && typeof error === 'object') {
      const payload = error as Record<string, unknown>;
      const response = payload['response'];

      if (response !== null && typeof response === 'object') {
        const responsePayload = response as Record<string, unknown>;
        const data = responsePayload['data'];
        if (data !== null && typeof data === 'object') {
          const dataPayload = data as Record<string, unknown>;
          const message = dataPayload['message'];
          if (typeof message === 'string' && message.trim().length > 0) {
            return message;
          }

          const errorMessage = dataPayload['error'];
          if (typeof errorMessage === 'string' && errorMessage.trim().length > 0) {
            return errorMessage;
          }
        }
      }
    }

    return error instanceof Error && error.message.trim().length > 0
      ? error.message
      : 'Ollama runtime request failed';
  }
}
