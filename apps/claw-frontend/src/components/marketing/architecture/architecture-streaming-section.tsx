'use client';

import { ARCHITECTURE_STREAM_SIGNALS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureStreamingSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="streaming" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.architecturePage.streaming.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.streaming.body1')}
          </p>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.streaming.body2')}
          </p>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.streaming.body3')}
          </p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHITECTURE_STREAM_SIGNALS.map((signal) => (
            <div key={signal.nameKey}>
              <dt className="text-foreground font-medium">{t(signal.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(signal.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
