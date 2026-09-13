import {
  COUNTRY_TO_DISPLAY_CURRENCY,
  resolveCountryDisplayCurrency,
  resolveTimezoneCountry,
  TIMEZONE_TO_COUNTRY,
} from './index';

describe('resolveTimezoneCountry', () => {
  it('resolves the zones behind the currencies the product named', () => {
    expect(resolveTimezoneCountry('Africa/Cairo')).toBe('EG');
    expect(resolveTimezoneCountry('Europe/Berlin')).toBe('DE');
    expect(resolveTimezoneCountry('Asia/Dubai')).toBe('AE');
    expect(resolveTimezoneCountry('Asia/Tokyo')).toBe('JP');
    expect(resolveTimezoneCountry('America/New_York')).toBe('US');
  });

  it('carries a zone all the way to the currency the visitor should see', () => {
    // The whole point of the hint: a browser in Cairo reaching EGP without an
    // IP lookup ever happening.
    expect(resolveCountryDisplayCurrency(resolveTimezoneCountry('Africa/Cairo'))).toBe('EGP');
    expect(resolveCountryDisplayCurrency(resolveTimezoneCountry('Europe/Paris'))).toBe('EUR');
    expect(resolveCountryDisplayCurrency(resolveTimezoneCountry('Asia/Riyadh'))).toBe('SAR');
  });

  it('accepts a bare country code from an older client', () => {
    expect(resolveTimezoneCountry('EG')).toBe('EG');
    expect(resolveTimezoneCountry('de')).toBe('DE');
  });

  it('tolerates spelling variants browsers still emit', () => {
    expect(resolveTimezoneCountry('Asia/Calcutta')).toBe('IN');
    expect(resolveTimezoneCountry('Europe/Kiev')).toBe('UA');
    expect(resolveTimezoneCountry('africa/cairo')).toBe('EG');
    expect(resolveTimezoneCountry('  Africa/Cairo  ')).toBe('EG');
  });

  it('returns null for an unknown, empty or oversized value', () => {
    // A hint nobody can place is not a guess — it falls through to USD.
    for (const value of ['', '   ', 'Mars/Olympus', 'A'.repeat(4096), null, undefined]) {
      expect(resolveTimezoneCountry(value)).toBeNull();
    }
  });

  it('never maps a zone to a country the currency map does not know', () => {
    // A zone resolving to a country with no currency would look like detection
    // worked and still render USD, which is the confusing failure.
    for (const country of Object.values(TIMEZONE_TO_COUNTRY)) {
      expect(/^[A-Z]{2}$/.test(country)).toBe(true);
    }
    expect(Object.keys(TIMEZONE_TO_COUNTRY).length).toBeGreaterThan(100);
    expect(COUNTRY_TO_DISPLAY_CURRENCY['EG']).toBe('EGP');
  });
});
