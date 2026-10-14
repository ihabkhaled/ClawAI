import { describe, expect, it } from 'vitest';

import { PLUGIN_NOTICE_KEYS } from '@/constants/plugin-call.constants';
import { Locale } from '@/enums/locale.enum';
import { PluginNoticeCode } from '@/enums/plugin-notice-code.enum';

import { PLUGIN_OWN_SERVERS_TRANSLATIONS } from '../locales/plugin-own-servers-translations';

const KEYS = ['pluginOwnServerUnavailable', 'pluginOwnServerNeedsReview'] as const;
const english = PLUGIN_OWN_SERVERS_TRANSLATIONS[Locale.EN];

describe('own MCP server notices', () => {
  it('has an entry for every one of the 13 locales', () => {
    expect(Object.keys(PLUGIN_OWN_SERVERS_TRANSLATIONS).sort()).toEqual(
      Object.values(Locale).sort(),
    );
  });

  it.each(Object.values(Locale).filter((locale) => locale !== Locale.EN))(
    '%s has both notices and they are real translations',
    (locale) => {
      const translated = PLUGIN_OWN_SERVERS_TRANSLATIONS[locale];
      for (const key of KEYS) {
        expect(translated[key].trim().length).toBeGreaterThan(0);
        expect(translated[key], `${locale}: ${key} is still English`).not.toBe(english[key]);
      }
    },
  );

  it('points both notice codes at keys that exist', () => {
    const keyOf = (code: PluginNoticeCode): string => PLUGIN_NOTICE_KEYS[code].replace('chat.', '');
    expect(keyOf(PluginNoticeCode.SERVER_UNAVAILABLE)).toBe('pluginOwnServerUnavailable');
    expect(keyOf(PluginNoticeCode.SERVER_NEEDS_REVIEW)).toBe('pluginOwnServerNeedsReview');
    expect(english.pluginOwnServerUnavailable).toBeTruthy();
    expect(english.pluginOwnServerNeedsReview).toBeTruthy();
  });
});
