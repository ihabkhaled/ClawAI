'use client';

import { useContext } from 'react';

import { ThemeContext } from '@/lib/theme/theme-provider';

export function useAppTheme(): {
  theme: string;
  setTheme: (theme: string) => void;
  systemTheme: string | undefined;
  resolvedTheme: string | undefined;
} {
  const context = useContext(ThemeContext);

  if (!context) {
    return {
      theme: 'system',
      setTheme: () => {},
      systemTheme: undefined,
      resolvedTheme: undefined,
    };
  }

  return {
    theme: context.theme,
    setTheme: context.setTheme as (theme: string) => void,
    systemTheme: undefined,
    resolvedTheme: context.resolvedTheme,
  };
}
