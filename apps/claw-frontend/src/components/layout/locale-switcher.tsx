'use client';

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
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { localeToLanguage } from '@/utilities/preference.utility';

export function LocaleSwitcher(): React.ReactElement {
  const { locale, setLocale } = useLocale();
  const { updatePreferences, isPending } = useUpdatePreferences();

  const currentConfig = SUPPORTED_LOCALES.find((l) => l.locale === locale);

  function handleLocaleChange(newLocale: Locale): void {
    setLocale(newLocale);
    updatePreferences({ languagePreference: localeToLanguage(newLocale) });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 gap-1 px-2 text-xs font-medium" disabled={isPending}>
          {currentConfig?.label.slice(0, 2).toUpperCase() ?? locale.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LOCALES.map((config) => (
          <DropdownMenuItem
            key={config.locale}
            onClick={() => handleLocaleChange(config.locale)}
            className={locale === config.locale ? 'bg-accent' : ''}
          >
            <span className="me-2 text-xs font-medium uppercase">{config.locale}</span>
            {config.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
