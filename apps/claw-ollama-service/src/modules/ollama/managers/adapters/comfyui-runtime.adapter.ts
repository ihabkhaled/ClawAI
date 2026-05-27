import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { Logger } from '@nestjs/common';
import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { ComfyUIModelType } from '../../../../common/enums';
import { AppConfig } from '../../../../app/config/app.config';
import {
  COMFYUI_DEFAULT_FAMILY,
  COMFYUI_DOWNLOAD_TIMEOUT_MS,
  COMFYUI_HEALTH_TIMEOUT_MS,
  COMFYUI_SYSTEM_STATS_PATH,
} from '../../constants/comfyui.constants';
import { getComfyUIDownloadDescriptor } from '../../constants/comfyui-downloads.constants';
import type {
  GenerateRequest,
  GenerateResponse,
  LocalModelInfo,
  PullJobInfo,
  RuntimeAdapter,
  RuntimeHealth,
} from '../../types/ollama.types';
import type {
  ComfyUIDownloadDescriptor,
  ComfyUISystemStatsResponse,
} from '../../types/comfyui.types';

// Bridges the catalog-pull pipeline to the local ComfyUI container. ComfyUI
// itself has no model-upload API, so the adapter writes weights directly to
// the shared `comfyui-models-data` Docker volume (mounted read-write into
// this container at AppConfig.COMFYUI_MODELS_PATH). ComfyUI picks them up
// next time it scans /opt/ComfyUI/models on `/object_info` refresh — no
// container restart needed.
export class ComfyUIRuntimeAdapter implements RuntimeAdapter {
  private readonly logger = new Logger(ComfyUIRuntimeAdapter.name);

  private readonly httpClient: AxiosInstance;

  private readonly modelsPath: string;

  private readonly baseUrl: string;

  constructor() {
    const config = AppConfig.get();
    this.baseUrl = config.COMFYUI_BASE_URL;
    this.modelsPath = config.COMFYUI_MODELS_PATH;
    this.httpClient = createHttpClient({
      baseURL: this.baseUrl,
      timeout: COMFYUI_HEALTH_TIMEOUT_MS,
    });
  }

  async listModels(): Promise<LocalModelInfo[]> {
    this.logger.debug(`listModels: scanning ${this.modelsPath}`);
    const subdirs = Object.values(ComfyUIModelType);
    const collected: LocalModelInfo[] = [];

    for (const subdir of subdirs) {
      const found = await this.scanModelSubdir(subdir);
      collected.push(...found);
    }

    this.logger.debug(`listModels: found ${String(collected.length)} ComfyUI weights`);
    return collected;
  }

  async pullModel(catalogKey: string): Promise<PullJobInfo> {
    this.logger.log(`pullModel: catalogKey=${catalogKey}`);

    const descriptor = this.resolveDescriptor(catalogKey);
    await this.ensureComfyUiReachable();

    const targetDir = join(this.modelsPath, descriptor.modelType);
    const targetPath = join(targetDir, descriptor.filename);
    await mkdir(targetDir, { recursive: true });

    const alreadyDownloaded = await this.fileExistsWithSize(targetPath);
    if (alreadyDownloaded !== null) {
      this.logger.log(
        `pullModel: ${descriptor.filename} already present (${String(alreadyDownloaded)} bytes) — skipping download`,
      );
      return { status: 'success', total: alreadyDownloaded, completed: alreadyDownloaded };
    }

    const writtenBytes = await this.downloadWeights(descriptor, targetPath);
    this.logger.log(
      `pullModel: wrote ${String(writtenBytes)} bytes to ${targetPath} for ${catalogKey}`,
    );
    return { status: 'success', total: writtenBytes, completed: writtenBytes };
  }

  async healthCheck(): Promise<RuntimeHealth> {
    const startedAt = Date.now();
    try {
      await this.httpClient.get<ComfyUISystemStatsResponse>(COMFYUI_SYSTEM_STATS_PATH, {
        timeout: COMFYUI_HEALTH_TIMEOUT_MS,
      });
      return {
        runtime: 'COMFYUI',
        healthy: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown ComfyUI error';
      this.logger.warn(`healthCheck: ComfyUI unreachable — ${errorMessage}`);
      return {
        runtime: 'COMFYUI',
        healthy: false,
        latencyMs: Date.now() - startedAt,
        errorMessage,
      };
    }
  }

  async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new Error('ComfyUI does not support text generation — use claw-image-service instead');
  }

