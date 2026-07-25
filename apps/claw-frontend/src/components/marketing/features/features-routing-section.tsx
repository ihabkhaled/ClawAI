'use client';

import { FEATURES_ROUTING_MODES } from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Intelligent routing: what AUTO does, and the manual overrides available when
// you already know which model you want.
export function FeaturesRoutingSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="routing" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.features.routing.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.features.routing.intro')}</p>

          <dl className="mt-8 space-y-5">
            {FEATURES_ROUTING_MODES.map((mode) => (
              <div key={mode.nameKey} className="border-border border-l-2 pl-4">
                <dt className="text-foreground font-medium">{t(mode.nameKey)}</dt>
                <dd className="text-muted-foreground mt-1 text-sm">{t(mode.descKey)}</dd>
              </div>
            ))}
          </dl>

          <div className="border-border bg-card mt-10 rounded-lg border p-5">
            <h3 className="text-foreground font-semibold">
              {t('marketing.features.routing.transparencyTitle')}
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              {t('marketing.features.routing.transparencyBody')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
