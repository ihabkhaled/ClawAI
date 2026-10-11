'use client';

import { Ellipsis } from 'lucide-react';
import type { ReactElement } from 'react';

import { CurrencySwitcher } from '@/components/common/currency-switcher';
import { TourLauncher } from '@/components/tour/tour-launcher';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/lib/i18n';

import { LocaleSwitcher } from './locale-switcher';
import { ThemeSwitcher } from './theme-switcher';
import { TopbarFeedbackButton } from './topbar-feedback-button';

/**
 * The secondary controls (currency, language, theme, tours, feedback) gathered in one panel for a
 * narrow top bar, so the account menu is never pushed off the edge. They sit side by side and are
 * all visible at once when the panel opens. Shown only below the bar's `@3xl` container width: from
 * there up they sit inline in the bar itself.
 */
export function TopbarOverflowMenu(): ReactElement {
  const { t } = useTranslation();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 @3xl:hidden"
          aria-label={t('nav.more')}
          title={t('nav.more')}
          data-testid="topbar-overflow-trigger"
        >
          <Ellipsis className="h-5 w-5" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto max-w-[calc(100vw-1rem)] p-2"
        data-testid="topbar-overflow-panel"
      >
        <div className="flex flex-wrap items-center justify-end gap-1">
          <CurrencySwitcher />
          <LocaleSwitcher />
          <ThemeSwitcher />
          <TourLauncher />
          <TopbarFeedbackButton />
        </div>
      </PopoverContent>
    </Popover>
  );
}
