'use client';

import { useCallback } from 'react';

import { THEME_CYCLE } from '@/constants/theme.constants';
import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useAppTheme } from '@/hooks/use-theme';
import type { UseThemeSwitcherReturn } from '@/types';
import { logger } from '@/utilities';
import { appearanceToTheme } from '@/utilities/preference.utility';

export function useThemeSwitcher(): UseThemeSwitcherReturn {
  const { theme, setTheme } = useAppTheme();
  const { updatePreferences, isPending } = useUpdatePreferences();

  const handleCycleTheme = useCallback((): void => {
    logger.debug({ component: 'layout', action: 'cycle-theme', message: 'Cycling theme', details: { currentTheme: theme } });
    const nextAppearance = THEME_CYCLE[theme] ?? UserAppearancePreference.SYSTEM;
    const nextTheme = appearanceToTheme(nextAppearance);
    setTheme(nextTheme);
    updatePreferences({ appearancePreference: nextAppearance });
  }, [theme, setTheme, updatePreferences]);

  return { theme, handleCycleTheme, isPending };
}
