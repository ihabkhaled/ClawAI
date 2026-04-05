'use client';

import type { UserAppearancePreference, UserLanguagePreference } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useLocale } from '@/hooks/use-locale';
import { useAppTheme } from '@/hooks/use-theme';
import {
  languageToLocale,
  localeToLanguage,
  appearanceToTheme,
  themeToAppearance,
} from '@/utilities/preference.utility';

export function useSettingsPage() {
  const { user, isLoading } = useCurrentUser();
  const { locale, setLocale } = useLocale();
  const { theme, setTheme } = useAppTheme();
  const { updatePreferences, isPending } = useUpdatePreferences();

  const currentLanguage = localeToLanguage(locale);
  const currentAppearance = themeToAppearance(theme);

  function handleLanguageChange(language: UserLanguagePreference): void {
    const newLocale = languageToLocale(language);
    setLocale(newLocale);
    updatePreferences({ languagePreference: language });
  }

  function handleAppearanceChange(appearance: UserAppearancePreference): void {
    const newTheme = appearanceToTheme(appearance);
    setTheme(newTheme);
    updatePreferences({ appearancePreference: appearance });
  }

  return {
    user,
    isLoading,
    isPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
  };
}
