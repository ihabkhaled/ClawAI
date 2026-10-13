import { assertSafeRequestUrl, declaredHost, knownContextWindow } from '@claw/shared-utilities';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfig } from '../../app/config/app.config';
import { DeterministicGenerationError } from '../generation/utilities/deterministic-generation.error';
import {
  HTTP_SERVER_ERROR_MIN,
  MODEL_CATALOG_REJECTED_MESSAGE,
  MODEL_CATALOG_TIMEOUT_MS,
  MODEL_CATALOG_TRANSIENT_STATUSES,
  MODEL_CATALOG_UNREACHABLE_MESSAGE,
  MODEL_WINDOW_CACHE_MAX_ENTRIES,
  MODEL_WINDOW_CACHE_TTL_MS,
  THREADS_ASSUMED_WINDOW_TOKENS,
} from './constants/model-context.constants';
import { contextWindowSchema } from './schemas/model-context.schema';
import type { ModelWindow, ModelWindowCacheEntry } from './types/model-context.types';

@Injectable()
export class ModelContextClient {
  private readonly cache = new Map<string, ModelWindowCacheEntry>();

  /**
   * The context window for a model. An unknown window is not an error: a conservative
   * default is assumed and the caller still refuses a prompt that does not fit it, so
   * nothing is ever truncated. Only an unreachable or rejecting catalog throws.
   */
  async getWindow(provider: string, model: string): Promise<ModelWindow> {
    const key = `${provider.toUpperCase()}/${model}`;
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.window;
    const window = await this.lookup(provider, model);
    this.remember(key, window);
    return window;
  }

  private async lookup(provider: string, model: string): Promise<ModelWindow> {
    const config = AppConfig.get();
    const url = `${config.ROUTING_SERVICE_URL}/api/v1/internal/router-models/context-window/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
    assertSafeRequestUrl(url, declaredHost(config.ROUTING_SERVICE_URL));
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'error',
        headers: { Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}` },
        signal: AbortSignal.timeout(MODEL_CATALOG_TIMEOUT_MS),
      });
    } catch {
      throw new ServiceUnavailableException(MODEL_CATALOG_UNREACHABLE_MESSAGE);
    }
    if (
      response.status >= HTTP_SERVER_ERROR_MIN ||
      MODEL_CATALOG_TRANSIENT_STATUSES.includes(response.status)
    ) {
      throw new ServiceUnavailableException(MODEL_CATALOG_UNREACHABLE_MESSAGE);
    }
    if (!response.ok) {
      // 401/403/404 and friends do not heal on retry: a wrong token or route is a config fault.
      throw new DeterministicGenerationError(
        `${MODEL_CATALOG_REJECTED_MESSAGE} (${String(response.status)})`,
      );
    }
    const parsed = contextWindowSchema.safeParse(await response.json().catch(() => null));
    const tokens = parsed.success ? parsed.data.contextWindowTokens : null;
    if (tokens !== null) return { tokens, source: 'known' };
    const tabled = knownContextWindow(provider, model);
    return tabled === undefined
      ? { tokens: THREADS_ASSUMED_WINDOW_TOKENS, source: 'assumed' }
      : { tokens: tabled, source: 'known' };
  }

  private remember(key: string, window: ModelWindow): void {
    this.cache.delete(key);
    this.cache.set(key, { window, expiresAt: Date.now() + MODEL_WINDOW_CACHE_TTL_MS });
    while (this.cache.size > MODEL_WINDOW_CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next();
      if (oldest.done) break;
      this.cache.delete(oldest.value);
    }
  }
}
