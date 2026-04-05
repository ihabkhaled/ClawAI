'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import type { UserAppearancePreference, UserLanguagePreference } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useChangePassword } from '@/hooks/settings/use-change-password';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useLocale } from '@/hooks/use-locale';
import { useAppTheme } from '@/hooks/use-theme';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/validation/change-password.schema';
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
  const { updatePreferences, isPending: isPreferencesPending } = useUpdatePreferences();

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const { changePassword, isPending: isPasswordPending } = useChangePassword(() => {
    passwordForm.reset();
  });

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

  function handlePasswordSubmit(data: ChangePasswordFormValues): void {
    changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  }

  return {
    user,
    isLoading,
    isPending: isPreferencesPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
    passwordForm,
    handlePasswordSubmit,
    isPasswordPending,
  };
}
