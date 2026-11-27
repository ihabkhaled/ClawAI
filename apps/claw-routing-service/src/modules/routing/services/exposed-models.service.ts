import { Injectable, Logger } from '@nestjs/common';
import { AppConfig } from '../../../app/config/app.config';
import type { HttpResponse } from '../../../common/types';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  CONNECTOR_MODELS_SNAPSHOT_URL_PATH,
  EXPOSED_MODELS_TIMEOUT_MS,
  EXPOSED_MODELS_TTL_MS,
} from '../constants/cloud-router-eligibility.constants';
import type {
  CachedExposedModels,
  ExposedModelSnapshotEntry,
} from '../types/model-deployment.types';
import { exposedChatKeys } from '../utilities/exposed-model-keys.utility';

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
      const response = await this.fetchSnapshot();
      if (!response.ok) {
        this.logger.warn(
          `exposedChatModels: connector-service returned ${String(response.status)}`,
        );
        return this.lastKeys();
      }
      const keys = exposedChatKeys(response.data.models ?? []);
      this.cached = { keys, expiresAt: now() + EXPOSED_MODELS_TTL_MS };
      this.logger.debug(`exposedChatModels: ${String(keys.size)} exposed chat model(s)`);
      return keys;
    } catch (error: unknown) {
      this.logger.warn(`exposedChatModels: failed - ${(error as Error).message}`);
      return this.lastKeys();
    }
  }

  /** The last good answer, kept while connector-service cannot be read. */
  private lastKeys(): ReadonlySet<string> | null {
    return this.cached?.keys ?? null;
  }

  /** The connector models snapshot; the internal route requires the service token (rules/68, 2026-11-27). */
  private fetchSnapshot(): Promise<HttpResponse<{ models?: ExposedModelSnapshotEntry[] }>> {
    return httpRequest<{ models?: ExposedModelSnapshotEntry[] }>({
      url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${CONNECTOR_MODELS_SNAPSHOT_URL_PATH}`,
      method: 'GET',
      headers: { Authorization: buildInterServiceAuthHeader() },
      timeoutMs: EXPOSED_MODELS_TIMEOUT_MS,
    });
  }
}
