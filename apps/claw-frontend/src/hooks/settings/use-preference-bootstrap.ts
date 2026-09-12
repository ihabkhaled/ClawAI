'use client';

import { CurrencyPreferenceMode } from '@claw/shared-types';
import { useEffect, useRef } from 'react';

import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useDisplayCurrency } from '@/hooks/display-currency/use-display-currency';
import { useLocale } from '@/hooks/use-locale';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';
import { useAppTheme } from '@/hooks/use-theme';
import { logger } from '@/utilities';
import { appearanceToTheme, languageToLocale } from '@/utilities/preference.utility';

export function usePreferenceBootstrap(): void {
  const { user } = useCurrentUser();
  const { setLocale } = useLocale();
  const { replaceLocale } = useLocaleNavigation();
  const { setTheme } = useAppTheme();
  const { currency: activeCurrency, selectCurrency } = useDisplayCurrency();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!user || bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;
    logger.debug({
      component: 'settings',
      action: 'preference-bootstrap',
      message: 'Bootstrapping user preferences',
      details: { language: user.languagePreference, appearance: user.appearancePreference },
    });

    const locale = languageToLocale(user.languagePreference);
    setLocale(locale);
    replaceLocale(locale);

    const resolvedTheme = appearanceToTheme(user.appearancePreference);
    setTheme(resolvedTheme);

    // A MANUAL currency saved on another device arrives here with no cookie, so
    // this is what makes the preference actually follow the user. Applying it
    // writes the cookie too, which is what lets the SERVER get the first paint
    // right on every subsequent navigation.
    //
    // Skipped when it already matches, so signing in does not re-render every
    // price for no reason. AUTO is skipped entirely: the absence of an override
    // IS detection, and forcing it here would fight a visitor who had picked a
    // currency in this browser before signing in.
    const preferred = user.preferredCurrencyCode;
    if (
      user.currencyPreferenceMode === CurrencyPreferenceMode.MANUAL &&
      typeof preferred === 'string' &&
      preferred !== activeCurrency
    ) {
      selectCurrency(preferred);
    }
  }, [activeCurrency, replaceLocale, selectCurrency, setLocale, setTheme, user]);
}
