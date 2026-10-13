import { containsHostileText } from '../contains-hostile-text.utility';

describe('containsHostileText', () => {
  it('accepts ordinary multilingual text', () => {
    expect(containsHostileText('Weather - Météo - 天気 - الطقس', false)).toBe(false);
  });

  it('allows the Persian zero-width non-joiner', () => {
    expect(containsHostileText('آب\u200Cوهوا', false)).toBe(false);
  });

  it('rejects controls, zero-width spaces, bidi marks and isolates', () => {
    for (const text of [
      'a\u0000b',
      'a\u0007b',
      'a\u007Fb',
      'a\u009Fb',
      'a\u200Bb',
      'a\u200Eb',
      'a\u202Eb',
      'a\u2066b',
      'a\u2060b',
      'a\uFEFFb',
    ]) {
      expect(containsHostileText(text, true)).toBe(true);
    }
  });

  it('allows tab and newline only when line breaks are allowed', () => {
    expect(containsHostileText('a\nb\tc', true)).toBe(false);
    expect(containsHostileText('a\nb', false)).toBe(true);
    expect(containsHostileText('a\tb', false)).toBe(true);
  });

  it('always rejects the unicode line and paragraph separators', () => {
    expect(containsHostileText('a\u2028b', true)).toBe(true);
    expect(containsHostileText('a\u2029b', true)).toBe(true);
  });

  it.each([
    ['tag block start', '\u{E0000}'],
    ['tag latin letter', '\u{E0041}'],
    ['tag block end', '\u{E007F}'],
    ['variation selector 1', '\uFE00'],
    ['variation selector 16', '\uFE0F'],
    ['variation selector 17', '\u{E0100}'],
    ['variation selector 256', '\u{E01EF}'],
    ['inhibit symmetric swapping', '\u206A'],
    ['nominal digit shapes', '\u206F'],
    ['arabic letter mark', '\u061C'],
    ['soft hyphen', '\u00AD'],
    ['combining grapheme joiner', '\u034F'],
    ['mongolian vowel separator', '\u180E'],
    ['hangul filler', '\u3164'],
    ['interlinear annotation anchor', '\uFFF9'],
    ['interlinear annotation separator', '\uFFFA'],
    ['interlinear annotation terminator', '\uFFFB'],
  ])('rejects %s', (_label, char) => {
    expect(containsHostileText(`a${char}b`, true)).toBe(true);
    expect(containsHostileText(`a${char}b`, false)).toBe(true);
  });

  it.each([
    '\u00AC',
    '\u00AE',
    '\u061B',
    '\u061D',
    '\uFDFF',
    '\uFFF8',
    '\uFFFC',
    '\u{DFFFF}',
    '\u{E01F0}',
  ])('accepts the neighbouring code point %j just outside the ranges', (char) => {
    expect(containsHostileText(`a${char}b`, true)).toBe(false);
  });
});
