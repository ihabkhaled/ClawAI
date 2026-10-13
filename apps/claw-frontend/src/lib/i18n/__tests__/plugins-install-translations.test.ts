import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';

import { PLUGINS_INSTALL_TRANSLATIONS } from '../locales/plugins-install-translations';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix.length > 0 ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      out[path] = value;
    } else {
      Object.assign(out, flatten(value, path));
    }
  }
  return out;
}

const PLACEHOLDER = /\{[a-zA-Z]+\}/g;
const english = flatten(PLUGINS_INSTALL_TRANSLATIONS[Locale.EN]);
const locales = Object.values(Locale);

describe('PLUGINS_INSTALL_TRANSLATIONS', () => {
  it('covers all 13 locales', () => {
    expect(locales).toHaveLength(13);
    expect(Object.keys(PLUGINS_INSTALL_TRANSLATIONS).sort()).toEqual([...locales].sort());
  });

  it.each(locales)('%s has exactly the English keys, none empty', (locale) => {
    const flat = flatten(PLUGINS_INSTALL_TRANSLATIONS[locale]);
    expect(Object.keys(flat).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(flat)) {
      expect(value.trim().length, `${locale}.${key}`).toBeGreaterThan(0);
    }
  });

  it.each(locales)('%s keeps every placeholder of the English text', (locale) => {
    const flat = flatten(PLUGINS_INSTALL_TRANSLATIONS[locale]);
    for (const [key, text] of Object.entries(english)) {
      const wanted = (text.match(PLACEHOLDER) ?? []).sort();
      const got = (flat[key]?.match(PLACEHOLDER) ?? []).sort();
      expect(got, `${locale}.${key}`).toEqual(wanted);
    }
  });

  it.each(locales.filter((locale) => locale !== Locale.EN))(
    '%s is translated, not a copy of English',
    (locale) => {
      const flat = flatten(PLUGINS_INSTALL_TRANSLATIONS[locale]);
      const same = Object.keys(english).filter((key) => flat[key] === english[key]);
      // Short words such as "Plugins" or "API" may legitimately match; a whole copy may not.
      expect(same.length).toBeLessThan(Object.keys(english).length / 5);
    },
  );
});
