'use client';

import { Button } from '@/components/ui/button';
import { THEME_ICONS } from '@/constants/theme.constants';
import { useMarketingThemeToggle } from '@/hooks/marketing/use-marketing-theme-toggle';
import { useTranslation } from '@/lib/i18n';

export function MarketingThemeToggle(): React.ReactElement {
  const { theme, handleCycleTheme } = useMarketingThemeToggle();
  const { t } = useTranslation();

  const Icon = THEME_ICONS[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={handleCycleTheme}
      aria-label={t('marketing.header.themeToggleLabel')}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
