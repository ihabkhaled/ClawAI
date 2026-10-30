import { Injectable, Logger } from '@nestjs/common';
import type { ModelCostClass } from '@claw/shared-types';

import { AppConfig } from '../../../app/config/app.config';
import { buildAuthHeader } from '../../../common/utilities/file-service-client.utility';
import { guardedFetch } from '../../../common/utilities/guarded-fetch.utility';
import {
  MODEL_COST_CLASS_CACHE_MAX_ENTRIES,
  MODEL_COST_CLASS_CACHE_TTL_MS,
  MODEL_COST_CLASS_TIMEOUT_MS,
  MODEL_COST_CLASSES_BATCH_SIZE,
  MODEL_COST_CLASSES_PATH,
} from '../constants/model-catalog.constants';
import { modelCostClassesResponseSchema } from '../dto/model-cost-classes-response.dto';
import type { CostClassIndex, CostClassModelRef } from '../types/model-cost-class.types';
import { costClassKey } from '../utilities/model-cost-class-key.utility';

/**
 * Reads each model's cost class from routing-service, the way chat-service's plan gate does
 * (ADR-198). `isModelAllowedForUsage` refuses every model on a cost-class plan when it is given no
 * class, so AUTO model choice needs this answer.
 *
 * Fails CLOSED: a call that fails leaves its models out of the answer, and a model without an
 * answer is refused. A failed call is never cached.
 */
@Injectable()
export class ModelCostClassResolverManager {
  private readonly logger = new Logger(ModelCostClassResolverManager.name);
  private static readonly cache = new Map<
    string,
    { costClass: ModelCostClass | null; expiresAt: number }
  >();

  async resolve(refs: readonly CostClassModelRef[]): Promise<CostClassIndex> {
    const now = Date.now();
    const known = new Map<string, ModelCostClass | null>();
    const missing = new Map<string, CostClassModelRef>();
    for (const { provider, model } of refs) {
      const key = costClassKey(provider, model);
      const hit = ModelCostClassResolverManager.cache.get(key);
      if (hit && hit.expiresAt > now) known.set(key, hit.costClass);
      else missing.set(key, { provider, model });
    }
    const pending = [...missing.values()];
    for (let start = 0; start < pending.length; start += MODEL_COST_CLASSES_BATCH_SIZE) {
      await this.fetchBatch(
        pending.slice(start, start + MODEL_COST_CLASSES_BATCH_SIZE),
        missing,
        known,
      );
    }
    return known;
  }

  static invalidateAll(): void {
    ModelCostClassResolverManager.cache.clear();
  }

  private async fetchBatch(
    batch: readonly CostClassModelRef[],
    wanted: ReadonlyMap<string, CostClassModelRef>,
    known: Map<string, ModelCostClass | null>,
  ): Promise<void> {
    const base = AppConfig.get().ROUTING_SERVICE_URL;
    try {
      const response = await guardedFetch(base, `${base}${MODEL_COST_CLASSES_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: buildAuthHeader() },
        body: JSON.stringify({ models: batch }),
        signal: AbortSignal.timeout(MODEL_COST_CLASS_TIMEOUT_MS),
      });
      const parsed = response.ok
        ? modelCostClassesResponseSchema.safeParse(await response.json().catch(() => null))
        : null;
      if (!parsed?.success) {
        this.logger.warn(`cost classes: routing answered badly for ${String(batch.length)} models`);
        return;
      }
      const expiresAt = Date.now() + MODEL_COST_CLASS_CACHE_TTL_MS;
      for (const { provider, model, costClass } of parsed.data) {
        const key = costClassKey(provider, model);
        // Only what was asked for: an extra row in the answer is ignored.
        if (!wanted.has(key)) continue;
        known.set(key, costClass);
        this.remember(key, costClass, expiresAt);
      }
    } catch {
      this.logger.warn(`cost classes: routing unreachable for ${String(batch.length)} models`);
    }
  }

  private remember(key: string, costClass: ModelCostClass | null, expiresAt: number): void {
    if (ModelCostClassResolverManager.cache.size >= MODEL_COST_CLASS_CACHE_MAX_ENTRIES) {
      ModelCostClassResolverManager.cache.clear();
    }
    ModelCostClassResolverManager.cache.set(key, { costClass, expiresAt });
  }
}
