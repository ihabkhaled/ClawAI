import { Locale } from '@/enums/locale.enum';
import { Theme } from '@/enums/theme.enum';
import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';
import { UserLanguagePreference } from '@/enums/user-language-preference.enum';

const LANGUAGE_TO_LOCALE_MAP: Record<UserLanguagePreference, Locale> = {
  [UserLanguagePreference.EN]: Locale.EN,
  [UserLanguagePreference.AR]: Locale.AR,
  [UserLanguagePreference.FR]: Locale.FR,
  [UserLanguagePreference.IT]: Locale.IT,
  [UserLanguagePreference.DE]: Locale.DE,
  [UserLanguagePreference.ES]: Locale.ES,
  [UserLanguagePreference.RU]: Locale.RU,
  [UserLanguagePreference.PT]: Locale.PT,
};

const LOCALE_TO_LANGUAGE_MAP: Record<Locale, UserLanguagePreference> = {
  [Locale.EN]: UserLanguagePreference.EN,
  [Locale.AR]: UserLanguagePreference.AR,
  [Locale.FR]: UserLanguagePreference.FR,
  [Locale.IT]: UserLanguagePreference.IT,
  [Locale.DE]: UserLanguagePreference.DE,
  [Locale.ES]: UserLanguagePreference.ES,
  [Locale.RU]: UserLanguagePreference.RU,
  [Locale.PT]: UserLanguagePreference.PT,
};

const APPEARANCE_TO_THEME_MAP: Record<UserAppearancePreference, Theme> = {
  [UserAppearancePreference.SYSTEM]: Theme.SYSTEM,
  [UserAppearancePreference.LIGHT]: Theme.LIGHT,
  [UserAppearancePreference.DARK]: Theme.DARK,
};

const THEME_TO_APPEARANCE_MAP: Record<Theme, UserAppearancePreference> = {
  [Theme.SYSTEM]: UserAppearancePreference.SYSTEM,
  [Theme.LIGHT]: UserAppearancePreference.LIGHT,
  [Theme.DARK]: UserAppearancePreference.DARK,
};

export function languageToLocale(language: UserLanguagePreference): Locale {
  return LANGUAGE_TO_LOCALE_MAP[language];
}

export function localeToLanguage(locale: Locale): UserLanguagePreference {
  return LOCALE_TO_LANGUAGE_MAP[locale];
}

export function appearanceToTheme(appearance: UserAppearancePreference): Theme {
  return APPEARANCE_TO_THEME_MAP[appearance];
}

export function themeToAppearance(theme: Theme): UserAppearancePreference {
  return THEME_TO_APPEARANCE_MAP[theme] ?? UserAppearancePreference.SYSTEM;
}
