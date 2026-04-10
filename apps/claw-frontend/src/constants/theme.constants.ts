import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';

import { Theme } from '@/enums/theme.enum';
import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';

export const THEME_CYCLE: Record<Theme, UserAppearancePreference> = {
  [Theme.SYSTEM]: UserAppearancePreference.LIGHT,
  [Theme.LIGHT]: UserAppearancePreference.DARK,
  [Theme.DARK]: UserAppearancePreference.SYSTEM,
};

export const THEME_ICONS: Record<Theme, LucideIcon> = {
  [Theme.SYSTEM]: Monitor,
  [Theme.LIGHT]: Sun,
  [Theme.DARK]: Moon,
};

export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var theme = localStorage.getItem('claw-theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
    document.documentElement.style.colorScheme = resolved;
  } catch(e) {}
})();
`;
