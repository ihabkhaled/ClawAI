import {
  COUNTRY_TO_DISPLAY_CURRENCY,
  FX_RATE_SCALE,
  isValidCountryCode,
  resolveCountryDisplayCurrency,
  SUPPORTED_BILLING_CURRENCIES,
  SUPPORTED_DISPLAY_CURRENCIES,
} from '@claw/shared-constants';

import {
  convertMinorForDisplay,
  displayMinorUnitExponent,
  isSaneDisplayRate,
  isSupportedDisplayCurrency,
  normalizeDisplayCurrency,
  parseDisplayRateToScaled,
} from '../display-currency.utility';
import { MoneyErrorCode } from '../money-error-code.enum';
import { type MoneyError } from '../money-error';

// 48.75 EGP per USD.
const USD_EGP = 487_500_000;

describe('display-currency.utility', () => {
  describe('the display set is wider than the billing set', () => {
    // The one relationship that must never invert. A currency ClawAI charges in
    // that it cannot display would render a real invoice unreadable.
    it('displays every currency it can bill in', () => {
      for (const currency of Object.keys(SUPPORTED_BILLING_CURRENCIES)) {
        expect(isSupportedDisplayCurrency(currency)).toBe(true);
      }
    });

    it('does not widen the billing set', () => {
      expect(Object.keys(SUPPORTED_BILLING_CURRENCIES).sort()).toEqual([
        'EGP',
        'EUR',
        'GBP',
        'USD',
      ]);
    });

    it('exposes no crypto or metal codes', () => {
      for (const code of ['BTC', 'ETH', 'XAU', 'XAG', 'USDT', 'DOGE']) {
        expect(isSupportedDisplayCurrency(code)).toBe(false);
      }
    });

    it('always includes the canonical currency', () => {
      expect(isSupportedDisplayCurrency('USD')).toBe(true);
    });
  });

  describe('normalizeDisplayCurrency', () => {
    it('uppercases and trims a usable code', () => {
      expect(normalizeDisplayCurrency(' egp ')).toBe('EGP');
      expect(normalizeDisplayCurrency('eur')).toBe('EUR');
    });

    it('returns null for anything unusable rather than throwing', () => {
      // A stale cookie is an ordinary event, not an exception.
      for (const candidate of ['', '  ', 'US', 'USDD', 'BTC', 'ZZZ', '123', null, undefined]) {
        expect(normalizeDisplayCurrency(candidate)).toBeNull();
      }
    });

    it('rejects a payload-sized value', () => {
      expect(normalizeDisplayCurrency('A'.repeat(4096))).toBeNull();
    });
  });

  describe('displayMinorUnitExponent', () => {
    it('never assumes two decimals', () => {
      expect(displayMinorUnitExponent('JPY')).toBe(0);
      expect(displayMinorUnitExponent('KRW')).toBe(0);
      expect(displayMinorUnitExponent('VND')).toBe(0);
      expect(displayMinorUnitExponent('KWD')).toBe(3);
      expect(displayMinorUnitExponent('BHD')).toBe(3);
      expect(displayMinorUnitExponent('USD')).toBe(2);
    });

    it('throws for an unsupported currency', () => {
      expect(() => displayMinorUnitExponent('BTC')).toThrow();
    });
  });

  describe('isSaneDisplayRate', () => {
    it('rejects the impossible', () => {
      expect(isSaneDisplayRate(0)).toBe(false);
      expect(isSaneDisplayRate(-1)).toBe(false);
      expect(isSaneDisplayRate(1.5)).toBe(false);
      expect(isSaneDisplayRate(Number.NaN)).toBe(false);
      expect(isSaneDisplayRate(Number.POSITIVE_INFINITY)).toBe(false);
    });

    it('accepts a genuine hyperinflation rate', () => {
      // 25,000 local per USD is real and must not be mistaken for corruption.
      expect(isSaneDisplayRate(25_000 * FX_RATE_SCALE)).toBe(true);
    });
  });
});

describe('convertMinorForDisplay', () => {
  it('converts USD 10.00 to EGP at 48.75', () => {
    expect(convertMinorForDisplay(1_000, 'USD', 'EGP', USD_EGP)).toBe(48_750);
  });

  it('returns the amount unchanged when base equals quote', () => {
    expect(convertMinorForDisplay(999, 'USD', 'USD', USD_EGP)).toBe(999);
  });

  it('drops the minor unit for a zero-decimal currency', () => {
    // USD 10.00 at 147.00 JPY/USD is JPY 1470 - 1470 minor units, not 147000.
    expect(convertMinorForDisplay(1_000, 'USD', 'JPY', 147 * FX_RATE_SCALE)).toBe(1_470);
  });

  it('adds the third digit for a three-decimal currency', () => {
    // USD 10.00 at 0.307 KWD/USD is KWD 3.070 - 3070 minor units.
    expect(convertMinorForDisplay(1_000, 'USD', 'KWD', 3_070_000)).toBe(3_070);
  });

  it('keeps the sign on a refund', () => {
    expect(convertMinorForDisplay(-1_000, 'USD', 'EGP', USD_EGP)).toBe(-48_750);
  });

  it('rounds half up away from zero, symmetrically', () => {
    // A credit and the charge it reverses must round by the same magnitude.
    const charge = convertMinorForDisplay(333, 'USD', 'EGP', USD_EGP);
    const credit = convertMinorForDisplay(-333, 'USD', 'EGP', USD_EGP);
    expect(credit).toBe(-charge);
  });

  it('survives a weak currency against a large balance', () => {
    // The settlement converter throws past 2^53 because a checkout should fail
    // loudly. A wallet page must not.
    const result = convertMinorForDisplay(100_000_000, 'USD', 'VND', 26_000 * FX_RATE_SCALE);
    expect(Number.isSafeInteger(result)).toBe(true);
  });

  it('rejects an insane rate', () => {
    expect(() => convertMinorForDisplay(1_000, 'USD', 'EGP', 0)).toThrow();
    expect(() => convertMinorForDisplay(1_000, 'USD', 'EGP', -1)).toThrow();
  });

  it('rejects a non-integer amount', () => {
    try {
      convertMinorForDisplay(10.5, 'USD', 'EGP', USD_EGP);
      throw new Error('expected a throw');
    } catch (error) {
      expect((error as MoneyError).code).toBe(MoneyErrorCode.NON_INTEGER_AMOUNT);
    }
  });
});

