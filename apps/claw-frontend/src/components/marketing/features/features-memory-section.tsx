'use client';

import { FEATURES_MEMORY_ITEMS } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Memory + context packs: what the assistant remembers, and the reusable
// context bundles a user attaches to a thread.
export function FeaturesMemorySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="memory" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.features.memory.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.features.memory.intro')}</p>
        </div>

        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES_MEMORY_ITEMS.map((item) => (
            <div key={item.nameKey}>
              <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
            </div>
          ))}
        </dl>

        <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
          {t('marketing.features.memory.outro')}
        </p>
      </div>
    </section>
  );
}
