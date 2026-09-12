'use client';

import { CurrencyPreferenceMode } from '@claw/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { DISPLAY_CURRENCY_AUTO } from '@/constants/display-currency.constants';
import type { UserAppearancePreference, UserLanguagePreference } from '@/enums';
import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import { useAccountManagement } from '@/hooks/settings/use-account-management';
import { useChangePassword } from '@/hooks/settings/use-change-password';
import { useEmailChange } from '@/hooks/settings/use-email-change';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useLocale } from '@/hooks/use-locale';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';
import { useAppTheme } from '@/hooks/use-theme';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '@/lib/validation/change-password.schema';
import { logger } from '@/utilities';
import {
  languageToLocale,
  localeToLanguage,
  appearanceToTheme,
  themeToAppearance,
} from '@/utilities/preference.utility';

export function useSettingsPage() {
  const { user, isLoading } = useCurrentUser();
  const account = useAccountManagement(user);
  const emailChange = useEmailChange();
  const { locale, setLocale } = useLocale();
  const { replaceLocale } = useLocaleNavigation();
  const { theme, setTheme } = useAppTheme();
  const { updatePreferences, isPending: isPreferencesPending } = useUpdatePreferences();
  const {
    currency: activeCurrency,
    context: currencyContext,
    selectCurrency,
  } = useDisplayCurrency();

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
    logger.info({
      component: 'settings',
      action: 'change-language',
      message: 'User changing language',
      details: { language },
    });
    const newLocale = languageToLocale(language);
    setLocale(newLocale);
    replaceLocale(newLocale);
    updatePreferences({ languagePreference: language });
  }

  function handleAppearanceChange(appearance: UserAppearancePreference): void {
    logger.info({
      component: 'settings',
      action: 'change-appearance',
      message: 'User changing appearance',
      details: { appearance },
    });
    const newTheme = appearanceToTheme(appearance);
    setTheme(newTheme);
    updatePreferences({ appearancePreference: appearance });
  }

  // Both halves, always together.
  //
  // The SERVER reads the first-party cookie to resolve the display context on
  // the next first paint, and the saved preference is what follows the user to
  // another device. Writing only one of them gives a setting that works on this
  // tab and is forgotten on the next, or one that is saved and invisible.
  function handleCurrencyChange(currency: string): void {
    logger.info({
      component: 'settings',
      action: 'change-currency',
      message: 'User changing display currency',
      details: { currency },
    });
    selectCurrency(currency);
    updatePreferences({
      currencyPreferenceMode: CurrencyPreferenceMode.MANUAL,
      preferredCurrencyCode: currency,
    });
  }

  // Back to detection. The stored currency is deliberately NOT cleared: a user
  // toggling AUTO on and off should find their previous choice still there.
  function handleCurrencyAuto(): void {
    logger.info({
      component: 'settings',
      action: 'change-currency-auto',
      message: 'User switching display currency to automatic',
    });
    selectCurrency(DISPLAY_CURRENCY_AUTO);
    updatePreferences({ currencyPreferenceMode: CurrencyPreferenceMode.AUTO });
  }

  function handlePasswordSubmit(data: ChangePasswordFormValues): void {
    logger.info({
      component: 'settings',
      action: 'submit-password-change',
      message: 'User submitting password change',
    });
    changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  }

  return {
    user,
    activeCurrency,
    isCurrencyAutomatic: user?.currencyPreferenceMode !== CurrencyPreferenceMode.MANUAL,
    detectedCountry: currencyContext?.countryCode ?? null,
    handleCurrencyChange,
    handleCurrencyAuto,
    isLoading,
    isPending: isPreferencesPending,
    currentLanguage,
    currentAppearance,
    handleLanguageChange,
    handleAppearanceChange,
    passwordForm,
    handlePasswordSubmit,
    isPasswordPending,
    emailChange,
    ...account,
  };
}
