'use client';

import { useContext } from 'react';

import { Theme } from '@/enums';
import { ThemeContext } from '@/lib/theme/theme-provider';
import type { UseAppThemeReturn } from '@/types';

export function useAppTheme(): UseAppThemeReturn {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      theme: Theme.SYSTEM,
      resolvedTheme: undefined,
      setTheme: () => {},
    };
  }

  return {
    theme: context.theme,
    resolvedTheme: context.resolvedTheme,
    setTheme: context.setTheme,
  };
}
