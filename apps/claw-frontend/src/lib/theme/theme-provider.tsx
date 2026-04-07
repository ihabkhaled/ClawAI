'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import { ResolvedTheme, Theme } from '@/enums';
import type { ThemeContextValue, ThemeProviderProps } from '@/types';
import { applyTheme, getStoredTheme, getSystemTheme, resolveTheme, storeTheme } from '@/utilities';

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactNode {
  const [theme, setThemeState] = useState<Theme>(Theme.SYSTEM);
  const [resolved, setResolved] = useState<ResolvedTheme>(ResolvedTheme.LIGHT);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    const res = resolveTheme(stored);
    setResolved(res);
    applyTheme(res);
    setMounted(true);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange(): void {
      if (theme === Theme.SYSTEM) {
        const res = getSystemTheme();
        setResolved(res);
        applyTheme(res);
      }
    }
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme): void => {
    setThemeState(newTheme);
    storeTheme(newTheme);
    const res = resolveTheme(newTheme);
    setResolved(res);
    applyTheme(res);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}
