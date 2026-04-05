'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = 'claw-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function applyTheme(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactNode {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
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
      if (theme === 'system') {
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
    localStorage.setItem(STORAGE_KEY, newTheme);
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
