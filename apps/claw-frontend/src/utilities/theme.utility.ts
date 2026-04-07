import { ResolvedTheme, Theme } from '@/enums/theme.enum';

const STORAGE_KEY = 'claw-theme';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return ResolvedTheme.LIGHT;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? ResolvedTheme.DARK
    : ResolvedTheme.LIGHT;
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return Theme.SYSTEM;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === Theme.LIGHT || stored === Theme.DARK || stored === Theme.SYSTEM) {
    return stored;
  }
  return Theme.SYSTEM;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === Theme.SYSTEM) {
    return getSystemTheme();
  }
  return theme === Theme.LIGHT ? ResolvedTheme.LIGHT : ResolvedTheme.DARK;
}

export function applyTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  if (resolved === ResolvedTheme.DARK) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function storeTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
}
