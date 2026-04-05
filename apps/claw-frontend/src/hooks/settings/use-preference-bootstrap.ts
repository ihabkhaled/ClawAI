'use client';

import { useEffect, useRef } from 'react';

import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLocale } from '@/hooks/use-locale';
import { useAppTheme } from '@/hooks/use-theme';
import { languageToLocale, appearanceToTheme } from '@/utilities/preference.utility';

export function usePreferenceBootstrap(): void {
  const { user } = useCurrentUser();
  const { setLocale } = useLocale();
  const { setTheme } = useAppTheme();
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (!user || bootstrappedRef.current) {
      return;
    }

    bootstrappedRef.current = true;

    const locale = languageToLocale(user.languagePreference);
    setLocale(locale);

    const theme = appearanceToTheme(user.appearancePreference);
    setTheme(theme);
  }, [user, setLocale, setTheme]);
}
