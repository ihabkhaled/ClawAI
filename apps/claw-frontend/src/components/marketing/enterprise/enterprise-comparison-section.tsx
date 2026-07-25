'use client';

import { ENTERPRISE_COMPARISON_COLUMNS } from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';

import { EnterpriseComparisonCard } from './enterprise-comparison-card';

export function EnterpriseComparisonSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="compare" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.enterprise.compare.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.enterprise.compare.intro')}</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
        {ENTERPRISE_COMPARISON_COLUMNS.map((column) => (
          <EnterpriseComparisonCard key={column.titleKey} column={column} />
        ))}
      </div>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-center text-sm">
        {t('marketing.enterprise.compare.footnote')}
      </p>
    </section>
  );
}
