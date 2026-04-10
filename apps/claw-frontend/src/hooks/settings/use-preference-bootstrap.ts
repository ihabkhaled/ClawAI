'use client';

import { useEffect, useRef } from 'react';

import { useCurrentUser } from '@/hooks/auth/use-current-user';
import { useLocale } from '@/hooks/use-locale';
import { useAppTheme } from '@/hooks/use-theme';
import { logger } from '@/utilities';
import { appearanceToTheme, languageToLocale } from '@/utilities/preference.utility';

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
    logger.debug({ component: 'settings', action: 'preference-bootstrap', message: 'Bootstrapping user preferences', details: { language: user.languagePreference, appearance: user.appearancePreference } });

    const locale = languageToLocale(user.languagePreference);
    setLocale(locale);

    const resolvedTheme = appearanceToTheme(user.appearancePreference);
    setTheme(resolvedTheme);
  }, [user, setLocale, setTheme]);
}
