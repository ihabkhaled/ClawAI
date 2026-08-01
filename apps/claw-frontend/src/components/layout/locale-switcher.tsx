'use client';

import { ChevronDown, Languages } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Locale } from '@/enums/locale.enum';
import { useUpdatePreferences } from '@/hooks/settings/use-update-preferences';
import { useLocale } from '@/hooks/use-locale';
import { useLocaleNavigation } from '@/hooks/use-locale-navigation';
import { SUPPORTED_LOCALES, useTranslation } from '@/lib/i18n';
import { localeToLanguage } from '@/utilities/preference.utility';

export function LocaleSwitcher(): React.ReactElement {
  const { locale, setLocale } = useLocale();
  const { updatePreferences, isPending } = useUpdatePreferences();
  const { replaceLocale } = useLocaleNavigation();
  const { t } = useTranslation();

  const currentConfig = SUPPORTED_LOCALES.find((l) => l.locale === locale);

  function handleLocaleChange(newLocale: Locale): void {
    setLocale(newLocale);
    replaceLocale(newLocale);
    updatePreferences({ languagePreference: localeToLanguage(newLocale) });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5 text-sm font-medium"
          disabled={isPending}
          aria-label={t('marketing.header.languageSwitcherLabel')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span>{currentConfig?.label ?? locale.toUpperCase()}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-80 w-52 overflow-y-auto">
        {SUPPORTED_LOCALES.map((config) => (
          <DropdownMenuItem
            key={config.locale}
            onClick={() => handleLocaleChange(config.locale)}
            className={locale === config.locale ? 'bg-accent font-medium' : ''}
          >
            <span className="text-muted-foreground me-2 w-6 text-xs font-medium uppercase">
              {config.locale}
            </span>
            {config.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
