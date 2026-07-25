'use client';

import { ARCHITECTURE_RELIABILITY_MECHANISMS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureReliabilitySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="reliability" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.architecturePage.reliability.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.reliability.body1')}
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2">
          {ARCHITECTURE_RELIABILITY_MECHANISMS.map((mechanism) => (
            <div key={mechanism.nameKey} className="border-border bg-card rounded-lg border p-5">
              <dt className="text-foreground font-medium">{t(mechanism.nameKey)}</dt>
              <dd className="text-muted-foreground mt-2 text-sm">{t(mechanism.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
