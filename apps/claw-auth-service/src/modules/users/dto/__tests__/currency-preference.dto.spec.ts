import { CurrencyPreferenceMode, UserLanguagePreference } from '../../../../generated/prisma';
import { updatePreferencesSchema } from '../update-preferences.dto';

describe('updatePreferencesSchema - display currency', () => {
  it('accepts a MANUAL selection with a country and a currency', () => {
    const result = updatePreferencesSchema.safeParse({
      currencyPreferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCountryCode: 'EG',
      preferredCurrencyCode: 'EGP',
    });

    expect(result.success).toBe(true);
  });

  it('normalizes case and whitespace', () => {
    const result = updatePreferencesSchema.safeParse({
      preferredCountryCode: ' eg ',
      preferredCurrencyCode: ' egp ',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferredCountryCode).toBe('EG');
      expect(result.data.preferredCurrencyCode).toBe('EGP');
    }
  });

  it('lets a user switch back to AUTO while keeping what they had chosen', () => {
    // Clearing the stored choice on every switch would mean toggling AUTO off
    // and on again silently forgets it.
    const result = updatePreferencesSchema.safeParse({
      currencyPreferenceMode: CurrencyPreferenceMode.AUTO,
    });

    expect(result.success).toBe(true);
  });

  it('distinguishes clearing a value from leaving it alone', () => {
    const cleared = updatePreferencesSchema.safeParse({ preferredCountryCode: null });
    expect(cleared.success).toBe(true);
    if (cleared.success) {
      expect(cleared.data.preferredCountryCode).toBeNull();
      expect(cleared.data.preferredCurrencyCode).toBeUndefined();
    }
  });

  it('rejects MANUAL that explicitly clears its own currency', () => {
    const result = updatePreferencesSchema.safeParse({
      currencyPreferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCurrencyCode: null,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a currency ClawAI cannot display', () => {
    for (const code of ['BTC', 'ETH', 'XAU', 'ZZZ', 'ZWL']) {
      const result = updatePreferencesSchema.safeParse({ preferredCurrencyCode: code });
      expect(result.success).toBe(false);
    }
  });

  it('rejects a malformed or oversized currency', () => {
    for (const code of ['', 'US', 'USDD', 'A'.repeat(4096), '<script>', 123, {}]) {
      const result = updatePreferencesSchema.safeParse({ preferredCurrencyCode: code });
      expect(result.success).toBe(false);
    }
  });

  it('rejects a malformed country, including the unresolved markers', () => {
    for (const code of ['', 'E', 'EGY', 'XX', 'T1', '../..', 'A'.repeat(4096), 1]) {
      const result = updatePreferencesSchema.safeParse({ preferredCountryCode: code });
      expect(result.success).toBe(false);
    }
  });

  it('still requires at least one preference', () => {
    expect(updatePreferencesSchema.safeParse({}).success).toBe(false);
  });

  it('does not couple currency to UI language', () => {
    // Arabic is not EGP. English is not USD.
    const result = updatePreferencesSchema.safeParse({
      languagePreference: UserLanguagePreference.AR,
      preferredCurrencyCode: 'USD',
    });

    expect(result.success).toBe(true);
  });
});
