'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

import type { ThemeProviderProps } from '@/types';

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
