import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  MODEL_CAPABILITY_CACHE_TTL_MS,
  MODEL_CAPABILITY_FAILURE_TTL_MS,
  MODEL_CAPABILITY_TIMEOUT_MS,
  MODELS_SNAPSHOT_PATH,
  modelsSnapshotResponseSchema,
} from '../constants/model-capability.constants';
import type {
  MediaCapableModel,
  ModelMediaCapabilities,
  ModelsSnapshotIndex,
} from '../types/model-capability.types';
import {
  indexModelsSnapshot,
  listVideoCapableModels,
  resolveModelMediaCapabilities,
} from '../utilities/model-capability.utility';

/**
 * Per-model media capability, read from connector-service's catalog snapshot —
 * the one source of truth for "can THIS model see an image / hear audio /
 * watch video" (ADR-120).
 *
 * NEVER throws into a chat turn. A failed or malformed fetch yields a null
 * index, which resolves every cloud model to UNKNOWN; the delivery resolver
 * then falls back to the provider-level behaviour that shipped before this
 * client existed. A capability outage degrades accuracy, never the answer.
 */
@Injectable()
export class ModelCapabilityClient {
  private readonly logger = new Logger(ModelCapabilityClient.name);
  // Static so every holder shares one answer, matching ModelContextWindowClient:
  // capability is a property of the deployment, not of the caller.
  private static cached: { index: ModelsSnapshotIndex | null; expiresAt: number } | null = null;

  /** Drops the memoised snapshot. Called by tests and after a connector sync. */
  static invalidate(): void {
    ModelCapabilityClient.cached = null;
  }

  async resolve(provider: string, model: string): Promise<ModelMediaCapabilities> {
    return resolveModelMediaCapabilities(await this.loadIndex(), provider, model);
  }

  /**
   * Exposed chat models that accept native video, or null when the snapshot is
   * unavailable — the caller then falls back to its documented static set.
   */
  async listVideoCapableModels(): Promise<MediaCapableModel[] | null> {
    const index = await this.loadIndex();
    return index === null ? null : listVideoCapableModels(index);
  }

  private async loadIndex(): Promise<ModelsSnapshotIndex | null> {
    const now = Date.now();
    const hit = ModelCapabilityClient.cached;
    if (hit !== null && hit.expiresAt > now) {
      return hit.index;
    }
    const index = await this.fetchIndex();
    ModelCapabilityClient.cached = {
      index,
      expiresAt:
        now + (index === null ? MODEL_CAPABILITY_FAILURE_TTL_MS : MODEL_CAPABILITY_CACHE_TTL_MS),
    };
    return index;
  }

  private async fetchIndex(): Promise<ModelsSnapshotIndex | null> {
    try {
      // Inside the try: AppConfig.get() throws on a misconfigured environment,
      // and a client documented never to throw must not be what takes a turn down.
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${MODELS_SNAPSHOT_PATH}`,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: MODEL_CAPABILITY_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(
          `fetchIndex: connector status=${String(response.status)} — capability UNKNOWN, provider-level fallback applies`,
        );
        return null;
      }
      const parsed = modelsSnapshotResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.warn('fetchIndex: snapshot failed schema check — capability UNKNOWN');
        return null;
      }
      this.logger.debug(`fetchIndex: indexed ${String(parsed.data.models.length)} models`);
      return indexModelsSnapshot(parsed.data.models);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`fetchIndex: models-snapshot unavailable — ${message}`);
      return null;
    }
  }
}
