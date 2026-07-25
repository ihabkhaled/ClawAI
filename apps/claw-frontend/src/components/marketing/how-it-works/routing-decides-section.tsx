'use client';

import { HOW_IT_WORKS_ROUTING_CLASSES } from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function RoutingDecidesSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="routing" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.howItWorksPage.routing.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.howItWorksPage.routing.intro')}
          </p>

          <dl className="mt-8 space-y-5">
            {HOW_IT_WORKS_ROUTING_CLASSES.map((entry) => (
              <div key={entry.nameKey}>
                <dt className="text-foreground font-medium">{t(entry.nameKey)}</dt>
                <dd className="text-muted-foreground mt-1.5 text-sm">{t(entry.descKey)}</dd>
              </div>
            ))}
          </dl>

          <h3 className="text-foreground mt-10 text-lg font-medium">
            {t('marketing.howItWorksPage.routing.overrideHeading')}
          </h3>
          <p className="text-muted-foreground mt-3">
            {t('marketing.howItWorksPage.routing.overrideBody')}
          </p>
        </div>
      </div>
    </section>
  );
}
