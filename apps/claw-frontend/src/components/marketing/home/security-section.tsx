'use client';

import { useTranslation } from '@/lib/i18n';

export function SecuritySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.security.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.security.body1')}</p>
          <p className="text-muted-foreground mt-4">{t('marketing.home.security.body2')}</p>
        </div>
      </div>
    </section>
  );
}
