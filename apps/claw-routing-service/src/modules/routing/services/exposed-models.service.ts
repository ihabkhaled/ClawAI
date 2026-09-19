import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import { httpRequest } from '../../../common/utilities';
import {
  CONNECTOR_MODELS_SNAPSHOT_URL_PATH,
  EXPOSED_MODELS_TIMEOUT_MS,
  EXPOSED_MODELS_TTL_MS,
  MODEL_EXPOSURE_EXPOSED,
  MODEL_KIND_CHAT,
} from '../constants/cloud-router-eligibility.constants';
import type {
  CachedExposedModels,
  ExposedModelSnapshotEntry,
} from '../types/model-deployment.types';
import { modelMatchKey } from '../utilities/cloud-router-candidates.utility';

/**
 * The chat models an admin exposed to users, read from connector-service.
 *
 * Cached for a minute: exposing or hiding a model on the admin page reaches
 * the AUTO router within that time, with no restart. Null when connector-service
 * cannot be read and nothing is cached, so the caller falls back rather than
 * routing on nothing.
 */
@Injectable()
export class ExposedModelsService {
  private readonly logger = new Logger(ExposedModelsService.name);
  private cached: CachedExposedModels | null = null;

  async exposedChatModels(now: () => number = Date.now): Promise<ReadonlySet<string> | null> {
    if (this.cached !== null && this.cached.expiresAt > now()) {
      return this.cached.keys;
    }
    try {
      const response = await httpRequest<{ models?: ExposedModelSnapshotEntry[] }>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${CONNECTOR_MODELS_SNAPSHOT_URL_PATH}`,
        method: 'GET',
        timeoutMs: EXPOSED_MODELS_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `exposedChatModels: connector-service returned ${String(response.status)}`,
        );
        return this.cached?.keys ?? null;
      }
      const keys = new Set(
        (response.data.models ?? [])
          .filter(
            (model) =>
              model.exposure === MODEL_EXPOSURE_EXPOSED &&
              (model.kind ?? MODEL_KIND_CHAT) === MODEL_KIND_CHAT,
          )
          .map((model) => modelMatchKey(model.provider, model.modelKey)),
      );
      this.cached = { keys, expiresAt: now() + EXPOSED_MODELS_TTL_MS };
      this.logger.debug(`exposedChatModels: ${String(keys.size)} exposed chat model(s)`);
      return keys;
    } catch (error: unknown) {
      this.logger.warn(`exposedChatModels: failed - ${(error as Error).message}`);
      return this.cached?.keys ?? null;
    }
  }
}
