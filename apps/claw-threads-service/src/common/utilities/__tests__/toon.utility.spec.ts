import { decodeToon, encodeVerifiedToon } from '../toon.utility';

const roundTrip = (value: unknown): unknown => decodeToon(encodeVerifiedToon(value));

describe('toon utility', () => {
  it('round-trips a publication export', () => {
    const value = {
      title: 'Local-first AI',
      markdown: '# Heading\n\nParagraph with a `code` span.',
      citations: [{ url: 'https://example.org/a' }, { url: 'https://example.org/b?x=1&y=2' }],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it('keeps code blocks, tables, tabs and newlines exactly', () => {
    const markdown = [
      '```ts',
      'const a = { b: 1 };',
      '```',
      '',
      '| a | b |',
      '| - | - |',
      '| 1\t| 2 |',
    ].join('\n');
    expect(roundTrip({ markdown })).toEqual({ markdown });
  });

  it('keeps Arabic, emoji and combining characters', () => {
    const value = {
      markdown: 'مرحبا بالعالم 👩‍💻 ✓ café',
      citations: [{ url: 'https://example.org/ع' }],
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it('keeps values that look like TOON syntax or other types', () => {
    const value = {
      markdown: 'true',
      title: 'null',
      other: '123',
      delimiter: 'a,b',
      colon: 'k: v',
    };
    expect(roundTrip(value)).toEqual(value);
  });

  it('round-trips a very large article', () => {
    const markdown = Array.from(
      { length: 4000 },
      (_, i) => `Line ${String(i)}, with "quotes" & more`,
    ).join('\n');
    expect(roundTrip({ markdown, citations: [] })).toEqual({ markdown, citations: [] });
  });

  it('is deterministic', () => {
    const value = { title: 't', markdown: 'm', citations: [{ url: 'https://example.org' }] };
    expect(encodeVerifiedToon(value)).toBe(encodeVerifiedToon(structuredClone(value)));
  });

  it('is smaller than the JSON for a list of citations', () => {
    const value = {
      citations: Array.from({ length: 20 }, (_, i) => ({
        url: `https://example.org/${String(i)}`,
      })),
    };
    expect(encodeVerifiedToon(value).length).toBeLessThan(JSON.stringify(value).length);
  });
});
