'use client';

import { ROUTING_MODES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function RoutingSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.routing.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.routing.intro')}</p>
          <ul className="mt-6 space-y-3">
            {ROUTING_MODES.map((mode) => (
              <li key={mode.nameKey} className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{t(mode.nameKey)}.</span>{' '}
                {t(mode.descKey)}.
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-6">{t('marketing.home.routing.outro')}</p>
        </div>
      </div>
    </section>
  );
}
