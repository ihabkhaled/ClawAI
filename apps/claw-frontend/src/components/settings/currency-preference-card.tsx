'use client';

import { CurrencySwitcher } from '@/components/marketing/currency-switcher';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n';
import type { CurrencyPreferenceCardProps } from '@/types/display-currency.types';

/**
 * Display-currency preference.
 *
 * Two things it has to say out loud, because both are surprising:
 *
 * 1. This is presentation, not pricing. Prices are set in USD and converted for
 *    reading; nobody is being offered a different deal.
 * 2. The currency shown is not necessarily the currency charged. Saying so here
 *    is cheaper than a support ticket after a card statement disagrees with a
 *    plan card.
 *
 * Automatic is a distinct, visible choice rather than the absence of one — a
 * user who wants detection back needs somewhere to click.
 */
export function CurrencyPreferenceCard({
  activeCurrency,
  isAutomatic,
  detectedCountry,
}: CurrencyPreferenceCardProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('settings.currency')}</CardTitle>
        <CardDescription>{t('settings.currencyDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <CurrencySwitcher />
          <p className="text-muted-foreground text-sm">
            {isAutomatic
              ? t('settings.currencyAutomaticActive', {
                  currency: activeCurrency,
                  country: detectedCountry ?? '—',
                })
              : t('settings.currencyManualActive', { currency: activeCurrency })}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">{t('marketing.currency.approximateNote')}</p>
      </CardContent>
    </Card>
  );
}
