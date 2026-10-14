import { Injectable, Logger } from '@nestjs/common';

import { MODEL_HEALTH_CACHE_TTL_MS } from '../constants/recommended-team.constants';
import type { ModelHealthIndex } from '../types/recommended-team.types';
import { modelHealthKey } from '../utilities/model-health.utility';
import { ThreadsGenerationClient } from './threads-generation.client';

/**
 * The last hour's model outcomes (the generation service's step log), cached for a minute and
 * shared by every owner. Health only ever demotes and orders: when the generation service cannot
 * be read the answer is an empty index (no demotion), never an error.
 */
@Injectable()
export class ModelHealthService {
  private readonly logger = new Logger(ModelHealthService.name);
  private cached: { index: ModelHealthIndex; expiresAt: number } | undefined;
  private inFlight: Promise<ModelHealthIndex> | undefined;

  constructor(private readonly generation: ThreadsGenerationClient) {}

  current(): Promise<ModelHealthIndex> {
    if (this.cached && this.cached.expiresAt > Date.now())
      return Promise.resolve(this.cached.index);
    this.inFlight ??= this.load().finally(() => {
      this.inFlight = undefined;
    });
    return this.inFlight;
  }

  private async load(): Promise<ModelHealthIndex> {
    try {
      const entries = await this.generation.getModelHealth();
      const index = new Map(
        entries.map(({ provider, model, ok, failed }) => [
          modelHealthKey({ provider, model }),
          { ok, failed },
        ]),
      );
      this.cached = { index, expiresAt: Date.now() + MODEL_HEALTH_CACHE_TTL_MS };
      return index;
    } catch {
      this.logger.warn('Model health could not be read; recommendations ignore recent health');
      const empty: ModelHealthIndex = new Map();
      // Cache the miss briefly so a down generation service is not asked on every request.
      this.cached = { index: empty, expiresAt: Date.now() + MODEL_HEALTH_CACHE_TTL_MS / 4 };
      return empty;
    }
  }
}
