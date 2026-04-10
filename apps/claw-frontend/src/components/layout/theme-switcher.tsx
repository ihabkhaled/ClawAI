'use client';

import { Button } from '@/components/ui/button';
import { THEME_ICONS } from '@/constants/theme.constants';
import { useThemeSwitcher } from '@/hooks/layout/use-theme-switcher';

export function ThemeSwitcher(): React.ReactElement {
  const { theme, handleCycleTheme, isPending } = useThemeSwitcher();

  const Icon = THEME_ICONS[theme];

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
