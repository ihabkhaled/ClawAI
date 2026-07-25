'use client';

import { ARCHITECTURE_SERVICES } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureServicesSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="services" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.architecturePage.services.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.services.intro')}
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE_SERVICES.map((service) => (
            <div
              key={service.nameKey}
              className="border-border bg-card flex flex-col rounded-lg border p-5"
            >
              <dt className="flex flex-wrap items-center gap-2">
                <span className="text-foreground font-medium">{t(service.nameKey)}</span>
                <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 font-mono text-[11px]">
                  {service.store}
                </span>
              </dt>
              <dd className="text-muted-foreground mt-2 text-sm">{t(service.descKey)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mx-auto mt-8 max-w-3xl text-sm">
          {t('marketing.architecturePage.services.outro')}
        </p>
      </div>
    </section>
  );
}
