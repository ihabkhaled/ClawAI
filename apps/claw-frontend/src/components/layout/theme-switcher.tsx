'use client';

import { Monitor } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { THEME_CYCLE, THEME_ICONS } from '@/constants/theme.constants';
import { UserAppearancePreference } from '@/enums/user-appearance-preference.enum';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useAppTheme } from '@/hooks/use-theme';
import { appearanceToTheme } from '@/utilities/preference.utility';

export function ThemeSwitcher(): React.ReactElement {
  const { theme, setTheme } = useAppTheme();
  const { updatePreferences, isPending } = useUpdatePreferences();

  function handleCycleTheme(): void {
    const nextAppearance = THEME_CYCLE[theme] ?? UserAppearancePreference.SYSTEM;
    const nextTheme = appearanceToTheme(nextAppearance);
    setTheme(nextTheme);
    updatePreferences({ appearancePreference: nextAppearance });
  }

  const Icon = THEME_ICONS[theme] ?? Monitor;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={handleCycleTheme}
      disabled={isPending}
      aria-label={`Current theme: ${theme}. Click to change.`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
