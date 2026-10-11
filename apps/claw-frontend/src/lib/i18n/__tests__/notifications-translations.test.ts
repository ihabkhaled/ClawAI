import { describe, expect, it } from 'vitest';

import { NOTIFICATION_TEXT_KEYS } from '@/constants/notifications.constants';
import { Locale } from '@/enums/locale.enum';
import { ar } from '@/lib/i18n/locales/ar';
import { de } from '@/lib/i18n/locales/de';
import { en } from '@/lib/i18n/locales/en';
import { es } from '@/lib/i18n/locales/es';
import { fa } from '@/lib/i18n/locales/fa';
import { fr } from '@/lib/i18n/locales/fr';
import { hi } from '@/lib/i18n/locales/hi';
import { it as itLocale } from '@/lib/i18n/locales/it';
import { ja } from '@/lib/i18n/locales/ja';
import { NOTIFICATIONS_TRANSLATIONS } from '@/lib/i18n/locales/notifications-translations';
import { pt } from '@/lib/i18n/locales/pt';
import { ru } from '@/lib/i18n/locales/ru';
import { th } from '@/lib/i18n/locales/th';
import { zh } from '@/lib/i18n/locales/zh';
import { resolveTranslation } from '@/lib/i18n/translation-resolver';

const DICTIONARIES = { ar, de, en, es, fa, fr, hi, it: itLocale, ja, pt, ru, th, zh };

/** Every string the bell and the settings card ask `t()` for. */
const KEYS = [
  'notifications.bellLabel',
  'notifications.title',
  'notifications.empty',
  'notifications.loading',
  'notifications.error',
  'notifications.retry',
  'notifications.markAllRead',
  'notifications.showOlder',
  'notifications.settings',
  'notifications.unreadCount',
  'notifications.preferences.title',
  'notifications.preferences.description',
  'notifications.preferences.inApp',
  'notifications.preferences.inAppHint',
  'notifications.preferences.email',
  'notifications.preferences.emailHint',
  'notifications.preferences.saveFailed',
  ...Object.values(NOTIFICATION_TEXT_KEYS).flatMap((keys) => [keys.titleKey, keys.bodyKey]),
];

describe('notifications translations', () => {
  it('covers all 13 locales', () => {
    expect(Object.keys(NOTIFICATIONS_TRANSLATIONS)).toHaveLength(13);
    expect(Object.keys(DICTIONARIES)).toHaveLength(13);
  });

  describe.each(Object.entries(DICTIONARIES))('%s', (code, dictionary) => {
    it.each(KEYS)('resolves %s to real text, not the raw key', (key) => {
      const text = resolveTranslation(dictionary, key);
      expect(text).not.toBe(key);
      expect(text.trim().length).toBeGreaterThan(0);
      expect(text).not.toContain('TODO');
      expect(code.length).toBeGreaterThan(0);
    });

    it('keeps the {count} placeholder of the unread label', () => {
      expect(resolveTranslation(dictionary, 'notifications.unreadCount')).toContain('{count}');
    });
  });

  it('writes real translations, not the English text, for every other locale', () => {
    const english = NOTIFICATIONS_TRANSLATIONS[Locale.EN];
    for (const locale of Object.values(Locale)) {
      if (locale === Locale.EN) {
        continue;
      }
      const translated = NOTIFICATIONS_TRANSLATIONS[locale];
      expect(translated.empty).not.toBe(english.empty);
      expect(translated.kinds.THREAD_FAILED.title).not.toBe(english.kinds.THREAD_FAILED.title);
    }
  });
});
