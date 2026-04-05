'use client';

import { useTheme as useNextTheme } from 'next-themes';

export function useAppTheme(): {
  theme: string;
  setTheme: (theme: string) => void;
  systemTheme: string | undefined;
  resolvedTheme: string | undefined;
} {
  const { theme, setTheme, systemTheme, resolvedTheme } = useNextTheme();

  return {
    theme: theme ?? 'system',
    setTheme,
    systemTheme,
    resolvedTheme,
  };
}
