import { describe, expect, it } from 'vitest';

import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { pt } from '@/lib/i18n/locales/pt';

describe.each([
  ['German', de],
  ['Spanish', es],
  ['Portuguese', pt],
] as const)('%s translation regressions', (_name, locale) => {
  it('does not fall back to English on the audited workspace surfaces', () => {
    expect(locale.inbox.page.description).not.toBe(en.inbox.page.description);
    expect(locale.search.page.placeholder).not.toBe(en.search.page.placeholder);
    expect(locale.implHandoff.page.description).not.toBe(en.implHandoff.page.description);
    expect(locale.learned.panel.description).not.toBe(en.learned.panel.description);
  });
});

describe('Italian translation regressions', () => {
  it('does not leave the audited architecture label in English', () => {
    expect(itLocale.marketing.architecturePage.events.topicName).not.toBe(
      en.marketing.architecturePage.events.topicName,
    );
  });
});
