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
