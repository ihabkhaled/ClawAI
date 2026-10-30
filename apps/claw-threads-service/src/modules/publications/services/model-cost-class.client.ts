import { Injectable, Logger } from '@nestjs/common';
import type { UserEntitlements } from '@claw/shared-entitlements';
import { ModelCostClass } from '@claw/shared-types';
import { assertSafeRequestUrl, declaredHost } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import {
  MODEL_COST_CLASS_CACHE_MAX_ENTRIES,
  MODEL_COST_CLASS_CACHE_TTL_MS,
  MODEL_COST_CLASS_TIMEOUT_MS,
  MODEL_COST_CLASSES_BATCH_SIZE,
  MODEL_COST_CLASSES_PATH,
} from '../constants/model-cost-class.constants';
import type { ModelRef } from '../types/generation-preflight.types';
import type { CostClassIndex } from '../types/model-cost-class.types';
import {
  costClassKey,
  needsCostClasses,
  NO_COST_CLASSES,
} from '../utilities/model-cost-class.utility';

const answerSchema = z.array(
  z.object({
    provider: z.string(),
    model: z.string(),
    costClass: z.nativeEnum(ModelCostClass).nullable(),
  }),
);

/**
 * Reads each model's cost class from routing-service, the way chat-service's plan gate does
 * (ADR-198). `isModelAllowedForUsage` refuses every model on a cost-class plan when it is given no
 * class, so the Threads plan checks need this answer.
 *
 * Fails CLOSED: a call that fails leaves its models out of the answer, and a model without an
 * answer is refused. A failed call is never cached. Only the caller's own plan decides whether to
 * ask at all (`needsCostClasses`).
 */
@Injectable()
export class ModelCostClassClient {
  private readonly logger = new Logger(ModelCostClassClient.name);
  private static readonly cache = new Map<
    string,
    { costClass: ModelCostClass | null; expiresAt: number }
  >();

  /** The classes of these models for this plan; empty when the plan does not use classes. */
  async forPlan(
    entitlements: UserEntitlements,
    refs: readonly ModelRef[],
  ): Promise<CostClassIndex> {
    if (!needsCostClasses(entitlements) || refs.length === 0) return NO_COST_CLASSES;
    const now = Date.now();
    const known = new Map<string, ModelCostClass | null>();
    const missing = new Map<string, ModelRef>();
    for (const { provider, model } of refs) {
      const key = costClassKey(provider, model);
      const hit = ModelCostClassClient.cache.get(key);
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
    ModelCostClassClient.cache.clear();
  }

  private async fetchBatch(
    batch: readonly ModelRef[],
    wanted: ReadonlyMap<string, ModelRef>,
    known: Map<string, ModelCostClass | null>,
  ): Promise<void> {
    const config = AppConfig.get();
    const url = `${config.ROUTING_SERVICE_URL}${MODEL_COST_CLASSES_PATH}`;
    try {
      assertSafeRequestUrl(url, declaredHost(config.ROUTING_SERVICE_URL));
      const response = await fetch(url, {
        method: 'POST',
        redirect: 'error',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Service ${config.INTER_SERVICE_AUTH_TOKEN}`,
        },
        body: JSON.stringify({ models: batch }),
        signal: AbortSignal.timeout(MODEL_COST_CLASS_TIMEOUT_MS),
      });
      const parsed = response.ok
        ? answerSchema.safeParse(await response.json().catch(() => null))
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
    if (ModelCostClassClient.cache.size >= MODEL_COST_CLASS_CACHE_MAX_ENTRIES) {
      ModelCostClassClient.cache.clear();
    }
    ModelCostClassClient.cache.set(key, { costClass, expiresAt });
  }
}
