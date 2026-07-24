'use client';

import { ChevronDown, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMarketingLocaleSwitcher } from '@/hooks/marketing/use-marketing-locale-switcher';
import { useTranslation } from '@/lib/i18n';

// Public-safe locale dropdown for marketing/auth pages — see
// use-marketing-locale-switcher for why this cannot reuse the portal's
// LocaleSwitcher (it calls an authenticated mutation). Native language
// names only, no flags; Radix DropdownMenu supplies full keyboard nav.
// A visible outline button + globe icon + the current language's native
// name + a chevron make it clearly discoverable as a language picker.
export function MarketingLocaleSwitcher(): React.ReactElement {
  const { locale, options, handleLocaleChange } = useMarketingLocaleSwitcher();
  const { t } = useTranslation();

  const currentConfig = options.find((option) => option.locale === locale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-sm font-medium"
          aria-label={t('marketing.header.languageSwitcherLabel')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{currentConfig?.label ?? locale.toUpperCase()}</span>
          <span className="sm:hidden">{locale.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-52 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.locale}
            onClick={() => handleLocaleChange(option.locale)}
            className={locale === option.locale ? 'bg-accent font-medium' : ''}
          >
            <span className="text-muted-foreground me-2 w-6 text-xs font-medium uppercase">
              {option.locale}
            </span>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
