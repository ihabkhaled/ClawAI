import {
  CurrencyPreferenceMode,
  type DisplayCurrencyContext,
  DisplayFxSource,
  DisplayRoundingPolicy,
  GeoCountrySource,
} from '@claw/shared-types';

import { toLocalizedMoneyView } from '../localized-money.utility';

const EGP_RATE = {
  baseCurrency: 'USD',
  quoteCurrency: 'EGP',
  rateScaled: 512_830_000,
  asOf: '2026-09-11',
  source: DisplayFxSource.FRANKFURTER,
};

const EGP_CONTEXT: DisplayCurrencyContext = {
  countryCode: 'EG',
  currencyCode: 'EGP',
  mode: CurrencyPreferenceMode.AUTO,
  countrySource: GeoCountrySource.IP_LOOKUP,
  fx: EGP_RATE,
};

describe('toLocalizedMoneyView', () => {
  it('localizes a canonical USD plan price', () => {
    const view = toLocalizedMoneyView(1_000, 'USD', EGP_CONTEXT);
    expect(view.displayCurrency).toBe('EGP');
    expect(view.displayAmountMinor).toBe(51_500);
    expect(view.approximate).toBe(true);
    expect(view.conversionAvailable).toBe(true);
    expect(view.fxSource).toBe(DisplayFxSource.FRANKFURTER);
    expect(view.fxAsOf).toBe('2026-09-11');
  });

  it('always carries the canonical amount alongside the converted one', () => {
    // So no surface has to decide what the real price was, and so checkout can
    // show both figures without a second lookup.
    const view = toLocalizedMoneyView(1_000, 'USD', EGP_CONTEXT);
    expect(view.canonicalAmountMinor).toBe(1_000);
    expect(view.canonicalCurrency).toBe('USD');
  });

  it('is not approximate when no conversion happened', () => {
    const view = toLocalizedMoneyView(1_000, 'USD', {
      ...EGP_CONTEXT,
      currencyCode: 'USD',
      fx: null,
    });
    expect(view.displayCurrency).toBe('USD');
    expect(view.displayAmountMinor).toBe(1_000);
    expect(view.approximate).toBe(false);
    expect(view.conversionAvailable).toBe(true);
    expect(view.fxSource).toBe(DisplayFxSource.IDENTITY);
  });

  it('falls back to the canonical price when both providers failed', () => {
    // The canonical price is still valid. Only the conversion is missing, so
    // the page renders USD rather than rendering nothing.
    const view = toLocalizedMoneyView(1_000, 'USD', {
      ...EGP_CONTEXT,
      fx: null,
    });
    expect(view.displayCurrency).toBe('USD');
    expect(view.displayAmountMinor).toBe(1_000);
    expect(view.conversionAvailable).toBe(false);
    expect(view.fxSource).toBe(DisplayFxSource.USD_FALLBACK);
  });

  it('falls back when the rate quotes a different currency than requested', () => {
    // A rate for the wrong pair is worse than no rate.
    const view = toLocalizedMoneyView(1_000, 'USD', {
      ...EGP_CONTEXT,
      currencyCode: 'AED',
    });
    expect(view.displayCurrency).toBe('USD');
    expect(view.conversionAvailable).toBe(false);
  });

  it('renders without a context at all', () => {
    const view = toLocalizedMoneyView(1_000, 'USD', null);
    expect(view.displayAmountMinor).toBe(1_000);
    expect(view.displayCurrency).toBe('USD');
  });

  it('keeps a free plan free in every currency', () => {
    expect(toLocalizedMoneyView(0, 'USD', EGP_CONTEXT).displayAmountMinor).toBe(0);
  });

  it('leaves a tiny usage amount unrounded', () => {
    // $0.004 of consumption, converted. Commercial rounding here would report
    // a different number than the wallet was actually debited for.
    const view = toLocalizedMoneyView(4, 'USD', EGP_CONTEXT, DisplayRoundingPolicy.PRECISE_USAGE);
    expect(view.displayAmountMinor).toBe(205);
    expect(view.roundingPolicy).toBe(DisplayRoundingPolicy.PRECISE_USAGE);
  });

  it('records the rounding policy version it used', () => {
    expect(toLocalizedMoneyView(1_000, 'USD', EGP_CONTEXT).roundingPolicyVersion).toBe(1);
  });

  it('never throws, whatever the rate', () => {
    // A billing page must survive a bug in this file.
    const broken = toLocalizedMoneyView(Number.MAX_SAFE_INTEGER, 'USD', {
      ...EGP_CONTEXT,
      fx: { ...EGP_RATE, rateScaled: 999_999_999_999 },
    });
    expect(broken.canonicalAmountMinor).toBe(Number.MAX_SAFE_INTEGER);
  });
});
