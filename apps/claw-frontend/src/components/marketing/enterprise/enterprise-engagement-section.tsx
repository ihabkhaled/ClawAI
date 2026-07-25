'use client';

import { ENTERPRISE_ENGAGEMENT_ITEMS } from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseEngagementSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="what-we-do" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.enterprise.engagement.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.enterprise.engagement.intro')}</p>
        </div>
        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_ENGAGEMENT_ITEMS.map((item) => (
            <div key={item.nameKey}>
              <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
