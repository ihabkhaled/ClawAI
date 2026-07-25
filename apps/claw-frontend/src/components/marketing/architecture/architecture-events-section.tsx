'use client';

import { ARCHITECTURE_EVENT_GUARANTEES } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureEventsSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="events" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.events.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.architecturePage.events.body1')}</p>
        <p className="text-muted-foreground mt-4">{t('marketing.architecturePage.events.body2')}</p>
        <dl className="mt-8 space-y-5">
          {ARCHITECTURE_EVENT_GUARANTEES.map((guarantee) => (
            <div key={guarantee.nameKey} className="border-border border-l-2 pl-4">
              <dt className="text-foreground font-medium">{t(guarantee.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1 text-sm">{t(guarantee.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
