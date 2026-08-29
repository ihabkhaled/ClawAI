import { Injectable, Logger } from '@nestjs/common';
import { PAYG_RATE_CACHE_PREFIX, PAYG_RATE_CACHE_TTL_SECONDS } from '@claw/shared-constants';
import { HttpMethod, type ModelCostRates } from '@claw/shared-types';
import { httpRequest } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { MODEL_COST_PATH_PREFIX, MODEL_COST_TIMEOUT_MS } from '../constants/credit.constants';
import {
  type ModelCostResponse,
  modelCostResponseSchema,
} from '../schemas/model-cost-response.schema';
import { type PaygRateSnapshot } from '../types/credit.types';

/**
 * What one model costs, learned from routing-service over cached internal HTTP
 * (ADR-079).
 *
 * auth-service must not own model prices — routing-service does, and a second
 * copy would drift — but it cannot meter PAYG credit without them either. So it
 * reads them, caches them for PAYG_RATE_CACHE_TTL_SECONDS, and has the cache
 * busted by the `routing.model_cost.published` consumer so a repriced model
 * takes effect at once instead of up to five minutes later.
 *
 * FAILS CLOSED. `null` means "we do not know what this costs", and the caller
 * refuses the request with PAYG_PRICING_UNAVAILABLE. The alternative —
 * proceeding unpriced — turns a routing-service outage into unbounded provider
 * spend, which is the single most expensive way this feature could fail.
 */
@Injectable()
export class ModelRateClient {
  private readonly logger = new Logger(ModelRateClient.name);

  constructor(private readonly redis: RedisService) {}

  async findRate(provider: string, model: string): Promise<PaygRateSnapshot | null> {
    this.logger.debug(`findRate: provider=${provider} model=${model}`);
    const cached = await this.readCache(provider, model);
    if (cached !== null) {
      return cached;
    }
    const fetched = await this.fetchRate(provider, model);
    if (fetched === null) {
      return null;
    }
    await this.writeCache(provider, model, fetched);
    return ModelRateClient.toSnapshot(fetched);
  }

  /** Drops one model's cached rate. Called by the price-published consumer. */
  async invalidate(provider: string, model: string): Promise<void> {
    this.logger.log(`invalidate: dropping cached rate provider=${provider} model=${model}`);
    await this.redis.del(ModelRateClient.cacheKey(provider, model));
  }

  private async fetchRate(provider: string, model: string): Promise<ModelCostResponse | null> {
    const url = `${AppConfig.get().ROUTING_SERVICE_URL}${MODEL_COST_PATH_PREFIX}/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
    try {
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: MODEL_COST_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.error(`fetchRate: routing status=${String(response.status)} — failing closed`);
        return null;
      }
      const parsed = modelCostResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.error('fetchRate: routing response failed schema check — failing closed');
        return null;
      }
      return parsed.data;
    } catch (error) {
      this.logger.error(`fetchRate: routing unreachable — ${(error as Error).message}`);
      return null;
    }
  }

  private async readCache(provider: string, model: string): Promise<PaygRateSnapshot | null> {
    try {
      const raw = await this.redis.get(ModelRateClient.cacheKey(provider, model));
      if (raw === null) {
        return null;
      }
      const parsed = modelCostResponseSchema.safeParse(JSON.parse(raw));
      // A cache entry written by an older build can no longer be trusted to
      // price a request. Treat it as a miss and re-read rather than repairing
      // it in place — a partially-understood rate is worse than none.
      return parsed.success ? ModelRateClient.toSnapshot(parsed.data) : null;
    } catch (error) {
      this.logger.warn(`readCache: unusable cache entry — ${(error as Error).message}`);
      return null;
    }
  }

  private async writeCache(
    provider: string,
    model: string,
    payload: ModelCostResponse,
  ): Promise<void> {
    try {
      await this.redis.set(
        ModelRateClient.cacheKey(provider, model),
        JSON.stringify(payload),
        PAYG_RATE_CACHE_TTL_SECONDS,
      );
    } catch (error) {
      // A cache write failure must not fail the request — the rate is already
      // in hand and correct. It only costs the next caller another HTTP hop.
      this.logger.warn(`writeCache: could not cache rate — ${(error as Error).message}`);
    }
  }

  private static cacheKey(provider: string, model: string): string {
    return `${PAYG_RATE_CACHE_PREFIX}${provider}:${model}`;
  }

  private static toSnapshot(payload: ModelCostResponse): PaygRateSnapshot {
    const rates: ModelCostRates = {
      provider: payload.provider,
      model: payload.model,
      version: payload.version,
      currency: payload.currency,
      inputPerMillionMicroUsd: payload.inputPerMillionMicroUsd,
      outputPerMillionMicroUsd: payload.outputPerMillionMicroUsd,
      cachedInputPerMillionMicroUsd: payload.cachedInputPerMillionMicroUsd,
      cacheWritePerMillionMicroUsd: payload.cacheWritePerMillionMicroUsd,
      reasoningPerMillionMicroUsd: payload.reasoningPerMillionMicroUsd,
      imagePerUnitMicroUsd: payload.imagePerUnitMicroUsd,
      audioPerUnitMicroUsd: payload.audioPerUnitMicroUsd,
      videoPerUnitMicroUsd: payload.videoPerUnitMicroUsd,
      toolCallPerUnitMicroUsd: payload.toolCallPerUnitMicroUsd,
      searchCallPerUnitMicroUsd: payload.searchCallPerUnitMicroUsd,
      costClass: payload.costClass,
      isAdminOverride: payload.isAdminOverride,
      effectiveFrom: payload.effectiveFrom,
      lastVerifiedAt: payload.lastVerifiedAt,
      source: payload.source,
    };
    return {
      rates,
      isPriced: payload.isPriced,
      isLocalComputeFallback: ModelRateClient.looksLikeLocalFallback(payload),
    };
  }

  /**
   * Detects routing-service's local-compute zero-rate answer.
   *
   * Two independent signals, because either one alone can be defeated. A
   * non-null `localComputeOwnership` is the explicit marker; "claims to be
   * priced, at a rate of zero on both sides" is the SHAPE of that answer and
   * catches it even if the marker is ever dropped from the payload. For a
   * metered provider both mean the same thing: block, never bill zero.
   */
  private static looksLikeLocalFallback(payload: ModelCostResponse): boolean {
    if (payload.localComputeOwnership !== null) {
      return true;
    }
    return (
      payload.isPriced &&
      (payload.inputPerMillionMicroUsd ?? 0) === 0 &&
      (payload.outputPerMillionMicroUsd ?? 0) === 0
    );
  }
}
