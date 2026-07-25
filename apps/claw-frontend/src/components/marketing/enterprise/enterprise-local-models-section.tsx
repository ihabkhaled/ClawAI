'use client';

import { ENTERPRISE_LOCAL_MODEL_FAMILIES } from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseLocalModelsSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="local-models" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.enterprise.models.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.models.intro')}</p>
      </div>

      <div className="mx-auto mt-10 max-w-5xl">
        <h3 className="text-foreground text-sm font-semibold tracking-wide uppercase">
          {t('marketing.enterprise.models.familiesLabel')}
        </h3>
        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_LOCAL_MODEL_FAMILIES.map((family) => (
            <div key={family.name} className="border-border bg-card rounded-lg border p-4">
              <dt className="text-foreground font-medium">{family.name}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(family.descKey)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground mt-6 text-sm">
          {t('marketing.enterprise.models.sizingNote')}
        </p>
      </div>
    </section>
  );
}
