'use client';

import { Button } from '@/components/ui/button';
import { THEME_ICONS } from '@/constants/theme.constants';
import { useThemeSwitcher } from '@/hooks/layout/use-theme-switcher';
import { useTranslation } from '@/lib/i18n';

export function ThemeSwitcher(): React.ReactElement {
  const { theme, handleCycleTheme, isPending } = useThemeSwitcher();
  const { t } = useTranslation();
  const Icon = THEME_ICONS[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCycleTheme}
      disabled={isPending}
      aria-label={t('marketing.header.themeToggleLabel')}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