describe('parseDisplayRateToScaled', () => {
  it('scales an ordinary rate', () => {
    expect(parseDisplayRateToScaled('48.75')).toBe(USD_EGP);
    expect(parseDisplayRateToScaled('1')).toBe(FX_RATE_SCALE);
  });

  it('truncates excess precision instead of refusing', () => {
    // The settlement parser throws here. A marketing page must not go blank
    // because a free API returned a seventeenth decimal.
    expect(parseDisplayRateToScaled('48.7512345678901234')).toBe(487_512_345);
  });

  it('accepts a number as well as a string', () => {
    expect(parseDisplayRateToScaled(48.75)).toBe(USD_EGP);
  });

  it('returns null for a malformed, zero or negative rate', () => {
    for (const rate of ['', 'abc', '-1', '0', 'NaN', '1e5', '1.2.3']) {
      expect(parseDisplayRateToScaled(rate)).toBeNull();
    }
    expect(parseDisplayRateToScaled(0)).toBeNull();
    expect(parseDisplayRateToScaled(-3)).toBeNull();
    expect(parseDisplayRateToScaled(Number.NaN)).toBeNull();
  });
});

describe('country to currency', () => {
  it('maps the countries the product named', () => {
    expect(resolveCountryDisplayCurrency('EG')).toBe('EGP');
    expect(resolveCountryDisplayCurrency('US')).toBe('USD');
    expect(resolveCountryDisplayCurrency('GB')).toBe('GBP');
    expect(resolveCountryDisplayCurrency('AE')).toBe('AED');
    expect(resolveCountryDisplayCurrency('JP')).toBe('JPY');
    expect(resolveCountryDisplayCurrency('DE')).toBe('EUR');
  });

  it('gives every Eurozone member the euro', () => {
    for (const country of ['DE', 'FR', 'IT', 'ES', 'NL', 'IE', 'PT', 'AT', 'FI', 'HR']) {
      expect(resolveCountryDisplayCurrency(country)).toBe('EUR');
    }
  });

  it('handles a shared monetary union', () => {
    expect(resolveCountryDisplayCurrency('SN')).toBe('XOF');
    expect(resolveCountryDisplayCurrency('CI')).toBe('XOF');
    expect(resolveCountryDisplayCurrency('CM')).toBe('XAF');
  });

  it('gives a territory the currency it actually uses', () => {
    expect(resolveCountryDisplayCurrency('JE')).toBe('GBP');
    expect(resolveCountryDisplayCurrency('LI')).toBe('CHF');
    // Dollarized: USD is the right local answer, not a fallback.
    expect(resolveCountryDisplayCurrency('EC')).toBe('USD');
    expect(resolveCountryDisplayCurrency('PA')).toBe('USD');
  });

  it('accepts a lowercase code', () => {
    expect(resolveCountryDisplayCurrency('eg')).toBe('EGP');
    expect(resolveCountryDisplayCurrency(' de ')).toBe('EUR');
  });

  it('falls back to USD for unresolved, unknown and malformed codes', () => {
    // XX is Cloudflare saying it has no idea, T1 is a Tor exit node.
    for (const code of ['XX', 'T1', 'AP', 'EU', 'ZZ', '', '1', 'EGY', null]) {
      expect(resolveCountryDisplayCurrency(code)).toBe('USD');
    }
  });

  it('rejects an injection attempt as a country code', () => {
    expect(resolveCountryDisplayCurrency('EG DROP TABLE')).toBe('USD');
    expect(isValidCountryCode('../../etc/passwd')).toBe(false);
    expect(isValidCountryCode('XX')).toBe(false);
    expect(isValidCountryCode('eg')).toBe(true);
  });

  it('only ever maps to a currency it can display', () => {
    // A country pointing at a currency no provider quotes would render an
    // unformattable price rather than an honest USD one.
    for (const [country, currency] of Object.entries(COUNTRY_TO_DISPLAY_CURRENCY)) {
      expect(isValidCountryCode(country)).toBe(true);
      expect(SUPPORTED_DISPLAY_CURRENCIES[currency]).toBeDefined();
    }
  });
});
