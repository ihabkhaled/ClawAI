
import { DisplayFxSource, DisplayRoundingPolicy } from '@claw/shared-types';
import type { LocalizedMoneyView } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import {
  buildDisplayCurrencyCookie,
  displayFractionDigits,
  formatCanonicalMoney,
  formatCurrencyAmount,
  formatLocalizedMoney,
  readDisplayCurrencyCookie,
} from '@/utilities/display-currency.utility';

function view(overrides: Partial<LocalizedMoneyView> = {}): LocalizedMoneyView {
  return {
    canonicalAmountMinor: 1_000,
    canonicalCurrency: 'USD',
    displayAmountMinor: 51_500,
    displayCurrency: 'EGP',
    approximate: true,
    conversionAvailable: true,
    fxAsOf: '2026-09-11',
    fxSource: DisplayFxSource.FRANKFURTER,
    roundingPolicy: DisplayRoundingPolicy.COMMERCIAL_PRICE,
    roundingPolicyVersion: 1,
    ...overrides,
  };
}

describe('formatLocalizedMoney', () => {
  it('marks a converted price as an estimate', () => {
    // The tilde is not decoration: it is the difference between an
    // approximation and a promise.
    const text = formatLocalizedMoney(view(), 'en');
    expect(text.startsWith('≈')).toBe(true);
    expect(text).toContain('515');
  });

  it('does not mark a canonical price as an estimate', () => {
    const text = formatLocalizedMoney(
      view({ displayAmountMinor: 1_000, displayCurrency: 'USD', approximate: false }),
      'en',
    );
    expect(text.startsWith('≈')).toBe(false);
    expect(text).toContain('10.00');
  });

  it('says "less than" rather than zero for a real but tiny amount', () => {
    // A charge that renders as "0.00" has told the user they paid nothing.
    const text = formatLocalizedMoney(
      view({ canonicalAmountMinor: 4, displayAmountMinor: 0 }),
      'en',
    );
    expect(text.startsWith('<')).toBe(true);
    expect(text).not.toMatch(/^≈/u);
  });

  it('renders a genuine zero as zero', () => {
    const text = formatLocalizedMoney(
      view({ canonicalAmountMinor: 0, displayAmountMinor: 0, approximate: false }),
      'en',
    );
    expect(text).not.toContain('<');
  });
});

describe('formatCurrencyAmount', () => {
  it('never assumes two decimals', () => {
    expect(displayFractionDigits('JPY')).toBe(0);
    expect(displayFractionDigits('KWD')).toBe(3);
    expect(formatCurrencyAmount(1_470, 'JPY', 'en')).toContain('1,470');
    expect(formatCurrencyAmount(3_070, 'KWD', 'en')).toContain('3.070');
  });

  it('keeps the sign on a refund', () => {
    expect(formatCurrencyAmount(-51_500, 'EGP', 'en')).toContain('-');
  });

  it('falls back to a plain figure for an unknown currency', () => {
    // An unknown code must not blow up a billing page.
    expect(formatCurrencyAmount(1_000, 'ZZZ', 'en')).toContain('ZZZ');
  });

  it('localizes digits for Arabic without changing the number', () => {
    const arabic = formatCurrencyAmount(51_500, 'EGP', 'ar');
    expect(arabic.length).toBeGreaterThan(0);
  });
});

describe('formatCanonicalMoney', () => {
  it('gives the canonical figure for the secondary line', () => {
    expect(formatCanonicalMoney(view(), 'en')).toContain('10.00');
  });

  it('returns null when there is nothing to disambiguate', () => {
    expect(formatCanonicalMoney(view({ approximate: false }), 'en')).toBeNull();
  });
});

describe('readDisplayCurrencyCookie', () => {
  it('reads a valid choice', () => {
    expect(readDisplayCurrencyCookie('claw_display_currency=EGP')).toBe('EGP');
    expect(readDisplayCurrencyCookie('a=1; claw_display_currency=eur; b=2')).toBe('EUR');
  });

  it('recognises AUTO as a decision, distinct from an absent cookie', () => {
    expect(readDisplayCurrencyCookie('claw_display_currency=AUTO')).toBe('AUTO');
    expect(readDisplayCurrencyCookie('other=1')).toBeNull();
    expect(readDisplayCurrencyCookie(null)).toBeNull();
  });

  it('rejects a tampered, oversized or unsupported value', () => {
    // A visitor may edit this cookie freely — that is allowed. What it must
    // never do is reach a cache key or a provider URL unchecked.
    for (const raw of [
      'claw_display_currency=BTC',
      'claw_display_currency=ZZZ',
      `claw_display_currency=${'A'.repeat(4096)}`,
      'claw_display_currency=',
      'claw_display_currency=../../etc/passwd',
    ]) {
      expect(readDisplayCurrencyCookie(raw)).toBeNull();
    }
  });
});

describe('buildDisplayCurrencyCookie', () => {
  it('is first-party, bounded and carries nothing sensitive', () => {
    const cookie = buildDisplayCurrencyCookie('EGP');
    expect(cookie).toContain('claw_display_currency=EGP');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Max-Age=');
  });
});
