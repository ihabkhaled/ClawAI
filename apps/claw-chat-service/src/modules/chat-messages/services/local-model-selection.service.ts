import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import type {
  InstalledModelInfo,
  InstalledModelsResponse,
} from '../types/local-model-selection.types';

@Injectable()
export class LocalModelSelectionService {
  private readonly logger = new Logger(LocalModelSelectionService.name);

  async resolveDefaultModel(preferredRole?: string): Promise<string> {
    const models = await this.fetchInstalledModels();
    const usable = models.filter((model) => !model.roles.includes('ROUTER'));
    if (usable.length === 0) {
      this.logger.warn('resolveDefaultModel: no usable local models installed');
      return 'AUTO';
    }

    const preferred = preferredRole
      ? usable.filter((model) => model.roles.includes(preferredRole))
      : usable.filter((model) => model.roles.includes('LOCAL_FALLBACK_CHAT'));
    const pool = preferred.length > 0 ? preferred : usable;
    const selected = this.pickBest(pool);

    if (!selected) {
      this.logger.warn('resolveDefaultModel: failed to select a local model');
      return 'AUTO';
    }

    const modelName = `${selected.name}:${selected.tag}`;
    this.logger.debug(`resolveDefaultModel: selected ${modelName}`);
    return modelName;
  }

  async resolveModelList(count: number): Promise<string[]> {
    const models = await this.fetchInstalledModels();
    const usable = models.filter((model) => !model.roles.includes('ROUTER'));
    const ordered = [...usable].sort((a, b) => this.modelScore(a) - this.modelScore(b));
    const unique: string[] = [];

    for (const model of ordered) {
      const modelName = `${model.name}:${model.tag}`;
      if (!unique.includes(modelName)) {
        unique.push(modelName);
      }
      if (unique.length >= count) {
        break;
      }
    }

    if (unique.length === 0) {
      return Array.from({ length: count }, () => 'AUTO');
    }

    while (unique.length < count) {
      unique.push(unique.at(-1) ?? 'AUTO');
    }

    return unique;
  }

  private async fetchInstalledModels(): Promise<InstalledModelInfo[]> {
    try {
      const config = AppConfig.get();
      const response = await httpRequest<InstalledModelsResponse>({
        url: `${config.OLLAMA_SERVICE_URL}/api/v1/internal/ollama/installed-models`,
        method: 'GET',
        timeoutMs: 5_000,
      });

      if (!response.ok) {
        return [];
      }

      return response.data.models ?? [];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`fetchInstalledModels: ${msg}`);
      return [];
    }
  }

  private pickBest(models: InstalledModelInfo[]): InstalledModelInfo | null {
    if (models.length === 0) {
      return null;
    }
    return [...models].sort((a, b) => this.modelScore(a) - this.modelScore(b))[0] ?? null;
  }

  private modelScore(model: InstalledModelInfo): number {
    if (model.sizeBytes !== null && Number.isFinite(model.sizeBytes)) {
      return model.sizeBytes;
    }

    const raw = model.parameterCount ?? '';
    const normalized = raw.toLowerCase().replaceAll(/[^0-9.]/g, '');
    const parsed = Number.parseFloat(normalized);
    if (!Number.isFinite(parsed)) {
      return Number.MAX_SAFE_INTEGER;
    }
    return parsed;
  }
}
