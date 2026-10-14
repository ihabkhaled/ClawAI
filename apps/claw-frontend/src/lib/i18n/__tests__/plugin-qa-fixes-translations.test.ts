import { describe, expect, it } from 'vitest';

import {
  ADMIN_CURATION_AUDIT_ACTION_KEYS,
  ADMIN_CURATION_AUDIT_TARGET_KEYS,
} from '@/constants/plugin-admin-curation.constants';
import { PLUGIN_IMPORT_ERROR_KEYS } from '@/constants/plugin-import.constants';
import { Locale } from '@/enums/locale.enum';
import { en } from '@/lib/i18n/locales/en';
import { PLUGIN_QA_FIXES_TRANSLATIONS } from '@/lib/i18n/locales/plugin-qa-fixes-translations';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';
import type { PluralForms } from '@/types/plugin-qa-fixes-i18n.types';
import { pluralText } from '@/utilities/plural-text.utility';

const GROUPS = ['items', 'files', 'tools', 'toolsOn', 'toolsSkipped', 'installs'] as const;
const LOCALES = Object.values(Locale);

function formsNeeded(locale: string): string[] {
  const needed = new Set<string>(['other']);
  for (let n = 0; n <= 200; n += 1) {
    needed.add(new Intl.PluralRules(locale).select(n));
  }
  return [...needed];
}

function leaves(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leaves(child, prefix === '' ? key : `${prefix}.${key}`),
  );
}

describe('plugin QA fixes translations', () => {
  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGIN_QA_FIXES_TRANSLATIONS).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)(
    '%s has every plural form its language needs, and {count} in the general form',
    (locale) => {
      for (const group of GROUPS) {
        const forms: PluralForms = PLUGIN_QA_FIXES_TRANSLATIONS[locale].count[group];
        for (const needed of formsNeeded(locale)) {
          expect(forms[needed as keyof PluralForms], `${locale}.${group}.${needed}`).toBeTruthy();
        }
        expect(forms.other, `${locale}.${group}.other`).toContain('{count}');
      }
    },
  );

  it.each(LOCALES)('%s keeps the same non-plural keys and placeholders as English', (locale) => {
    const english = PLUGIN_QA_FIXES_TRANSLATIONS[Locale.EN];
    const strip = (tree: unknown): string[] =>
      leaves(tree).filter((key) => !GROUPS.some((group) => key.startsWith(`count.${group}.`)));
    const own = PLUGIN_QA_FIXES_TRANSLATIONS[locale];
    expect(strip(own).sort()).toEqual(strip(english).sort());
    expect(own.count.summary).toContain('{items}');
    expect(own.count.summary).toContain('{files}');
    expect(own.errors.rateLimitedAt).toContain('{time}');
  });

  it('every audit action the service writes and every import error code resolves to text', () => {
    const lookups = [
      ...Object.values(ADMIN_CURATION_AUDIT_ACTION_KEYS),
      ...Object.values(ADMIN_CURATION_AUDIT_TARGET_KEYS),
      ...Object.values(PLUGIN_IMPORT_ERROR_KEYS),
    ];
    for (const key of lookups) {
      expect(resolveTranslation(en, key), key).not.toBe(key);
    }
  });
});

describe('pluralText', () => {
  const t = (key: string, params?: Record<string, string | number>): string =>
    resolveTranslation(en, key, params);

  it('says "1 item" and "2 items", not "1 items"', () => {
    expect(pluralText(t, 'en', 'pluginQa.count.items', 1)).toBe('1 item');
    expect(pluralText(t, 'en', 'pluginQa.count.items', 2)).toBe('2 items');
    expect(pluralText(t, 'en', 'pluginQa.count.items', 0)).toBe('0 items');
  });

  it('uses the six Arabic forms and the Russian ones from the same dictionary shape', () => {
    const ar = (key: string, params?: Record<string, string | number>): string =>
      resolveTranslation(
        {
          pluginQa: { count: { files: PLUGIN_QA_FIXES_TRANSLATIONS[Locale.AR].count.files } },
        } as never,
        key,
        params,
      );
    expect(pluralText(ar, 'ar', 'pluginQa.count.files', 1)).toBe('1 ملف');
    expect(pluralText(ar, 'ar', 'pluginQa.count.files', 2)).toBe('2 ملفان');
    expect(pluralText(ar, 'ar', 'pluginQa.count.files', 5)).toBe('5 ملفات');
    expect(pluralText(ar, 'ar', 'pluginQa.count.files', 11)).toBe('11 ملفًا');
  });
});
