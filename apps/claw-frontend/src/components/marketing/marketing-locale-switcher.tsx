'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarketingLocaleSwitcher } from '@/hooks/marketing/use-marketing-locale-switcher';
import { useTranslation } from '@/lib/i18n';

// Public-safe locale dropdown for marketing pages — see
// use-marketing-locale-switcher for why this cannot reuse the portal's
// LocaleSwitcher (it calls an authenticated mutation). Native language
// names only, no flags; Radix DropdownMenu supplies full keyboard nav.
export function MarketingLocaleSwitcher(): React.ReactElement {
  const { locale, options, handleLocaleChange } = useMarketingLocaleSwitcher();
  const { t } = useTranslation();

  const currentConfig = options.find((option) => option.locale === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 px-2 text-xs font-medium"
          aria-label={t('marketing.header.languageSwitcherLabel')}
        >
          {currentConfig?.label.slice(0, 2).toUpperCase() ?? locale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.locale}
            onClick={() => handleLocaleChange(option.locale)}
            className={locale === option.locale ? 'bg-accent' : ''}
          >
            <span className="me-2 text-xs font-medium uppercase">{option.locale}</span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
