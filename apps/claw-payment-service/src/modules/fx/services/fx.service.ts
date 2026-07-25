import { Injectable, Logger } from '@nestjs/common';
import { BillingErrorCode, HttpMethod } from '@claw/shared-types';
import {
  applySafetyMarginToRate,
  convertMinorUnits,
  httpRequest,
  parseRateToScaled,
} from '@claw/shared-utilities';
import { z } from 'zod';

import { AppConfig } from '../../../app/config/app.config';
import { BillingException } from '../../../common/errors';
import { FxQuoteRepository } from '../repositories/fx-quote.repository';
import { type FxQuoteResult } from '../types/fx.types';

// Plan prices are canonical in USD. Paymob charges EGP, so the EGP total is
// computed on the SERVER, bound to the checkout session, and revalidated
// against what the gateway reports.
//
// The safety margin exists because the rate can move between quoting and
// settlement. ClawAI quotes slightly high rather than absorbing an FX loss on
// every single charge.
//
// A fallback rate is used ONLY when explicitly configured. Setting it to 0
// means "fail the checkout rather than charge at a stale rate", which is the
// safer default: charging the wrong amount is worse than not charging.
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(private readonly repository: FxQuoteRepository) {}

  async quote(
    amountMinor: number,
    baseCurrency: string,
    quoteCurrency: string,
    nowMs: number = Date.now(),
  ): Promise<FxQuoteResult> {
    this.logger.debug(`quote: ${String(amountMinor)} ${baseCurrency}->${quoteCurrency}`);
    if (baseCurrency === quoteCurrency) {
      return FxService.identityQuote(amountMinor, baseCurrency, nowMs);
    }
    const cached = await this.repository.findFresh(baseCurrency, quoteCurrency, nowMs);
    if (cached) {
      return FxService.toResult(cached, amountMinor, Number(cached.finalRateScaled));
    }
    return this.createQuote(amountMinor, baseCurrency, quoteCurrency, nowMs);
  }

  // Re-reads a stored quote and refuses it once expired. A checkout must never
  // settle against a rate that has aged out.
  async requireFresh(quoteId: string, nowMs: number = Date.now()): Promise<void> {
    const quote = await this.repository.findById(quoteId);
    if (!quote || quote.expiresAt.getTime() <= nowMs) {
      throw new BillingException(BillingErrorCode.PRORATION_QUOTE_EXPIRED);
    }
  }

  private static identityQuote(
    amountMinor: number,
    currency: string,
    nowMs: number,
  ): FxQuoteResult {
    return {
      quoteId: 'identity',
      baseCurrency: currency,
      quoteCurrency: currency,
      sourceRateScaled: 0,
      finalRateScaled: 0,
      safetyMarginBps: 0,
      convertedAmountMinor: amountMinor,
      expiresAtMs: nowMs + AppConfig.get().FX_QUOTE_TTL_MS,
      source: 'IDENTITY',
    };
  }

  private async createQuote(
    amountMinor: number,
    baseCurrency: string,
    quoteCurrency: string,
    nowMs: number,
  ): Promise<FxQuoteResult> {
    const config = AppConfig.get();
    const { sourceRateScaled, source } = await this.resolveRate(baseCurrency, quoteCurrency);
    const finalRateScaled = applySafetyMarginToRate(sourceRateScaled, config.FX_SAFETY_MARGIN_BPS);
    const record = await this.repository.create({
      baseCurrency,
      quoteCurrency,
      sourceRateScaled: BigInt(sourceRateScaled),
      safetyMarginBps: config.FX_SAFETY_MARGIN_BPS,
      finalRateScaled: BigInt(finalRateScaled),
      source,
      fetchedAt: new Date(nowMs),
      expiresAt: new Date(nowMs + config.FX_QUOTE_TTL_MS),
    });
    return FxService.toResult(record, amountMinor, finalRateScaled);
  }

  private static toResult(
    record: {
      id: string;
      baseCurrency: string;
      quoteCurrency: string;
      sourceRateScaled: bigint;
      safetyMarginBps: number;
      expiresAt: Date;
      source: string;
    },
    amountMinor: number,
    finalRateScaled: number,
  ): FxQuoteResult {
    return {
      quoteId: record.id,
      baseCurrency: record.baseCurrency,
      quoteCurrency: record.quoteCurrency,
      sourceRateScaled: Number(record.sourceRateScaled),
      finalRateScaled,
      safetyMarginBps: record.safetyMarginBps,
      convertedAmountMinor: convertMinorUnits(
        amountMinor,
        record.baseCurrency,
        record.quoteCurrency,
        finalRateScaled,
      ),
      expiresAtMs: record.expiresAt.getTime(),
      source: record.source,
    };
  }

  private async resolveRate(
    baseCurrency: string,
    quoteCurrency: string,
  ): Promise<{ sourceRateScaled: number; source: string }> {
    const config = AppConfig.get();
    try {
      const response = await httpRequest<unknown>({
        url: `${config.EXCHANGE_RATE_API_BASE_URL}/${baseCurrency}`,
        method: HttpMethod.GET,
        timeoutMs: config.PAYMENT_GATEWAY_TIMEOUT_MS,
      });
      if (response.ok) {
        const parsed = FxService.rateSchema.safeParse(response.data);
        const rate = parsed.success ? parsed.data.rates[quoteCurrency] : undefined;
        if (rate !== undefined) {
          return { sourceRateScaled: parseRateToScaled(String(rate)), source: 'API' };
        }
      }
      this.logger.warn(`resolveRate: upstream did not return a ${quoteCurrency} rate`);
    } catch (error) {
      this.logger.error(`resolveRate: upstream failed — ${(error as Error).message}`);
    }
    return this.fallbackRate(quoteCurrency);
  }

  // Configured fallback, or refusal. A zero fallback is not "free" — it is an
  // explicit instruction to fail the checkout rather than charge at a rate
  // nobody has verified.
  private fallbackRate(quoteCurrency: string): { sourceRateScaled: number; source: string } {
    // The fallback stays a STRING all the way through — parsing it to a float
    // first would defeat the point of scaled-integer rates.
    const raw = AppConfig.get().USD_TO_EGP_FALLBACK_RATE.trim();
    const scaled = /^\d+(\.\d+)?$/.test(raw) ? parseRateToScaled(raw) : 0;
    if (quoteCurrency !== 'EGP' || scaled <= 0) {
      this.logger.error(
        `fallbackRate: no usable rate for ${quoteCurrency} — refusing to quote a checkout`,
      );
      throw new BillingException(BillingErrorCode.PAYMENT_METHOD_UNAVAILABLE);
    }
    this.logger.warn('fallbackRate: using the configured fallback USD->EGP rate');
    return { sourceRateScaled: scaled, source: 'FALLBACK' };
  }

  private static readonly rateSchema = z.object({
    rates: z.record(z.string(), z.union([z.number(), z.string()])),
  });
}
