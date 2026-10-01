import {
  cleanEmail,
  cleanMultiLine,
  cleanSingleLine,
  deriveTitle,
  stripControlCharacters,
} from '../feedback-text.utility';

const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);

describe('stripControlCharacters', () => {
  it('removes NUL and other control characters', () => {
    expect(stripControlCharacters(`a${NUL}b${BEL}c`, false)).toBe('abc');
  });

  it('keeps line breaks only when asked', () => {
    expect(stripControlCharacters('a\nb\tc', true)).toBe('a\nb\tc');
    expect(stripControlCharacters('a\nb\tc', false)).toBe('abc');
  });
});

describe('cleaners', () => {
  it('cleanSingleLine collapses whitespace and trims', () => {
    expect(cleanSingleLine(`  Ada${NUL}   Lovelace \n`)).toBe('Ada Lovelace');
  });

  it('cleanMultiLine keeps paragraphs', () => {
    expect(cleanMultiLine(`  one${NUL}\n\ntwo  `)).toBe('one\n\ntwo');
  });

  it('cleanEmail lowercases and trims', () => {
    expect(cleanEmail(`  Ada@Example.COM${NUL} `)).toBe('ada@example.com');
  });
});

describe('deriveTitle', () => {
  it('keeps a short message whole', () => {
    expect(deriveTitle('Short one', 80)).toBe('Short one');
  });

  it('truncates a long message with an ellipsis within the limit', () => {
    const title = deriveTitle('word '.repeat(60), 80);
    expect(title.length).toBeLessThanOrEqual(80);
    expect(title.endsWith('…')).toBe(true);
  });

  it('flattens a multi-line message to one line', () => {
    expect(deriveTitle('line one\nline two', 80)).toBe('line one line two');
  });
});
