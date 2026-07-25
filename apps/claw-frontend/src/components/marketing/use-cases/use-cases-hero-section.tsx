'use client';

import { useTranslation } from '@/lib/i18n';
import type { UseCasesHeroSectionProps } from '@/types/marketing-use-cases.types';

export function UseCasesHeroSection({
  lastReviewed,
}: UseCasesHeroSectionProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {t('marketing.useCasesPage.hero.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg">
          {t('marketing.useCasesPage.hero.subtitle')}
        </p>
        {lastReviewed === '' ? null : (
          <p className="text-muted-foreground mt-8 text-xs">
            {t('marketing.useCasesPage.hero.lastReviewedLabel')} {lastReviewed}
          </p>
        )}
      </div>
    </section>
  );
}
