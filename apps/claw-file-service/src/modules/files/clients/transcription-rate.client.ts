import { Injectable, Logger } from '@nestjs/common';
import { declaredHost, httpGet } from '@claw/shared-utilities';
import { type ModelCostRates } from '@claw/shared-types';
import { AppConfig } from '../../../app/config/app.config';
import {
  MODEL_RATE_CACHE_MAX_ENTRIES,
  MODEL_RATE_CACHE_TTL_MS,
  MODEL_RATE_PATH_PREFIX,
  MODEL_RATE_TIMEOUT_MS,
} from '../constants/transcribe-chunk.constants';
import { modelRateResponseSchema } from '../dto/model-rate-response.dto';

/**
 * ADR-221 — a transcription model's rate card from routing-service, for the
 * platform-cost ESTIMATE of a Live Intelligence chunk. Never used to charge a
 * user (the PAYG meter in auth-service owns that).
 *
 * Fails SOFT: an unreachable routing-service, a bad shape or an unpriced model
 * returns null and the chunk is still transcribed (`costKnown: false`). Losing
 * the transcript to a reporting lookup would be the worse outcome. Rates are
 * never logged (rule 37).
 */
@Injectable()
export class TranscriptionRateClient {
  private readonly logger = new Logger(TranscriptionRateClient.name);
  private readonly cache = new Map<string, { rates: ModelCostRates | null; expiresAt: number }>();

  async findRates(provider: string, model: string): Promise<ModelCostRates | null> {
    const key = `${provider}/${model}`;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit !== undefined && hit.expiresAt > now) {
      return hit.rates;
    }
    const rates = await this.fetchRates(provider, model);
    if (this.cache.size >= MODEL_RATE_CACHE_MAX_ENTRIES) {
      this.cache.clear();
    }
    this.cache.set(key, { rates, expiresAt: now + MODEL_RATE_CACHE_TTL_MS });
    return rates;
  }

  private async fetchRates(provider: string, model: string): Promise<ModelCostRates | null> {
    const base = AppConfig.get().ROUTING_SERVICE_URL;
    const url = `${base}${MODEL_RATE_PATH_PREFIX}/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
    try {
      const payload = await httpGet<unknown>(
        url,
        {
          timeout: MODEL_RATE_TIMEOUT_MS,
          headers: { Authorization: `Service ${AppConfig.get().INTER_SERVICE_AUTH_TOKEN}` },
        },
        declaredHost(base),
      );
      const parsed = modelRateResponseSchema.safeParse(payload);
      if (!parsed.success) {
        this.logger.warn(`fetchRates: ${provider}/${model} rate card did not parse`);
        return null;
      }
      if (!parsed.data.isPriced) {
        this.logger.warn(`fetchRates: ${provider}/${model} is unpriced`);
        return null;
      }
      return parsed.data;
    } catch (error: unknown) {
      this.logger.warn(
        `fetchRates: ${provider}/${model} unavailable — ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }
}
