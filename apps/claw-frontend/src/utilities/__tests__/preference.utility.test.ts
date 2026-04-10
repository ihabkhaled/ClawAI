import { describe, expect, it } from 'vitest';

import { Locale } from '@/enums/locale.enum';
import { Theme } from '@/enums/theme.enum';
import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';
import { UserLanguagePreference } from '@/enums/user-language-preference.enum';
import {
  appearanceToTheme,
  languageToLocale,
  localeToLanguage,
  themeToAppearance,
} from '@/utilities/preference.utility';

describe('languageToLocale', () => {
  it.each([
    [UserLanguagePreference.EN, Locale.EN],
    [UserLanguagePreference.AR, Locale.AR],
    [UserLanguagePreference.FR, Locale.FR],
    [UserLanguagePreference.IT, Locale.IT],
    [UserLanguagePreference.DE, Locale.DE],
    [UserLanguagePreference.ES, Locale.ES],
    [UserLanguagePreference.RU, Locale.RU],
    [UserLanguagePreference.PT, Locale.PT],
  ])('maps %s to %s', (language, expectedLocale) => {
    expect(languageToLocale(language)).toBe(expectedLocale);
  });
});

describe('localeToLanguage', () => {
  it.each([
    [Locale.EN, UserLanguagePreference.EN],
    [Locale.AR, UserLanguagePreference.AR],
    [Locale.FR, UserLanguagePreference.FR],
    [Locale.IT, UserLanguagePreference.IT],
    [Locale.DE, UserLanguagePreference.DE],
    [Locale.ES, UserLanguagePreference.ES],
    [Locale.RU, UserLanguagePreference.RU],
    [Locale.PT, UserLanguagePreference.PT],
  ])('maps %s to %s', (locale, expectedLanguage) => {
    expect(localeToLanguage(locale)).toBe(expectedLanguage);
  });
});

describe('appearanceToTheme', () => {
  it.each([
    [UserAppearancePreference.SYSTEM, Theme.SYSTEM],
    [UserAppearancePreference.LIGHT, Theme.LIGHT],
    [UserAppearancePreference.DARK, Theme.DARK],
  ])('maps %s to %s', (appearance, expectedTheme) => {
    expect(appearanceToTheme(appearance)).toBe(expectedTheme);
  });
});

describe('themeToAppearance', () => {
  it.each([
    [Theme.SYSTEM, UserAppearancePreference.SYSTEM],
    [Theme.LIGHT, UserAppearancePreference.LIGHT],
    [Theme.DARK, UserAppearancePreference.DARK],
  ])('maps %s to %s', (theme, expectedAppearance) => {
    expect(themeToAppearance(theme)).toBe(expectedAppearance);
  });
});
