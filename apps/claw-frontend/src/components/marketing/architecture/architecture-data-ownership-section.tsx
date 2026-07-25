'use client';

import { ARCHITECTURE_DATA_OWNERSHIP_RULES } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureDataOwnershipSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="data-ownership" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.dataOwnership.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.dataOwnership.body1')}
        </p>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.dataOwnership.body2')}
        </p>
        <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
          {ARCHITECTURE_DATA_OWNERSHIP_RULES.map((rule) => (
            <div key={rule.nameKey}>
              <dt className="text-foreground font-medium">{t(rule.nameKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(rule.descKey)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
