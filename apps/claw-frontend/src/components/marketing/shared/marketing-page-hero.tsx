'use client';

import { useTranslation } from '@/lib/i18n';
import type { MarketingPageHeroProps } from '@/types';

export function MarketingPageHero({
  titleKey,
  subtitleKey,
  lastReviewed,
}: MarketingPageHeroProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {t(titleKey)}
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg">{t(subtitleKey)}</p>
        {lastReviewed !== undefined && lastReviewed !== '' ? (
          <p className="text-muted-foreground mt-8 text-xs">
            {t('marketing.home.hero.lastReviewed')} {lastReviewed}
          </p>
        ) : null}
      </div>
    </section>
  );
}
