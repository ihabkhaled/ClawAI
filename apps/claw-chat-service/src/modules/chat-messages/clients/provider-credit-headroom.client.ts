import { Injectable, Logger } from '@nestjs/common';
import { HttpMethod } from '@claw/shared-types';
import { getConnectorPreset, httpRequest } from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader } from '../../../common/utilities';
import {
  PROVIDER_CREDIT_HEADROOM_PATH,
  PROVIDER_CREDIT_HEADROOM_TIMEOUT_MS,
  PROVIDER_RATE_CACHE_MAX_ENTRIES,
  PROVIDER_RATE_CACHE_TTL_MS,
  PROVIDER_RATE_PATH_PREFIX,
  PROVIDER_RATE_TIMEOUT_MS,
} from '../constants/provider-credit.constants';
import { type ProviderTokenRates } from '../types/provider-credit.types';
import { providerAffordableOutputTokens } from '../utilities/provider-affordability.utility';

const headroomSchema = z.object({
  known: z.boolean(),
  remainingMicroUsd: z.number().int().nonnegative().nullable(),
});

const rateSchema = z.object({
  inputPerMillionMicroUsd: z.number().int().nonnegative().nullable(),
  outputPerMillionMicroUsd: z.number().int().nonnegative().nullable(),
  reasoningPerMillionMicroUsd: z.number().int().nonnegative().nullable().optional(),
  isPriced: z.boolean(),
  isFallbackRate: z.boolean(),
});

/**
 * How many output tokens the executing provider KEY can still pay for — the
 * pre-flight half of the OpenRouter 402 fix (2026-09-25).
 *
 * OpenRouter pre-authorizes `max_tokens × output price` against the key's
 * remaining credit and refuses the whole request when it does not fit. Asking
 * first lets the chokepoint send a `max_tokens` the key can afford.
 *
 * Only presets that declare key-credit endpoints (`creditHeadroom`) are asked,
 * so every other provider pays no extra hop. The balance comes from
 * connector-service (it holds the key); the price from routing-service's rate
 * card (the PAYG meter's source, ADR-079).
 *
 * FAILS OPEN on every path — `undefined` means "send no cap". Unlike a user's
 * PAYG wallet, this is the provider's own limit, which the provider still
 * enforces; the reactive 402 retry is the backstop. A guessed cap would refuse
 * answers the key could afford, so an unknown balance, an unlimited key, an
 * unpriced model and a pessimistic fallback rate all mean no cap.
 */
@Injectable()
export class ProviderCreditHeadroomClient {
  private readonly logger = new Logger(ProviderCreditHeadroomClient.name);
  private static readonly rates = new Map<
    string,
    { rates: ProviderTokenRates | null; expiresAt: number }
  >();

  static invalidateAll(): void {
    ProviderCreditHeadroomClient.rates.clear();
  }

  async affordableOutputTokens(
    provider: string,
    model: string,
    promptTokens: number,
  ): Promise<number | undefined> {
    const preset = getConnectorPreset(provider.toUpperCase());
    if (preset?.creditHeadroom === null || preset?.creditHeadroom === undefined) {
      return undefined;
    }
    const remaining = await this.fetchRemainingMicroUsd(preset.key);
    if (remaining === undefined) {
      return undefined;
    }
    const rates = await this.findRates(preset.key, model);
    return rates === null
      ? undefined
      : providerAffordableOutputTokens(remaining, promptTokens, rates);
  }

  /** Integer micro-USD left on the key; `undefined` when unknown or unlimited. */
  private async fetchRemainingMicroUsd(provider: string): Promise<number | undefined> {
    try {
      const url = `${AppConfig.get().CONNECTOR_SERVICE_URL}${PROVIDER_CREDIT_HEADROOM_PATH}?provider=${encodeURIComponent(provider)}`;
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: PROVIDER_CREDIT_HEADROOM_TIMEOUT_MS,
      });
      const parsed = response.ok ? headroomSchema.safeParse(response.data) : undefined;
      if (parsed?.success !== true) {
        this.logger.warn(
          `fetchRemainingMicroUsd: ${provider} status=${String(response.status)} unusable — no pre-flight cap`,
        );
        return undefined;
      }
      return parsed.data.known ? (parsed.data.remainingMicroUsd ?? undefined) : undefined;
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `fetchRemainingMicroUsd: ${provider} unreachable (${reason}) — no pre-flight cap`,
      );
      return undefined;
    }
  }

  private async findRates(provider: string, model: string): Promise<ProviderTokenRates | null> {
    const key = `${provider}/${model}`;
    const now = Date.now();
    const hit = ProviderCreditHeadroomClient.rates.get(key);
    if (hit !== undefined && hit.expiresAt > now) {
      return hit.rates;
    }
    const rates = await this.fetchRates(provider, model);
    if (ProviderCreditHeadroomClient.rates.size >= PROVIDER_RATE_CACHE_MAX_ENTRIES) {
      const oldest = ProviderCreditHeadroomClient.rates.keys().next();
      if (oldest.done !== true) {
        ProviderCreditHeadroomClient.rates.delete(oldest.value);
      }
    }
    ProviderCreditHeadroomClient.rates.set(key, {
      rates,
      expiresAt: now + PROVIDER_RATE_CACHE_TTL_MS,
    });
    return rates;
  }

  /** The model's own published rate, or null — a fallback rate is not a price. */
  private async fetchRates(provider: string, model: string): Promise<ProviderTokenRates | null> {
    try {
      const url = `${AppConfig.get().ROUTING_SERVICE_URL}${PROVIDER_RATE_PATH_PREFIX}/${encodeURIComponent(provider)}/${encodeURIComponent(model)}`;
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        headers: { Authorization: buildInterServiceAuthHeader() },
        timeoutMs: PROVIDER_RATE_TIMEOUT_MS,
      });
      const parsed = response.ok ? rateSchema.safeParse(response.data) : undefined;
      return parsed?.success !== true || !parsed.data.isPriced || parsed.data.isFallbackRate
        ? null
        : {
            inputPerMillionMicroUsd: parsed.data.inputPerMillionMicroUsd,
            outputPerMillionMicroUsd: parsed.data.outputPerMillionMicroUsd,
            reasoningPerMillionMicroUsd: parsed.data.reasoningPerMillionMicroUsd ?? null,
          };
    } catch (error: unknown) {
      const reason = error instanceof Error ? error.message : 'unknown';
      this.logger.warn(
        `fetchRates: ${provider}/${model} unreachable (${reason}) — no pre-flight cap`,
      );
      return null;
    }
  }
}
