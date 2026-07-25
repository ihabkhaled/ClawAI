'use client';

import { ARCHITECTURE_OVERVIEW_STATS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureOverviewSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="overview" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.overview.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.overview.body1')}
        </p>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.overview.body2')}
        </p>
      </div>
      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ARCHITECTURE_OVERVIEW_STATS.map((stat) => (
          <div key={stat.labelKey} className="border-border bg-card rounded-lg border p-5">
            <dt className="text-foreground text-2xl font-semibold tracking-tight">
              {t(stat.valueKey)}
            </dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(stat.labelKey)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
