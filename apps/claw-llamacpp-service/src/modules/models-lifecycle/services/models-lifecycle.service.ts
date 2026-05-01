import * as fs from 'node:fs';
import * as path from 'node:path';
import { HttpStatus, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { Mutex } from 'async-mutex';
import { request } from 'undici';
import { AppConfig } from '../../../app/config/app.config';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { DownloadStatus, LoadEventType, LoadStatus } from '../../../common/enums';
import { isWithinRoot, resolveSafePath } from '../../../common/utilities';
import { LlamacppEventsPublisher } from '../../../common/events/llamacpp-events.publisher';
import { CatalogRepository } from '../../catalog/repositories/catalog.repository';
import { LlamaServerLauncherManager } from '../managers/llama-server-launcher.manager';
import { ProcessSupervisorManager } from '../managers/process-supervisor.manager';
import { RuntimeConfigManager } from '../managers/runtime-config.manager';
import { LoadEventsRepository } from '../repositories/load-events.repository';
import {
  LLAMA_HEALTH_BACKOFF_AFTER_MS,
  LLAMA_HEALTH_POLL_INTERVAL_MS,
  LLAMA_UNLOAD_TIMEOUT_MS,
} from '../constants/launcher.constants';
import {
  type LoadedModelSnapshot,
  type RuntimeConfig,
  type UpdateRuntimeConfigPayload,
} from '../types/process.types';

@Injectable()
export class ModelsLifecycleService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ModelsLifecycleService.name);
  private readonly lifecycleMutex = new Mutex();

  constructor(
    private readonly catalogRepo: CatalogRepository,
    private readonly launcher: LlamaServerLauncherManager,
    private readonly supervisor: ProcessSupervisorManager,
    private readonly runtimeConfig: RuntimeConfigManager,
    private readonly loadEvents: LoadEventsRepository,
    private readonly events: LlamacppEventsPublisher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('onApplicationBootstrap: clearing stale READY/LOADING states');
    try {
      const { rows } = await this.catalogRepo.list({ limit: 200 });
      for (const row of rows) {
        if (row.loadStatus === LoadStatus.READY || row.loadStatus === LoadStatus.LOADING) {
           
          await this.catalogRepo.updateLoadStatus(row.id, LoadStatus.UNLOADED);
        }
      }
    } catch (error) {
      this.logger.error(`onApplicationBootstrap: ${(error as Error).message}`);
    }
  }

  getLoadedSnapshot(): LoadedModelSnapshot | null {
    const current = this.supervisor.getCurrent();
    if (!current) {
      return null;
    }
    return {
      id: current.modelId,
      name: '',
      tag: '',
      loadStatus: LoadStatus.READY,
      port: current.port,
      pid: current.pid,
    };
  }

  getResidentPort(): number | null {
    return this.supervisor.getCurrent()?.port ?? null;
  }

  async getLoaded(): Promise<LoadedModelSnapshot | null> {
    const current = this.supervisor.getCurrent();
    if (!current) {
      return null;
    }
    const entry = await this.catalogRepo.findById(current.modelId);
    if (!entry) {
      return null;
    }
    return {
      id: entry.id,
      name: entry.name,
      tag: entry.tag,
      loadStatus: LoadStatus.READY,
      port: current.port,
      pid: current.pid,
    };
  }

  async load(modelId: string): Promise<LoadedModelSnapshot> {
    this.logger.log(`load: modelId=${modelId}`);
    return this.lifecycleMutex.runExclusive(() => this.loadInner(modelId));
  }

  async unload(): Promise<void> {
    this.logger.log('unload: requested');
    await this.lifecycleMutex.runExclusive(() => this.unloadInner());
  }

  async updateConfig(modelId: string, payload: UpdateRuntimeConfigPayload): Promise<RuntimeConfig> {
    const entry = await this.catalogRepo.findById(modelId);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', modelId);
    }
    return this.runtimeConfig.update(modelId, payload);
  }

  async deleteWeights(modelId: string, confirmName: string): Promise<{ deleted: boolean }> {
    this.logger.warn(`deleteWeights: modelId=${modelId}`);
    const entry = await this.catalogRepo.findById(modelId);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', modelId);
    }
    if (`${entry.name}:${entry.tag}` !== confirmName) {
      throw new BusinessException(
        'confirmName does not match model name',
        'CONFIRM_NAME_MISMATCH',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const current = this.supervisor.getCurrent();
    if (current?.modelId === modelId) {
      throw new BusinessException(
        'Unload model before deleting weights',
        'MODEL_RESIDENT',
        HttpStatus.CONFLICT,
      );
    }
    const dataPath = AppConfig.get().LLAMACPP_DATA_PATH;
    const dir = resolveSafePath(dataPath, path.join('models', entry.name, entry.tag));
    if (!isWithinRoot(dataPath, dir)) {
      throw new BusinessException('Unsafe deletion path', 'UNSAFE_PATH', HttpStatus.BAD_REQUEST);
    }
    await fs.promises.rm(dir, { recursive: true, force: true });
    await this.catalogRepo.updateDownloadStatus(modelId, DownloadStatus.AVAILABLE);
    this.events.weightsDeleted({ modelId, modelName: `${entry.name}:${entry.tag}` });
    return { deleted: true };
  }

  private async loadInner(modelId: string): Promise<LoadedModelSnapshot> {
    const entry = await this.catalogRepo.findById(modelId);
    if (!entry) {
      throw new EntityNotFoundException('FrontierCatalogEntry', modelId);
    }
    if (entry.downloadStatus !== DownloadStatus.READY) {
      throw new BusinessException(
        'Model weights not ready',
        'MODEL_NOT_READY',
        HttpStatus.CONFLICT,
      );
    }

    const current = this.supervisor.getCurrent();
    if (current) {
      if (current.modelId === modelId) {
        return {
          id: entry.id,
          name: entry.name,
          tag: entry.tag,
          loadStatus: LoadStatus.READY,
          port: current.port,
          pid: current.pid,
        };
      }
      await this.unloadInner();
    }

    await this.catalogRepo.updateLoadStatus(modelId, LoadStatus.LOADING);
    await this.loadEvents.record({ modelId, eventType: LoadEventType.LOAD_REQUESTED });

    const config = await this.runtimeConfig.resolve(modelId);
    const spawned = await this.launcher.spawn(entry, config);
    const ready = await this.waitForReady(spawned.port);

    if (!ready) {
      try {
        spawned.child.kill('SIGKILL');
      } catch {
        // ignore
      }
      await this.catalogRepo.updateLoadStatus(modelId, LoadStatus.FAILED);
      await this.loadEvents.record({
        modelId,
        eventType: LoadEventType.FAILED,
        errorMessage: 'Health-check timeout',
      });
      throw new BusinessException(
        'Model load timed out',
        'MODEL_LOAD_TIMEOUT',
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    this.supervisor.attach({
      modelId,
      pid: spawned.pid,
      port: spawned.port,
      child: spawned.child,
      onCrash: (info) => this.onCrash(modelId, info),
    });
    await this.catalogRepo.updateLoadStatus(modelId, LoadStatus.READY);
    await this.loadEvents.record({
      modelId,
      eventType: LoadEventType.LOADED,
      pid: spawned.pid,
      port: spawned.port,
    });
    this.events.modelLoaded({
      modelId,
      modelName: `${entry.name}:${entry.tag}`,
      pid: spawned.pid,
      port: spawned.port,
    });
    return {
      id: entry.id,
      name: entry.name,
      tag: entry.tag,
      loadStatus: LoadStatus.READY,
      port: spawned.port,
      pid: spawned.pid,
    };
  }

  private async unloadInner(): Promise<void> {
    const current = this.supervisor.getCurrent();
    if (!current) {
      return;
    }
    this.supervisor.markGracefulUnload();
    await this.loadEvents.record({
      modelId: current.modelId,
      eventType: LoadEventType.UNLOAD_REQUESTED,
      pid: current.pid,
      port: current.port,
    });
    try {
      current.child.kill('SIGTERM');
    } catch {
      // ignore
    }
    const exited = await this.waitForExit(current.pid, LLAMA_UNLOAD_TIMEOUT_MS);
    if (!exited) {
      this.logger.warn(`unloadInner: SIGTERM timed out — sending SIGKILL`);
      try {
        current.child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    await this.catalogRepo.updateLoadStatus(current.modelId, LoadStatus.UNLOADED);
    await this.loadEvents.record({ modelId: current.modelId, eventType: LoadEventType.UNLOADED });
    const unloadedEntry = await this.catalogRepo.findById(current.modelId);
    if (unloadedEntry) {
      this.events.modelUnloaded({
        modelId: current.modelId,
        modelName: `${unloadedEntry.name}:${unloadedEntry.tag}`,
      });
    }
    this.supervisor.detach();
  }

  private async waitForReady(port: number): Promise<boolean> {
    const config = AppConfig.get();
    const start = Date.now();
    let interval = LLAMA_HEALTH_POLL_INTERVAL_MS;
    while (Date.now() - start < config.LLAMACPP_LOAD_TIMEOUT_MS) {
      try {
        const response = await request(`http://${config.LLAMACPP_BIND_HOST}:${port}/health`, {
          method: 'GET',
          headersTimeout: 2000,
        });
        if (response.statusCode === 200) {
          return true;
        }
      } catch {
        // not ready yet
      }
      const sleepMs = interval;
      await new Promise((resolve) => setTimeout(resolve, sleepMs));
      if (Date.now() - start > LLAMA_HEALTH_BACKOFF_AFTER_MS) {
        interval = Math.min(interval * 2, 5000);
      }
    }
    return false;
  }

  private async waitForExit(_pid: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const current = this.supervisor.getCurrent();
      if (current?.child.exitCode !== null) {
        return true;
      }
       
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }

  private async onCrash(
    modelId: string,
    info: { code: number | null; signal: NodeJS.Signals | null },
  ): Promise<void> {
    this.logger.error(`onCrash: modelId=${modelId} code=${info.code} signal=${info.signal}`);
    await this.catalogRepo.updateLoadStatus(modelId, LoadStatus.CRASHED);
    await this.loadEvents.record({
      modelId,
      eventType: LoadEventType.CRASHED,
      errorMessage: `code=${info.code} signal=${info.signal}`,
    });
    const entry = await this.catalogRepo.findById(modelId);
    this.events.modelCrashed({
      modelId,
      modelName: entry ? `${entry.name}:${entry.tag}` : 'unknown',
      exitCode: info.code,
      signal: info.signal,
    });
    this.supervisor.detach();
  }
}
