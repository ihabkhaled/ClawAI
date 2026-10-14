import { UserNotificationKind } from '@claw/shared-types';
import { describe, expect, it } from 'vitest';

import { NOTIFICATION_TEXT_KEYS } from '@/constants/notifications.constants';
import { Locale } from '@/enums/locale.enum';

import { NOTIFICATIONS_TRANSLATIONS } from '../locales/notifications-translations';
import { PLUGINS_ADMIN_CATALOG_TRANSLATIONS } from '../locales/plugins-admin-catalog-translations';

type Tree = { [key: string]: string | Tree };

function leaves(tree: Tree, prefix = ''): Array<[string, string]> {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : leaves(value, `${prefix}${key}.`),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

const ENGLISH = leaves(PLUGINS_ADMIN_CATALOG_TRANSLATIONS[Locale.EN] as unknown as Tree);
const OTHER_LOCALES = Object.values(Locale).filter((locale) => locale !== Locale.EN);
/** Short words that are the same in several languages (Transport, Host, Slug ...). */
const COGNATE_LIMIT = 10;
const LONG_TEXT = 30;

describe('catalog curation translations', () => {
  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGINS_ADMIN_CATALOG_TRANSLATIONS).sort()).toEqual(
      Object.values(Locale).sort(),
    );
  });

  it.each(OTHER_LOCALES)(
    '%s has every key, keeps every placeholder and is translated',
    (locale) => {
      const translated = new Map(
        leaves(PLUGINS_ADMIN_CATALOG_TRANSLATIONS[locale] as unknown as Tree),
      );
      const sameAsEnglish: string[] = [];
      expect(translated.size).toBe(ENGLISH.length);
      for (const [key, english] of ENGLISH) {
        const text = translated.get(key) ?? '';
        expect(text.trim().length, `${locale}: ${key} is empty`).toBeGreaterThan(0);
        expect(placeholders(text), `${locale}: ${key} placeholders`).toEqual(placeholders(english));
        if (text === english) {
          sameAsEnglish.push(key);
          expect(english.length, `${locale}: ${key} is still English`).toBeLessThan(LONG_TEXT);
        }
      }
      expect(sameAsEnglish.length, `${locale}: ${sameAsEnglish.join(', ')}`).toBeLessThanOrEqual(
        COGNATE_LIMIT,
      );
    },
  );
});

describe('MCP server decision notifications', () => {
  it('points both kinds at keys every locale has', () => {
    for (const kind of [
      UserNotificationKind.MCP_SERVER_APPROVED,
      UserNotificationKind.MCP_SERVER_REJECTED,
    ]) {
      const keys = NOTIFICATION_TEXT_KEYS[kind];
      expect(keys.titleKey).toBe(`notifications.kinds.${kind}.title`);
      expect(keys.bodyKey).toBe(`notifications.kinds.${kind}.body`);
      for (const locale of Object.values(Locale)) {
        const text = NOTIFICATIONS_TRANSLATIONS[locale].kinds[kind];
        expect(text.title.trim().length, `${locale}: ${kind} title`).toBeGreaterThan(0);
        expect(text.body.trim().length, `${locale}: ${kind} body`).toBeGreaterThan(0);
      }
    }
  });

  it('shows the reason a rejected server was given', () => {
    for (const locale of Object.values(Locale)) {
      const body = NOTIFICATIONS_TRANSLATIONS[locale].kinds.MCP_SERVER_REJECTED.body;
      expect(body, locale).toContain('{excerpt}');
    }
  });
});
