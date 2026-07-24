'use client';

import { ORCHESTRATION_PRIMITIVES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function FeaturesSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="features" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.features.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.features.intro')}</p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {ORCHESTRATION_PRIMITIVES.map((primitive) => (
            <div key={primitive.nameKey}>
              <dt className="text-foreground font-medium">{t(primitive.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(primitive.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
