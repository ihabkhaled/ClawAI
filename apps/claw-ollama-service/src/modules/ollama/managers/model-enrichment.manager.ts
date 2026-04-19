import { Injectable, Logger } from '@nestjs/common';
import { type AxiosInstance, createHttpClient } from '@common/utilities';
import { DownloadStatus, RuntimeType } from '../../../generated/prisma';
import { OLLAMA_REGISTRY_BASE_URL } from '../constants/catalog.constants';
import {
  DISCOVERY_DEFAULT_TIMEOUT_MS,
  ENRICHMENT_CONCURRENCY,
} from '../constants/discovery.constants';
import type { DiscoveredModel } from '../types/discovery.types';
import type { OllamaRegistryManifest } from '../types/ollama-registry.types';

@Injectable()
export class ModelEnrichmentManager {
  private readonly logger = new Logger(ModelEnrichmentManager.name);

  private readonly registryClient: AxiosInstance;

  constructor() {
    this.registryClient = createHttpClient({
      baseURL: OLLAMA_REGISTRY_BASE_URL,
      timeout: DISCOVERY_DEFAULT_TIMEOUT_MS,
    });
  }

  async enrich(model: DiscoveredModel): Promise<DiscoveredModel> {
    if (model.runtime !== RuntimeType.OLLAMA) {
      return { ...model, downloadStatus: DownloadStatus.UNAVAILABLE };
    }

    try {
      const response = await this.registryClient.get<OllamaRegistryManifest>(
        `/v2/library/${encodeURIComponent(model.name)}/manifests/${encodeURIComponent(model.tag)}`,
      );
      const layers = response.data?.layers ?? [];
      const sizeBytes = this.sumLayerSizes(layers);
      const downloadStatus = this.resolveDownloadStatus(layers.length, sizeBytes);

      return {
        ...model,
        sizeBytes: sizeBytes ?? model.sizeBytes,
        downloadStatus,
      };
    } catch (error: unknown) {
      this.logger.debug(`enrichment failed for ${model.ollamaName}: ${this.errorMsg(error)}`);
      return { ...model, downloadStatus: DownloadStatus.UNAVAILABLE };
    }
  }

  async enrichAll(models: DiscoveredModel[]): Promise<DiscoveredModel[]> {
    const enriched: DiscoveredModel[] = [];
    for (let i = 0; i < models.length; i += ENRICHMENT_CONCURRENCY) {
      const chunk = models.slice(i, i + ENRICHMENT_CONCURRENCY);
      const results = await Promise.all(chunk.map((m) => this.enrich(m)));
      enriched.push(...results);
    }
    return enriched;
  }

  private resolveDownloadStatus(layerCount: number, sizeBytes: bigint | null): DownloadStatus {
    if (layerCount === 0) {
      return DownloadStatus.CLOUD_ONLY;
    }
    if (sizeBytes === null) {
      return DownloadStatus.UNKNOWN;
    }
    return DownloadStatus.AVAILABLE;
  }

  private sumLayerSizes(layers: Array<{ size: number }>): bigint | null {
    if (layers.length === 0) return null;
    let total = 0n;
    for (const layer of layers) {
      if (typeof layer.size === 'number' && layer.size > 0) {
        total += BigInt(layer.size);
      }
    }
    return total > 0n ? total : null;
  }

  private errorMsg(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
