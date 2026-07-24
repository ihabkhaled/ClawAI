'use client';

import { INTEGRATION_HIGHLIGHTS } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function IntegrationsSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.integrations.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.home.integrations.intro')}</p>
      </div>
      <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
        {INTEGRATION_HIGHLIGHTS.map((highlight) => (
          <div key={highlight.nameKey}>
            <dt className="text-foreground font-medium">{t(highlight.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(highlight.descKey)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
