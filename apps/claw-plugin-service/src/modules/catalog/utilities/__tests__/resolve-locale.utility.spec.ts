import { Locale } from '@claw/shared-types';

import { parseAcceptLanguage, resolveLocale } from '../resolve-locale.utility';

describe('parseAcceptLanguage', () => {
  it.each([
    ['ar', Locale.AR],
    ['fr-CA', Locale.FR],
    ['pt-BR,pt;q=0.9', Locale.PT],
    ['zh-Hans-CN', Locale.ZH],
    ['FA', Locale.FA],
  ])('maps %s to %s', (header, expected) => {
    expect(parseAcceptLanguage(header)).toBe(expected);
  });

  it('prefers the highest q-value, then the earliest entry', () => {
    expect(parseAcceptLanguage('de;q=0.4, ja;q=0.9, es;q=0.9')).toBe(Locale.JA);
  });

  it('skips unsupported tags and wildcards', () => {
    expect(parseAcceptLanguage('sv, nl;q=0.8, *;q=0.1, hi;q=0.5')).toBe(Locale.HI);
  });

  it('ignores q=0 entries and malformed q-values', () => {
    expect(parseAcceptLanguage('de;q=0, it;q=abc')).toBeUndefined();
    expect(parseAcceptLanguage('de;q=0, ru;q=0.1')).toBe(Locale.RU);
  });

  it('returns undefined for empty, missing or unsupported input', () => {
    expect(parseAcceptLanguage(undefined)).toBeUndefined();
    expect(parseAcceptLanguage('')).toBeUndefined();
    expect(parseAcceptLanguage('xx-YY')).toBeUndefined();
    expect(parseAcceptLanguage(',,;;;==')).toBeUndefined();
  });

  it('bounds hostile headers by length and entry count', () => {
    const manyUnsupported = `${Array.from({ length: 40 }, () => 'xx').join(',')},de`;
    expect(parseAcceptLanguage(manyUnsupported)).toBeUndefined();
    expect(parseAcceptLanguage(`${'x'.repeat(600)},de`)).toBeUndefined();
  });
});

describe('resolveLocale', () => {
  it('lets an explicit locale win over the header', () => {
    expect(resolveLocale(Locale.TH, 'de')).toBe(Locale.TH);
  });

  it('uses the header, then falls back to English', () => {
    expect(resolveLocale(undefined, 'it-IT')).toBe(Locale.IT);
    expect(resolveLocale(undefined, 'xx')).toBe(Locale.EN);
    expect(resolveLocale(undefined)).toBe(Locale.EN);
  });
});
