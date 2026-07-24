'use client';

import { useTranslation } from '@/lib/i18n';

export function LocalFirstSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="local-first" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.localFirst.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.home.localFirst.body1')}</p>
        <p className="text-muted-foreground mt-4">{t('marketing.home.localFirst.body2')}</p>
      </div>
    </section>
  );
}
