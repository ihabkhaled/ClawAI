import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod, ModelCostClass } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import { costClassKey } from '../utilities/model-cost-class-key.utility';
import {
  MODEL_COST_CLASSES_BATCH_SIZE,
  MODEL_COST_CLASSES_PATH,
  MODEL_EXPOSURE_CACHE_TTL_MS,
  MODEL_EXPOSURE_TIMEOUT_MS,
  MODEL_EXPOSURE_VALIDATION_PATH,
} from '../constants/model-exposure.constants';

const validateExposedResponseSchema = z.object({
  valid: z.array(z.object({ provider: z.string(), model: z.string() })),
});
const resolvedCostClassesSchema = z.array(
  z.object({
    provider: z.string(),
    model: z.string(),
    costClass: z.nativeEnum(ModelCostClass).nullable(),
  }),
);
const modelCostClassSchema = z.object({
  costClass: z.nativeEnum(ModelCostClass),
  isPriced: z.boolean(),
});

@Injectable()
export class ModelExposureClient {
  private readonly logger = new Logger(ModelExposureClient.name);
  // Shared across every instance in this process on purpose. Two collaborators
  // hold their own client — the access gate and the execution chokepoint — and
  // an administrator unexposing a model has to reach both. A per-instance cache
  // would clear one and leave the other serving a stale yes.
  private static readonly cache = new Map<string, { exposed: boolean; expiresAt: number }>();
  private static readonly costClassCache = new Map<
    string,
    { costClass: ModelCostClass | null; expiresAt: number }
  >();

  async getCostClass(provider: string, model: string): Promise<ModelCostClass | null> {
    const key = costClassKey(provider, model);
    const now = Date.now();
    const hit = ModelExposureClient.costClassCache.get(key);
    if (hit && hit.expiresAt > now) return hit.costClass;
    try {
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().ROUTING_SERVICE_URL}/api/v1/internal/router-models/costs/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: MODEL_EXPOSURE_TIMEOUT_MS,
      });
      const parsed = response.ok ? modelCostClassSchema.safeParse(response.data) : null;
      const costClass = parsed?.success && parsed.data.isPriced ? parsed.data.costClass : null;
      ModelExposureClient.costClassCache.set(key, {
        costClass,
        expiresAt: now + MODEL_EXPOSURE_CACHE_TTL_MS,
      });
      return costClass;
    } catch {
      return null;
    }
  }

  // Many classes in one round trip, for the model picker. Answers the same question as
  // getCostClass (null = no price, so no class plan allows it) and READS the gate's cache.
  //
  // It never writes to it. The pairs come from the caller, so letting this fill the gate's cache
  // would let any user plant entries, and grow it without bound with made-up names. A routing
  // outage leaves the model out of the result rather than guessing a class.
  async getCostClasses(
    pairs: ReadonlyArray<{ provider: string; model: string }>,
  ): Promise<Map<string, ModelCostClass | null>> {
    const now = Date.now();
    const known = new Map<string, ModelCostClass | null>();
    const missing: Array<{ provider: string; model: string }> = [];
    for (const pair of pairs) {
      const hit = ModelExposureClient.costClassCache.get(costClassKey(pair.provider, pair.model));
      if (hit && hit.expiresAt > now) {
        known.set(costClassKey(pair.provider, pair.model), hit.costClass);
      } else {
        missing.push(pair);
      }
    }
    const wanted = new Set(missing.map((pair) => costClassKey(pair.provider, pair.model)));
    for (let start = 0; start < missing.length; start += MODEL_COST_CLASSES_BATCH_SIZE) {
      const batch = missing.slice(start, start + MODEL_COST_CLASSES_BATCH_SIZE);
      try {
        const response = await httpRequest<unknown>({
          url: `${AppConfig.get().ROUTING_SERVICE_URL}${MODEL_COST_CLASSES_PATH}`,
          method: HttpMethod.POST,
          headers: { Authorization: buildInterServiceAuthHeader() },
          body: { models: batch },
          timeoutMs: MODEL_EXPOSURE_TIMEOUT_MS,
        });
        const parsed = response.ok ? resolvedCostClassesSchema.safeParse(response.data) : null;
        if (!parsed?.success) {
          this.logger.warn(
            `getCostClasses: routing answered badly for ${String(batch.length)} models`,
          );
          continue;
        }
        for (const entry of parsed.data) {
          const key = costClassKey(entry.provider, entry.model);
          // Only what was asked for: an extra row in the answer is ignored.
          if (wanted.has(key)) {
            known.set(key, entry.costClass);
          }
        }
      } catch {
        this.logger.warn(`getCostClasses: routing unreachable for ${String(batch.length)} models`);
      }
    }
    return known;
  }

  // Drops every cached answer. Called when connector-service reports an
  // exposure change, so the decision takes effect immediately rather than at
  // the end of a TTL the administrator cannot see.
  static invalidateAll(): void {
    ModelExposureClient.cache.clear();
    ModelExposureClient.costClassCache.clear();
  }

  // Whether this exact deployment is currently offerable to users.
  //
  // The plan check answers "is this model on the user's plan"; it cannot
  // answer "is this model something ClawAI still offers at all", because plan
  // rows are just strings and an administrator can unexpose a model long
  // after a plan was configured. A crafted request naming an unexposed model
  // reaches execution otherwise.
  //
  // Fails CLOSED. If connector-service cannot answer, the model is treated as
  // not exposed: refusing one message is recoverable, executing an unexposed
  // model is not.
  async isExposed(provider: string, model: string): Promise<boolean> {
    const key = `${provider}/${model}`;
    const hit = ModelExposureClient.cache.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now) {
      return hit.exposed;
    }
    try {
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${MODEL_EXPOSURE_VALIDATION_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { pairs: [{ provider, model }] },
        timeoutMs: MODEL_EXPOSURE_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(`isExposed: connector status=${String(response.status)} ${key}`);
        return false;
      }
      const parsed = validateExposedResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.error(`isExposed: response failed schema check ${key}`);
        return false;
      }
      const exposed = parsed.data.valid.some(
        (pair) => pair.provider === provider && pair.model === model,
      );
      ModelExposureClient.cache.set(key, { exposed, expiresAt: now + MODEL_EXPOSURE_CACHE_TTL_MS });
      return exposed;
    } catch {
      this.logger.error(`isExposed: connector unreachable ${key}`);
      return false;
    }
  }
}
