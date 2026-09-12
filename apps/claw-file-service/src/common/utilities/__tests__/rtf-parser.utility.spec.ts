import { extractTextFromRtf } from '../rtf-parser.utility';

const rtf = (body: string): Buffer => Buffer.from(body, 'latin1');

describe('rtf-parser.utility', () => {
  it('returns the prose without the control words around it', () => {
    const text = extractTextFromRtf(
      rtf(String.raw`{\rtf1\ansi\deff0{\fonttbl{\f0 Times;}}\f0\fs24 Hello world}`),
    );

    expect(text).toBe('Hello world');
  });

  it('drops the font table rather than leaking font names into the prompt', () => {
    const text = extractTextFromRtf(
      rtf(String.raw`{\rtf1{\fonttbl{\f0\froman Times New Roman;}{\f1 Arial;}}Body text}`),
    );

    expect(text).toBe('Body text');
    expect(text).not.toContain('Arial');
  });

  it('drops the colour table', () => {
    const text = extractTextFromRtf(
      rtf(String.raw`{\rtf1{\colortbl;\red255\green0\blue0;}Visible}`),
    );

    expect(text).toBe('Visible');
  });

  it('turns \\par into a line break', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 First\par Second}`));

    expect(text.split('\n')).toEqual(['First', 'Second']);
  });

  it('renders escaped braces as literal characters', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 a \{b\} c}`));

    expect(text).toBe('a {b} c');
  });

  it('decodes a hex-escaped byte', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 caf\'e9}`));

    expect(text).toBe('café');
  });

  it('decodes a unicode escape and swallows its fallback character', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 \u233?tude}`));

    expect(text).toBe('étude');
  });

  it('swallows a hex fallback that follows a unicode escape', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 \u233\'e9tude}`));

    expect(text).toBe('étude');
  });

  it('ignores an ignorable extension destination', () => {
    const text = extractTextFromRtf(
      rtf(String.raw`{\rtf1 {\*\generator Riched20 10.0;}Real content}`),
    );

    expect(text).toBe('Real content');
  });

  it('restores normal output after a skipped group closes', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 before {\fonttbl{\f0 Times;}} after}`));

    expect(text).toContain('before');
    expect(text).toContain('after');
  });

  it('replaces typographic control words with their characters', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 a\emdash b\bullet c}`));

    expect(text).toBe('a—b•c');
  });

  it('collapses runs of blank lines', () => {
    const text = extractTextFromRtf(rtf(String.raw`{\rtf1 a\par\par\par\par b}`));

    expect(text).toBe('a\n\nb');
  });

  it('ignores raw newlines in the source, which are layout not content', () => {
    const text = extractTextFromRtf(rtf('{\\rtf1 one\r\ntwo}'));

    expect(text).toBe('onetwo');
  });

  it('returns an empty string for an empty document rather than throwing', () => {
    expect(extractTextFromRtf(rtf(String.raw`{\rtf1\ansi}`))).toBe('');
  });

  it('does not throw on a truncated control sequence at end of buffer', () => {
    expect(() => extractTextFromRtf(rtf('{\\rtf1 text\\'))).not.toThrow();
  });
});
