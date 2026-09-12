import {
  CurrencyPreferenceMode,
  type DisplayCurrencyContext,
  DisplayFxSource,
  DisplayRoundingPolicy,
  GeoCountrySource,
} from '@claw/shared-types';
import { toLocalizedMoneyView } from '@claw/shared-utilities/money';
import { describe, expect, it } from 'vitest';

// The test rule 45 says must always exist.
//
// Switching display currency changes pixels and nothing else. If this file is
// deleted, the central invariant of the whole feature has no teeth left.

function contextFor(currency: string, rateScaled: number | null): DisplayCurrencyContext {
  return {
    countryCode: null,
    currencyCode: currency,
    mode: CurrencyPreferenceMode.MANUAL,
    countrySource: GeoCountrySource.USER_PREFERENCE,
    fx:
      rateScaled === null
        ? null
        : {
            baseCurrency: 'USD',
            quoteCurrency: currency,
            rateScaled,
            asOf: '2026-09-12',
            source: DisplayFxSource.FRANKFURTER,
          },
  };
}

const CURRENCIES = [
  contextFor('USD', null),
  contextFor('EGP', 512_830_000),
  contextFor('EUR', 9_100_000),
  contextFor('JPY', 1_470_000_000),
  contextFor('USD', null),
];

describe('switching display currency changes nothing financial', () => {
  it('leaves the canonical amount untouched through every switch', () => {
    // USD -> EGP -> EUR -> JPY -> USD
    for (const context of CURRENCIES) {
      const view = toLocalizedMoneyView(1_000, 'USD', context);
      expect(view.canonicalAmountMinor).toBe(1_000);
      expect(view.canonicalCurrency).toBe('USD');
    }
  });

  it('leaves a wallet balance identical in micro-USD', () => {
    // The wallet holds a USD-denominated allowance. A display switch must not
    // move grantMicroUsd, purchasedMicroUsd or reservedMicroUsd by one unit.
    const walletMicroUsd = 30_000_000;
    for (const context of CURRENCIES) {
      const view = toLocalizedMoneyView(
        Math.round(walletMicroUsd / 10_000),
        'USD',
        context,
        DisplayRoundingPolicy.PRECISE_USAGE,
      );
      expect(view.canonicalAmountMinor).toBe(3_000);
      // Nothing in the view can be written back to a wallet: there is no
      // micro-USD field on it at all.
      expect(view).not.toHaveProperty('microUsd');
    }
  });

  it('leaves an invoice fact untouched', () => {
    // An invoice charged in EGP keeps its EGP amount whatever the viewer picked.
    const invoice = { totalMinor: 52_137, currency: 'EGP' };
    for (const context of CURRENCIES) {
      const view = toLocalizedMoneyView(invoice.totalMinor, invoice.currency, context);
      expect(view.canonicalAmountMinor).toBe(52_137);
      expect(view.canonicalCurrency).toBe('EGP');
    }
  });

  it('never produces a field a gateway call would accept', () => {
    // The type-level guard, asserted at runtime too: no quoteId, no expiry, no
    // safety margin means nothing here fits a settlement call site.
    const view = toLocalizedMoneyView(1_000, 'USD', contextFor('EGP', 512_830_000));
    expect(view).not.toHaveProperty('quoteId');
    expect(view).not.toHaveProperty('expiresAtMs');
    expect(view).not.toHaveProperty('safetyMarginBps');
    expect(view).not.toHaveProperty('convertedAmountMinor');
  });

  it('carries no settlement safety margin', () => {
    // 1.5% of settlement margin applied to a marketing price is a quiet markup
    // on everyone outside the United States.
    const view = toLocalizedMoneyView(1_000, 'USD', contextFor('EGP', 500_000_000));
    // Exactly 50.00 * 10 = EGP 500.00, with no margin and no upward bias.
    expect(view.displayAmountMinor).toBe(50_000);
  });

  it('renders the canonical price when conversion is unavailable', () => {
    const view = toLocalizedMoneyView(1_000, 'USD', contextFor('EGP', null));
    expect(view.displayAmountMinor).toBe(1_000);
    expect(view.displayCurrency).toBe('USD');
    expect(view.conversionAvailable).toBe(false);
  });

  it('is reproducible: the same inputs always give the same number', () => {
    const once = toLocalizedMoneyView(1_000, 'USD', contextFor('EGP', 512_830_000));
    const twice = toLocalizedMoneyView(1_000, 'USD', contextFor('EGP', 512_830_000));
    expect(once).toEqual(twice);
  });
});
