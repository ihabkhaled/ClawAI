'use client';

import { USE_CASE_ENTRIES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function UseCasesSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.useCases.title')}
        </h2>
      </div>
      <dl className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
        {USE_CASE_ENTRIES.map((useCase) => (
          <div key={useCase.nameKey}>
            <dt className="text-foreground font-medium">{t(useCase.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(useCase.descKey)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
