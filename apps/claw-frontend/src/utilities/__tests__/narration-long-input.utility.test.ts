import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { NarrationKind } from '@/enums/narration-kind.enum';
import { getTranslation } from '@/lib/i18n/translations';
import type { NarrationEntry, NarrationParams } from '@/types/narration.types';
import { describeNarrationEntry } from '@/utilities/narration.utility';

const translator =
  (locale: Locale) =>
  (key: string, params?: Record<string, string | number>): string =>
    getTranslation(locale, key, params);

const entry = (kind: NarrationKind, params: NarrationParams): NarrationEntry => ({
  id: `${kind}-1`,
  kind,
  at: '2026-11-28T10:00:00.000Z',
  params,
});

describe('reading a big file and writing a long answer (ADR-231)', () => {
  const en = translator(Locale.EN);

  it('says it is reading, how far it got, and that it read everything', () => {
    expect(
      describeNarrationEntry(
        entry(NarrationKind.LONG_INPUT, { name: 'big.txt', parts: 12, done: 0 }),
        en,
      ),
    ).toBe('Reading all 12 parts of big.txt');
    expect(
      describeNarrationEntry(
        entry(NarrationKind.LONG_INPUT, { name: 'big.txt', parts: 120, done: 30 }),
        en,
      ),
    ).toBe('Read 30 of 120 parts of big.txt');
    expect(
      describeNarrationEntry(
        entry(NarrationKind.LONG_INPUT, { name: 'big.txt', parts: 12, done: 12 }),
        en,
      ),
    ).toBe('Read all 12 parts of big.txt');
    expect(describeNarrationEntry(entry(NarrationKind.LONG_OUTPUT, { part: 3 }), en)).toBe(
      'The answer is long — writing part 3',
    );
  });

  it.each(Object.values(Locale))(
    'has every line in %s, with no raw key or placeholder',
    (locale) => {
      const t = translator(locale);
      for (const value of [
        describeNarrationEntry(
          entry(NarrationKind.LONG_INPUT, { name: 'f.txt', parts: 9, done: 0 }),
          t,
          locale,
        ),
        describeNarrationEntry(
          entry(NarrationKind.LONG_INPUT, { name: 'f.txt', parts: 9, done: 3 }),
          t,
          locale,
        ),
        describeNarrationEntry(
          entry(NarrationKind.LONG_INPUT, { name: 'f.txt', parts: 9, done: 9 }),
          t,
          locale,
        ),
        describeNarrationEntry(entry(NarrationKind.LONG_OUTPUT, { part: 2 }), t, locale),
      ]) {
        expect(value).not.toMatch(/narration\.|\{[a-z]+\}/u);
        expect(value.length).toBeGreaterThan(3);
      }
    },
  );
});