  private resolveDescriptor(catalogKey: string): ComfyUIDownloadDescriptor {
    const [name, ...tagParts] = catalogKey.split(':');
    const tag = tagParts.join(':') || 'latest';
    if (name === undefined || name.length === 0) {
      throw new Error(`Invalid ComfyUI catalog key: ${catalogKey}`);
    }
    const descriptor = getComfyUIDownloadDescriptor(name, tag);
    if (descriptor === undefined) {
      throw new Error(
        `ComfyUI catalog entry ${catalogKey} has no download descriptor — add it to comfyui-downloads.constants.ts`,
      );
    }
    return descriptor;
  }

  private async ensureComfyUiReachable(): Promise<void> {
    const health = await this.healthCheck();
    if (!health.healthy) {
      throw new Error(`ComfyUI is not reachable at ${this.baseUrl}: ${health.errorMessage ?? ''}`);
    }
  }

  private async fileExistsWithSize(path: string): Promise<number | null> {
    try {
      const stats = await stat(path);
      return stats.isFile() && stats.size > 0 ? stats.size : null;
    } catch {
      return null;
    }
  }

  private async downloadWeights(
    descriptor: ComfyUIDownloadDescriptor,
    targetPath: string,
  ): Promise<number> {
    this.logger.log(`downloadWeights: fetching ${descriptor.url} → ${targetPath}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, COMFYUI_DOWNLOAD_TIMEOUT_MS);
    try {
      const response = await fetch(descriptor.url, {
        redirect: 'follow',
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(
          `HuggingFace download failed for ${descriptor.url}: HTTP ${String(response.status)} ${response.statusText}`,
        );
      }
      if (response.body === null) {
        throw new Error(`HuggingFace returned empty body for ${descriptor.url}`);
      }
      return await this.streamToFile(response.body, targetPath);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async streamToFile(
    body: ReadableStream<Uint8Array>,
    targetPath: string,
  ): Promise<number> {
    const tempPath = `${targetPath}.partial`;
    const fileStream = createWriteStream(tempPath);
    // `fetch`'s ReadableStream<Uint8Array> (lib.dom) and node:stream/web's
    // ReadableStream are structurally identical but TypeScript treats them
    // as distinct types in DOM-aware setups. The cast goes between two
    // generic ReadableStream forms — no runtime check is being elided.
    const nodeStream = Readable.fromWeb(body as NodeReadableStream<Uint8Array>);
    let totalBytes = 0;

    nodeStream.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
    });

    await new Promise<void>((resolve, reject) => {
      const onError = (cause: Error): void => {
        fileStream.destroy();
        reject(cause);
      };
      nodeStream.once('error', onError);
      fileStream.once('error', onError);
      fileStream.once('finish', resolve);
      nodeStream.pipe(fileStream);
    });

    // Atomic rename so partial files never look like installed weights.
    const { rename } = await import('node:fs/promises');
    await rename(tempPath, targetPath);
    return totalBytes;
  }

  private async scanModelSubdir(subdir: string): Promise<LocalModelInfo[]> {
    const dir = join(this.modelsPath, subdir);
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch (error: unknown) {
      this.logger.debug(`scanModelSubdir: ${dir} not present yet (${this.describeError(error)})`);
      return [];
    }

    const results: LocalModelInfo[] = [];
    for (const entry of entries) {
      if (entry.endsWith('.partial')) {
        continue;
      }
      const fullPath = join(dir, entry);
      const sizeBytes = await this.fileExistsWithSize(fullPath);
      if (sizeBytes === null) {
        continue;
      }
      results.push({
        name: entry,
        tag: subdir,
        sizeBytes: BigInt(sizeBytes),
        family: COMFYUI_DEFAULT_FAMILY,
        parameters: null,
        quantization: null,
      });
    }
    return results;
  }

  private describeError(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }

  // Visible for testing — the model registry is per-process state and unit
  // tests need to be able to clear it between cases.
  protected getModelsPath(): string {
    return this.modelsPath;
  }
}
