import { Injectable, Logger } from '@nestjs/common';
import {
  DISPLAY_BASE_CURRENCY,
  resolveCountryDisplayCurrency,
  resolveTimezoneCountry,
} from '@claw/shared-constants';
import {
  CurrencyPreferenceMode,
  type DisplayCurrencyContext,
  GeoCountrySource,
} from '@claw/shared-types';
import { normalizeDisplayCurrency } from '@claw/shared-utilities';

import { AppConfig } from '../../../app/config/app.config';
import { normalizeCountryCode } from '../service.utilities/country-code.utility';
import { type DisplayCurrencyRequest } from '../types/display-currency-request.type';
import { DisplayFxService } from './display-fx.service';
import { GeoCountryService } from './geo-country.service';

// The ONE place display-currency precedence is decided.
//
// Every surface asks this and no surface re-derives it. A second copy of this
// order is how a plan card and a checkout summary end up disagreeing about
// which currency the same visitor is in.
//
// Precedence, highest first:
//
//   1. an authenticated MANUAL preference
//   2. an anonymous manual choice, from the first-party cookie
//   3. AUTO detection - trusted edge country, then IP lookup
//   4. USD
//
// A manual choice outranks geolocation permanently, not until the next page
// load. If the IP says Egypt and the user asked for euros, they get euros: the
// visitor knows where they are better than an IP database does.
@Injectable()
export class DisplayCurrencyService {
  private readonly logger = new Logger(DisplayCurrencyService.name);

  constructor(
    private readonly geo: GeoCountryService,
    private readonly fx: DisplayFxService,
  ) {}

  async resolve(request: DisplayCurrencyRequest): Promise<DisplayCurrencyContext> {
    if (AppConfig.get().DISPLAY_FX_ENABLED !== 'true') {
      // The kill switch. Its OFF state is the rollback lever and must produce a
      // completely ordinary USD site, not a degraded one.
      return DisplayCurrencyService.canonicalContext(GeoCountrySource.UNRESOLVED);
    }

    const manual = DisplayCurrencyService.resolveManualChoice(request);
    if (manual !== null) {
      return this.withRate({
        countryCode: normalizeCountryCode(request.preferredCountryCode),
        currencyCode: manual.currencyCode,
        mode: CurrencyPreferenceMode.MANUAL,
        countrySource: manual.source,
        fx: null,
      });
    }

    const detected = await this.detectCountry(request);
    return this.withRate({
      countryCode: detected.countryCode,
      currencyCode: resolveCountryDisplayCurrency(detected.countryCode),
      mode: CurrencyPreferenceMode.AUTO,
      countrySource: detected.source,
      fx: null,
    });
  }

  private static resolveManualChoice(
    request: DisplayCurrencyRequest,
  ): { currencyCode: string; source: GeoCountrySource } | null {
    if (request.preferenceMode === CurrencyPreferenceMode.MANUAL) {
      const saved = normalizeDisplayCurrency(request.preferredCurrencyCode);
      if (saved !== null) {
        return { currencyCode: saved, source: GeoCountrySource.USER_PREFERENCE };
      }
      // MANUAL with an unusable code - a currency retired since it was saved.
      // Falling through to detection keeps the page working; the stored
      // preference is left alone so it resumes if the code becomes valid again.
      // Silently clearing someone's setting because an upstream changed would
      // be a worse answer than showing them dollars for a day.
    }
    const anonymous = normalizeDisplayCurrency(request.anonymousCurrencyCode);
    return anonymous === null
      ? null
      : { currencyCode: anonymous, source: GeoCountrySource.ANONYMOUS_PREFERENCE };
  }

  private async detectCountry(
    request: DisplayCurrencyRequest,
  ): Promise<{ countryCode: string | null; source: GeoCountrySource }> {
    // An AUTO user who stored a country still gets it re-detected: AUTO means
    // "wherever I am now", so a saved country is context, not a freeze.
    if (AppConfig.get().DISPLAY_FX_GEO_ENABLED !== 'true') {
      return { countryCode: null, source: GeoCountrySource.UNRESOLVED };
    }
    const resolved = await this.geo.resolve(request.headers);
    if (resolved.countryCode !== null) {
      return {
        countryCode: resolved.countryCode,
        source: resolved.source as GeoCountrySource,
      };
    }
    // Last resort, and the weakest: the client decides what it sends here.
    //
    // It is also the only signal that survives a request that never crossed the
    // internet, so on a local install or behind a corporate NAT this is the
    // difference between AUTO working and AUTO always meaning USD.
    const hinted = normalizeCountryCode(resolveTimezoneCountry(request.clientCountryHint));
    return hinted === null
      ? { countryCode: null, source: GeoCountrySource.UNRESOLVED }
      : { countryCode: hinted, source: GeoCountrySource.CLIENT_HINT };
  }

  private async withRate(context: DisplayCurrencyContext): Promise<DisplayCurrencyContext> {
    if (context.currencyCode === DISPLAY_BASE_CURRENCY) {
      return context;
    }
    const fx = await this.fx.getRate(context.currencyCode);
    if (fx === null) {
      // Nothing could quote it. USD is the honest answer, and the canonical
      // price is still perfectly valid - only the conversion is missing.
      this.logger.debug(`withRate: no rate for ${context.currencyCode}, falling back to USD`);
      return { ...context, currencyCode: DISPLAY_BASE_CURRENCY, fx: null };
    }
    return { ...context, fx };
  }

  private static canonicalContext(source: GeoCountrySource): DisplayCurrencyContext {
    return {
      countryCode: null,
      currencyCode: DISPLAY_BASE_CURRENCY,
      mode: CurrencyPreferenceMode.AUTO,
      countrySource: source,
      fx: null,
    };
  }
}
