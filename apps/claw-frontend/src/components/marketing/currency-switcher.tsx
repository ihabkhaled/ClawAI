'use client';

import { Check, ChevronDown, Coins } from 'lucide-react';

import { CurrencySwitcherOptionItem } from '@/components/marketing/currency-switcher-option-item';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrencySwitcher } from '@/hooks/display-currency/use-currency-switcher';
import { useTranslation } from '@/lib/i18n';

// Display-currency picker for marketing and pricing pages.
//
// It shows the currency actually being RENDERED, not the one the visitor asked
// for — when no provider can quote a currency the page falls back to USD, and a
// selector still reading "EGP" over a page of dollars would be lying about its
// own state.
//
// "Automatic" is listed as a distinct choice rather than implied by the absence
// of one: a visitor who wants detection back needs somewhere to click.
export function CurrencySwitcher(): React.ReactElement {
  const { t, locale } = useTranslation();
  const { options, activeCurrency, isAutomatic, isSwitching, selectCurrency, selectAutomatic } =
    useCurrencySwitcher(locale);

  const popular = options.filter((option) => option.isPopular);
  const rest = options.filter((option) => !option.isPopular);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-sm font-medium"
          aria-label={`${activeCurrency}, ${t('marketing.currency.switcherLabel')}`}
          disabled={isSwitching}
        >
          <Coins className="h-4 w-4" aria-hidden="true" />
          <span>{activeCurrency}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
        <DropdownMenuItem onClick={selectAutomatic} className={isAutomatic ? 'bg-accent' : ''}>
          <Check
            className={`me-2 h-4 w-4 ${isAutomatic ? 'opacity-100' : 'opacity-0'}`}
            aria-hidden="true"
          />
          {t('marketing.currency.automatic')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t('marketing.currency.popular')}
        </DropdownMenuLabel>
        {popular.map((option) => (
          <CurrencySwitcherOptionItem
            key={option.code}
            code={option.code}
            label={option.label}
            isActive={!isAutomatic && option.code === activeCurrency}
            onSelect={selectCurrency}
          />
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {t('marketing.currency.allCurrencies')}
        </DropdownMenuLabel>
        {rest.map((option) => (
          <CurrencySwitcherOptionItem
            key={option.code}
            code={option.code}
            label={option.label}
            isActive={!isAutomatic && option.code === activeCurrency}
            onSelect={selectCurrency}
          />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
