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
});
