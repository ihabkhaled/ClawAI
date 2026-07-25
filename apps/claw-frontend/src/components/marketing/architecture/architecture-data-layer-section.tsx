'use client';

import { ARCHITECTURE_DATA_STORES } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureDataLayerSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="data-layer" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.dataLayer.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.dataLayer.intro')}
        </p>
      </div>
      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
        {ARCHITECTURE_DATA_STORES.map((store) => (
          <div key={store.name} className="border-border bg-card rounded-lg border p-5">
            <dt className="text-foreground font-mono text-sm font-medium">{store.name}</dt>
            <dd className="text-muted-foreground mt-2 text-sm">{t(store.descKey)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
