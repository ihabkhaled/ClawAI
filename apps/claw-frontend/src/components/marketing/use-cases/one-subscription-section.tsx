'use client';

import { MARKETING_USE_CASE_VALUE_POINTS } from '@/constants/marketing-use-cases.constants';
import { useTranslation } from '@/lib/i18n';

export function OneSubscriptionSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="one-subscription" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.useCasesPage.oneSubscription.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.useCasesPage.oneSubscription.intro')}
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
          {MARKETING_USE_CASE_VALUE_POINTS.map((point) => (
            <div key={point.titleKey}>
              <dt className="text-foreground font-medium">{t(point.titleKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(point.descKey)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mx-auto mt-10 max-w-3xl">
          {t('marketing.useCasesPage.oneSubscription.outro')}
        </p>
      </div>
    </section>
  );
}
