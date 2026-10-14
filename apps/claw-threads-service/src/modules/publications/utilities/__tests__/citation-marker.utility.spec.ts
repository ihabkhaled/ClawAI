import { resolveCitationMarkers } from '../citation-marker.utility';

const citations = [
  { evidenceId: 'a5505c418699ab68', url: 'https://example.com/one' },
  { evidenceId: '2f25f199712eec3d', url: 'https://example.org/two/' },
];

describe('resolveCitationMarkers (ADR-183)', () => {
  it('turns known ids into their citation number, single and in lists', () => {
    expect(resolveCitationMarkers('Fact [a5505c418699ab68] and more.', citations)).toBe(
      'Fact [1] and more.',
    );
    expect(resolveCitationMarkers('Both [a5505c418699ab68, 2f25f199712eec3d].', citations)).toBe(
      'Both [1, 2].',
    );
    expect(
      resolveCitationMarkers('Nested [[2f25f199712eec3d], [a5505c418699ab68]].', citations),
    ).toBe('Nested [1, 2].');
  });

  it('removes an unresolved internal id and keeps one space', () => {
    expect(resolveCitationMarkers('Claim [0123456789abcdef] here.', citations)).toBe('Claim here.');
    expect(resolveCitationMarkers('Claim[0123456789abcdef].', citations)).toBe('Claim.');
  });

  it('keeps numbered citations and ordinary bracketed text', () => {
    const text = 'See [1], [٢], [note] and [decade] in [Appendix A].';
    expect(resolveCitationMarkers(text, citations)).toBe(text);
  });

  it('resolves ids written with Arabic-Indic digits and invisible direction marks', () => {
    const arabicId = '‏a٥٥٠٥c٤١٨٦٩٩ab٦٨‏';
    expect(resolveCitationMarkers(`النص [${arabicId}] تتمة`, citations)).toBe('النص [1] تتمة');
    const persianUnknown = '[۰۱۲۳۴۵۶۷۸۹abcdef]';
    expect(resolveCitationMarkers(`متن ${persianUnknown} پایان`, citations)).toBe('متن پایان');
  });

  it('handles full-width and CJK brackets', () => {
    expect(resolveCitationMarkers('事実【a5505c418699ab68】です。', citations)).toBe(
      '事実[1]です。',
    );
    expect(
      resolveCitationMarkers('事実［２ｆ２５ｆ１９９７１２ｅｅｃ３ｄ］です。', citations),
    ).toBe('事実[2]です。');
    expect(resolveCitationMarkers('事実〔0123456789abcdef〕です。', citations)).toBe('事実です。');
    expect(resolveCitationMarkers('Список [a5505c418699ab68，2f25f199712eec3d]', citations)).toBe(
      'Список [1, 2]',
    );
  });

  it('turns a bracketed known address into its number and unwraps any other', () => {
    expect(resolveCitationMarkers('Source [https://example.org/two] ok', citations)).toBe(
      'Source [2] ok',
    );
    expect(resolveCitationMarkers('Source [https://elsewhere.test/x] ok', citations)).toBe(
      'Source https://elsewhere.test/x ok',
    );
  });

  it('leaves markdown links alone', () => {
    const text =
      'A [https://example.com/one](https://example.com/one) link and [label](https://x.test).';
    expect(resolveCitationMarkers(text, citations)).toBe(text);
  });

  it('is linear on hostile input', () => {
    const started = Date.now();
    resolveCitationMarkers('['.repeat(200_000), citations);
    resolveCitationMarkers('[https://a'.repeat(50_000), citations);
    resolveCitationMarkers('[a'.repeat(100_000), citations);
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it('does not touch text without markers, including code spacing', () => {
    const text = 'plain\n\n    indented  code   here\n';
    expect(resolveCitationMarkers(text, citations)).toBe(text);
  });
});
