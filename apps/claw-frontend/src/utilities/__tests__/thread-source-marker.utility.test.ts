import { describe, expect, it } from 'vitest';

import { stripUnresolvedSourceMarkers } from '../thread-source-marker.utility';

describe('stripUnresolvedSourceMarkers', () => {
  it('removes a single hex marker', () => {
    expect(stripUnresolvedSourceMarkers('النص [2f25f199712eec3d] هنا')).toBe('النص هنا');
  });

  it('removes doubled, comma and nested marker lists', () => {
    expect(stripUnresolvedSourceMarkers('a [[2f25f199712eec3d]] b')).toBe('a b');
    expect(stripUnresolvedSourceMarkers('a [2f25f199712eec3d, b9e5088333f64bee] b')).toBe('a b');
    expect(stripUnresolvedSourceMarkers('a [[2f25f199712eec3d], [b9e5088333f64bee]] b')).toBe(
      'a b',
    );
  });

  it('keeps numbered citations and ordinary bracketed text', () => {
    const text = 'see [1] and [2, 3] and [note] and [abc] and [12345]';
    expect(stripUnresolvedSourceMarkers(text)).toBe(text);
  });

  it('keeps a run that mixes an id with other text', () => {
    expect(stripUnresolvedSourceMarkers('x [2f25f199712eec3d, 7] y')).toBe(
      'x [2f25f199712eec3d, 7] y',
    );
  });

  it('is linear on a body of unclosed brackets', () => {
    const body = '['.repeat(50_000);
    const started = Date.now();
    expect(stripUnresolvedSourceMarkers(body)).toBe(body);
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  it('removes ids written with Arabic-Indic digits and direction marks', () => {
    expect(stripUnresolvedSourceMarkers('النص [‏a٥٥٠٥c٤١٨٦٩٩ab٦٨‏] هنا')).toBe('النص هنا');
    expect(stripUnresolvedSourceMarkers('متن [۰۱۲۳۴۵۶۷۸۹abcdef] پایان')).toBe('متن پایان');
  });

  it('removes ids in CJK and full-width brackets and keeps the surrounding text', () => {
    expect(stripUnresolvedSourceMarkers('事実【a5505c418699ab68】です。')).toBe('事実です。');
    expect(stripUnresolvedSourceMarkers('事実［２ｆ２５ｆ１９９７１２ｅｅｃ３ｄ］です。')).toBe(
      '事実です。',
    );
    expect(stripUnresolvedSourceMarkers('Список [a5505c418699ab68，2f25f199712eec3d] конец')).toBe(
      'Список конец',
    );
  });

  it('unwraps a bracketed address but leaves markdown links alone', () => {
    expect(stripUnresolvedSourceMarkers('См. [https://x.test/a] далее')).toBe(
      'См. https://x.test/a далее',
    );
    const link = 'A [https://x.test](https://x.test) link';
    expect(stripUnresolvedSourceMarkers(link)).toBe(link);
  });

  it('keeps local-digit numbers that are not ids', () => {
    expect(stripUnresolvedSourceMarkers('see [٢] and [۳, ۴]')).toBe('see [٢] and [۳, ۴]');
  });

  it('stays linear on bracket-and-address spam', () => {
    const started = Date.now();
    stripUnresolvedSourceMarkers('[https://a'.repeat(50_000));
    stripUnresolvedSourceMarkers('[a'.repeat(100_000));
    expect(Date.now() - started).toBeLessThan(1_500);
  });
});
