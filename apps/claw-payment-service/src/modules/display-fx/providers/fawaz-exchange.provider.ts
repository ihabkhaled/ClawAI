import { Injectable, Logger } from '@nestjs/common';
import {
  DISPLAY_FX_FALLBACK_CDN_URL,
  DISPLAY_FX_FALLBACK_MIRROR_URL,
  DISPLAY_FX_PROVIDER_TIMEOUT_MS,
} from '@claw/shared-constants';
import { DisplayFxSource, HttpMethod } from '@claw/shared-types';
import { httpRequest, parseDisplayRateToScaled } from '@claw/shared-utilities';

import { fawazResponseSchema } from '../schemas/display-fx.schema';
import { type DisplayFxProvider, type DisplayRateResult } from '../types/display-fx.types';

// Fallback display-rate source: fawazahmed0/exchange-api.
//
// Two hundred currencies, daily, no key. The CDN URL and the Pages mirror are
// TRANSPORT mirrors of ONE economic source, not two opinions about the rate —
// so a disagreement between them would be a CDN bug, and trying the second
// after the first is retrying, not seeking a second opinion.
//
// The payload also carries crypto and metals. They never reach a user, because
// the value is read by key and the object is never enumerated: the display
// allowlist, not the provider, decides what ClawAI is willing to show.
@Injectable()
export class FawazExchangeProvider implements DisplayFxProvider {
  readonly name = DisplayFxSource.FAWAZ_EXCHANGE_API;

  private readonly logger = new Logger(FawazExchangeProvider.name);

  async fetchRate(baseCurrency: string, quoteCurrency: string): Promise<DisplayRateResult | null> {
    const base = baseCurrency.toLowerCase();
    const quote = quoteCurrency.toLowerCase();
    for (const origin of [DISPLAY_FX_FALLBACK_CDN_URL, DISPLAY_FX_FALLBACK_MIRROR_URL]) {
      const result = await this.fetchFrom(`${origin}/currencies/${base}.min.json`, base, quote);
      if (result !== null) {
        return result;
      }
    }
    return null;
  }

  private async fetchFrom(
    url: string,
    base: string,
    quote: string,
  ): Promise<DisplayRateResult | null> {
    try {
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        timeoutMs: DISPLAY_FX_PROVIDER_TIMEOUT_MS,
      });
      if (!response.ok) {
        return null;
      }
      const envelope = fawazResponseSchema.safeParse(response.data);
      if (!envelope.success) {
        return null;
      }
      // The rate table is nested under the lowercase base code. Reached by key
      // and validated individually rather than parsed as a whole record: this
      // body carries two hundred entries and validating all of them to read one
      // is work done on every single cold cache fill.
      const body = response.data as Record<string, unknown>;
      const table = body[base];
      if (typeof table !== 'object' || table === null) {
        return null;
      }
      const raw = (table as Record<string, unknown>)[quote];
      if (typeof raw !== 'number' && typeof raw !== 'string') {
        return null;
      }
      const rateScaled = parseDisplayRateToScaled(raw);
      if (rateScaled === null) {
        this.logger.warn('fetchFrom: fallback rate failed the sanity check');
        return null;
      }
      return { rateScaled, asOf: envelope.data.date, source: this.name };
    } catch (error) {
      this.logger.warn(`fetchFrom: fallback transport failed - ${(error as Error).message}`);
      return null;
    }
  }
}
