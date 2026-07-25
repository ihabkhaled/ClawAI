'use client';

import { FEATURES_ORCHESTRATION_PRIMITIVES } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// The nine multi-model orchestration primitives that ship in the product.
export function FeaturesOrchestrationSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="orchestration" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.features.orchestration.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.features.orchestration.intro')}</p>
      </div>

      <dl className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES_ORCHESTRATION_PRIMITIVES.map((primitive) => (
          <div key={primitive.nameKey} className="border-border border-t pt-4">
            <dt className="text-foreground font-medium">{t(primitive.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(primitive.descKey)}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mx-auto mt-10 max-w-3xl text-sm">
        {t('marketing.features.orchestration.outro')}
      </p>
    </section>
  );
}
