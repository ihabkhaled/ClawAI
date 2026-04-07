import { Monitor, Moon, Sun } from 'lucide-react';

import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';

export const THEME_CYCLE: Record<string, UserAppearancePreference> = {
  system: UserAppearancePreference.LIGHT,
  light: UserAppearancePreference.DARK,
  dark: UserAppearancePreference.SYSTEM,
};

export const THEME_ICONS: Record<string, typeof Monitor> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var theme = localStorage.getItem('claw-theme') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;
