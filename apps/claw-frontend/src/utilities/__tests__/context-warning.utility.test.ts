import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { NarrationKind } from '@/enums/narration-kind.enum';
import { getTranslation } from '@/lib/i18n/translations';
import type { NarrationEntry } from '@/types/narration.types';
import {
  describeContextWarning,
  describeContextWarnings,
} from '@/utilities/context-warning.utility';
import { describeNarrationEntry } from '@/utilities/narration.utility';

const LOCALES: Locale[] = [Locale.EN, Locale.AR];

const translator =
  (locale: Locale) =>
  (key: string, params?: Record<string, string | number>): string =>
    getTranslation(locale, key, params);

const searchDone = (params?: NarrationEntry['params']): NarrationEntry => ({
  id: 'e1',
  kind: NarrationKind.SEARCH_DONE,
  at: '2026-10-31T10:00:00.000Z',
  params,
});

describe.each(LOCALES)('context warnings and search narration (%s)', (locale) => {
  const t = translator(locale);

  it('translates a warning key and drops the :KIND suffix', () => {
    const plain = getTranslation(locale, 'research.searchFailed');
    expect(plain).not.toBe('research.searchFailed');
    expect(describeContextWarning('research.searchFailed:EXCEPTION', t)).toBe(plain);
  });

  it('translates a warning key without a suffix', () => {
    const text = getTranslation(locale, 'research.searchTimedOut');
    expect(text).not.toBe('research.searchTimedOut');
    expect(describeContextWarning('research.searchTimedOut', t)).toBe(text);
  });

  it('shows an unknown warning as received', () => {
    expect(describeContextWarning('research.somethingNew:X', t)).toBe('research.somethingNew:X');
    expect(describeContextWarning('Token budget nearly full', t)).toBe('Token budget nearly full');
  });

  it('joins several warnings', () => {
    expect(describeContextWarnings(['research.searchTimedOut', 'plain'], t)).toBe(
      `${getTranslation(locale, 'research.searchTimedOut')}; plain`,
    );
  });

  it('names the providers when the narration carries them', () => {
    const line = describeNarrationEntry(searchDone({ providers: 'Brave, Tavily', count: 4 }), t);
    expect(line).toContain('Brave, Tavily');
    expect(line).toContain('4');
    expect(line).not.toContain('{');
    expect(line).not.toBe(describeNarrationEntry(searchDone({ count: 4 }), t));
  });

  it('keeps the plain line when an older server omits providers', () => {
    const line = describeNarrationEntry(searchDone({ count: 4 }), t);
    expect(line).toBe(getTranslation(locale, 'narration.searchDone', { count: 4 }));
  });
});
