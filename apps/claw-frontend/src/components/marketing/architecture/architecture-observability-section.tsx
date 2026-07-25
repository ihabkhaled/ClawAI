'use client';

import { ARCHITECTURE_OBSERVABILITY_SIGNALS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureObservabilitySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="observability" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.observability.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.observability.body1')}
        </p>
        <dl className="mt-8 space-y-5">
          {ARCHITECTURE_OBSERVABILITY_SIGNALS.map((signal) => (
            <div key={signal.nameKey} className="border-border border-l-2 pl-4">
              <dt className="text-foreground font-medium">{t(signal.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1 text-sm">{t(signal.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
