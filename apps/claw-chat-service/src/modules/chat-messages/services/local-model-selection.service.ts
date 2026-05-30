import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities/http-client.utility';
import { isLocalVisionModel } from '../constants/local-vision-heuristics.constants';
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
    const selected = this.pickBest(pool, preferredRole);

    if (!selected) {
      this.logger.warn('resolveDefaultModel: failed to select a local model');
      return 'AUTO';
    }

    const modelName = `${selected.name}:${selected.tag}`;
    this.logger.debug(`resolveDefaultModel: selected ${modelName}`);
    return modelName;
  }

  async resolveModelList(count: number, preferredRole?: string): Promise<string[]> {
    const usable = await this.listUsableModels();
    const ordered = [...usable].sort(
      (a, b) =>
        this.selectionScore(b, preferredRole ?? 'LOCAL_FALLBACK_CHAT') -
        this.selectionScore(a, preferredRole ?? 'LOCAL_FALLBACK_CHAT'),
    );
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

  async listInstalledModelNames(): Promise<string[]> {
    const models = await this.listUsableModels();
    return models.map((model) => `${model.name}:${model.tag}`);
  }

  async isInstalledModel(modelName: string): Promise<boolean> {
    const installedModels = await this.listInstalledModelNames();
    return installedModels.includes(modelName);
  }

  // Returns true when at least one installed local model matches the vision
  // heuristic (LLaVA, BakLLaVA, Moondream, MiniCPM-V, CogVLM, Llama-3.2-Vision,
  // or anything containing `vision` / `multimodal` in its name).
  //
  // Slice B note: the source of truth for `supportsVision` should be the
  // connector-service ConnectorModel catalog; for now we apply a name-based
  // heuristic identical to the one used by the connector adapter so a
  // freshly-installed `llava:7b` is detected without a follow-up sync.
  async hasLocalVisionModel(): Promise<boolean> {
    this.logger.debug('hasLocalVisionModel: probing installed models');
    try {
      const models = await this.fetchInstalledModels();
      const matched = models.find((model) => {
        const identity = `${model.name}:${model.tag}`;
        return isLocalVisionModel(identity) || isLocalVisionModel(model.name);
      });
      const result = matched !== undefined;
      this.logger.debug(
        `hasLocalVisionModel: result=${String(result)} (probed ${String(models.length)} models)`,
      );
      return result;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`hasLocalVisionModel: failed — ${msg}`);
      return false;
    }
  }

  private async listUsableModels(): Promise<InstalledModelInfo[]> {
    const models = await this.fetchInstalledModels();
    return models.filter((model) => !model.roles.includes('ROUTER'));
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

  private pickBest(
    models: InstalledModelInfo[],
    preferredRole?: string,
  ): InstalledModelInfo | null {
    if (models.length === 0) {
      return null;
    }
    return (
      [...models].sort(
        (a, b) => this.selectionScore(b, preferredRole) - this.selectionScore(a, preferredRole),
      )[0] ?? null
    );
  }

  private selectionScore(model: InstalledModelInfo, preferredRole?: string): number {
    let score = this.modelScore(model);
    const identity = `${model.name}:${model.tag}`.toLowerCase();

    if (preferredRole && model.roles.includes(preferredRole)) {
      score *= 1.2;
    }

    if (!preferredRole || preferredRole === 'LOCAL_FALLBACK_CHAT') {
      if (identity.includes('coder')) {
        score *= 0.7;
      }
      if (/(llama|gemma|glm|mistral|mixtral)/.test(identity)) {
        score *= 1.08;
      }
    }

    return score;
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
