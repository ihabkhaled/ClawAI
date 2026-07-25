'use client';

import { FEATURES_OBSERVABILITY_ITEMS } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Usage, routing transparency, and audit history — the answer to "what did it
// just do, on which model, and what did it cost me?".
export function FeaturesObservabilitySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="observability" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.features.observability.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.features.observability.intro')}
          </p>
        </div>

        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
          {FEATURES_OBSERVABILITY_ITEMS.map((item) => (
            <div key={item.nameKey}>
              <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
            </div>
          ))}
        </dl>

        <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
          {t('marketing.features.observability.outro')}
        </p>
      </div>
    </section>
  );
}
