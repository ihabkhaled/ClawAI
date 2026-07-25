'use client';

import { ENTERPRISE_AUDIENCE_ENTRIES } from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseAudienceSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="who-its-for" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.enterprise.audience.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.audience.intro')}</p>
      </div>
      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {ENTERPRISE_AUDIENCE_ENTRIES.map((entry) => (
          <div key={entry.nameKey}>
            <dt className="text-foreground font-medium">{t(entry.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(entry.descKey)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
