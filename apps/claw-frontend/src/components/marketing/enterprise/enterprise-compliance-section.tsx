'use client';

import { useTranslation } from '@/lib/i18n';

export function EnterpriseComplianceSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="compliance" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.enterprise.compliance.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.compliance.body1')}</p>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.compliance.body2')}</p>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.compliance.body3')}</p>
      </div>
    </section>
  );
}
