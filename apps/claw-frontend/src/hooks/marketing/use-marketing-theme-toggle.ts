'use client';

import { useCallback } from 'react';

import { MARKETING_THEME_CYCLE } from '@/constants/theme.constants';
import { useAppTheme } from '@/hooks/use-theme';
import type { UseMarketingThemeToggleReturn } from '@/types';

// Public-surface variant of the theme toggle: cycles the local Theme value
// only, via setTheme() (localStorage-backed, see ThemeProvider). Does not
// call the authenticated preferences mutation the portal's ThemeSwitcher
// uses — anonymous visitors have no session to persist a preference against.
export function useMarketingThemeToggle(): UseMarketingThemeToggleReturn {
  const { theme, setTheme } = useAppTheme();

  const handleCycleTheme = useCallback((): void => {
    setTheme(MARKETING_THEME_CYCLE[theme]);
  }, [theme, setTheme]);

  return { theme, handleCycleTheme };
}
