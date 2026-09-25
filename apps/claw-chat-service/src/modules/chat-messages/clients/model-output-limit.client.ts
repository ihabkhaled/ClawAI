import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { httpRequest, modelMatchKey } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  PROVIDER_OUTPUT_LIMIT_CACHE_MAX_ENTRIES,
  PROVIDER_OUTPUT_LIMIT_RECORD_PATH,
  PROVIDER_OUTPUT_LIMIT_RECORD_TIMEOUT_MS,
} from '../constants/provider-credit.constants';
import { ModelCapabilityClient } from './model-capability.client';

/**
 * A model's real output ceiling, so the chokepoint can clamp `max_tokens`
 * BEFORE the call instead of learning it from a refusal every time (ADR-125).
 *
 * Two sources, the smaller wins: connector-service's models-snapshot (the
 * catalog's published ceiling, or one learned earlier by any replica), and
 * what THIS replica learned since — so a learned ceiling applies to the very
 * next turn, not after the 60 s snapshot cache expires.
 *
 * `record` persists to `connector_models.learned_max_output_tokens` (only ever
 * lowered). Both directions fail open: an unknown ceiling means no pre-clamp.
 */
@Injectable()
export class ModelOutputLimitClient {
  private static readonly learned = new Map<string, number>();
  private readonly logger = new Logger(ModelOutputLimitClient.name);

  constructor(private readonly modelCapability: ModelCapabilityClient) {}

  /** Test-only reset of the process-wide learned ceilings. */
  static forgetAll(): void {
    ModelOutputLimitClient.learned.clear();
  }

  async find(provider: string, model: string): Promise<number | undefined> {
    const learned = ModelOutputLimitClient.learned.get(modelMatchKey(provider, model));
    const catalog = await this.modelCapability
      .resolveMaxOutputTokens(provider, model)
      .catch(() => {});
    const known = [learned, catalog].filter((value): value is number => value !== undefined);
    return known.length === 0 ? undefined : Math.min(...known);
  }

  async record(provider: string, model: string, maxOutputTokens: number): Promise<void> {
    const key = modelMatchKey(provider, model);
    const current = ModelOutputLimitClient.learned.get(key);
    if (current === undefined || maxOutputTokens < current) {
      this.remember(key, maxOutputTokens);
    }
    try {
      await httpRequest<unknown>({
        url: `${AppConfig.get().CONNECTOR_SERVICE_URL}${PROVIDER_OUTPUT_LIMIT_RECORD_PATH}`,
        method: HttpMethod.POST,
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { provider, model, maxOutputTokens },
        timeoutMs: PROVIDER_OUTPUT_LIMIT_RECORD_TIMEOUT_MS,
      });
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(`record: ${provider}/${model} not persisted (${reason}) — kept in memory`);
    }
  }

  private remember(key: string, value: number): void {
    const learned = ModelOutputLimitClient.learned;
    if (learned.size >= PROVIDER_OUTPUT_LIMIT_CACHE_MAX_ENTRIES && !learned.has(key)) {
      const oldest = learned.keys().next();
      if (oldest.done !== true) {
        learned.delete(oldest.value);
      }
    }
    learned.set(key, value);
  }
}
