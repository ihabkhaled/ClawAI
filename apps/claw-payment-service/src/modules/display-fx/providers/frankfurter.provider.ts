import { Injectable, Logger } from '@nestjs/common';
import {
  DISPLAY_FX_PRIMARY_BASE_URL,
  DISPLAY_FX_PROVIDER_TIMEOUT_MS,
} from '@claw/shared-constants';
import { DisplayFxSource, HttpMethod } from '@claw/shared-types';
import { httpRequest, parseDisplayRateToScaled } from '@claw/shared-utilities';

import { frankfurterResponseSchema } from '../schemas/display-fx.schema';
import { type DisplayFxProvider, type DisplayRateResult } from '../types/display-fx.types';

// Primary display-rate source.
//
// Public, free, no API key, open source, sourced from central-bank references.
// The base URL is a constant rather than configuration on purpose: an FX
// endpoint that can be set from a request or a database row is an SSRF
// primitive wearing a billing feature's clothes.
//
// Frankfurter covers roughly thirty major currencies. A currency it does not
// know is not an error — it is the reason the fallback exists.
@Injectable()
export class FrankfurterProvider implements DisplayFxProvider {
  readonly name = DisplayFxSource.FRANKFURTER;

  private readonly logger = new Logger(FrankfurterProvider.name);

  async fetchRate(baseCurrency: string, quoteCurrency: string): Promise<DisplayRateResult | null> {
    // Both codes are allowlist-validated by the caller before they reach a URL.
    const url = `${DISPLAY_FX_PRIMARY_BASE_URL}/latest?base=${baseCurrency}&symbols=${quoteCurrency}`;
    try {
      const response = await httpRequest<unknown>({
        url,
        method: HttpMethod.GET,
        timeoutMs: DISPLAY_FX_PROVIDER_TIMEOUT_MS,
      });
      if (!response.ok) {
        this.logger.warn(`fetchRate: upstream status ${String(response.status)}`);
        return null;
      }
      const parsed = frankfurterResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        this.logger.warn('fetchRate: upstream body did not parse');
        return null;
      }
      // A response echoing a base ClawAI did not ask for is answering a
      // different question, and using it would price against the wrong pair.
      if (parsed.data.base.toUpperCase() !== baseCurrency) {
        this.logger.warn('fetchRate: upstream answered for a different base currency');
        return null;
      }
      const rate = parsed.data.rates[quoteCurrency];
      if (rate === undefined) {
        return null;
      }
      const rateScaled = parseDisplayRateToScaled(rate);
      if (rateScaled === null) {
        this.logger.warn('fetchRate: upstream rate failed the sanity check');
        return null;
      }
      return { rateScaled, asOf: parsed.data.date, source: this.name };
    } catch (error) {
      this.logger.warn(`fetchRate: upstream failed - ${(error as Error).message}`);
      return null;
    }
  }
}
