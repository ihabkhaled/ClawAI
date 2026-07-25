'use client';

import { MARKETING_USE_CASES } from '@/constants/marketing-use-cases.constants';
import { useTranslation } from '@/lib/i18n';

export function UseCasesGridSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.useCasesPage.grid.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.useCasesPage.grid.intro')}</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
        {MARKETING_USE_CASES.map((useCase) => (
          <article
            key={useCase.id}
            id={useCase.id}
            className="border-border bg-card rounded-lg border p-6"
          >
            <h3 className="text-foreground text-lg font-semibold">{t(useCase.titleKey)}</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-foreground font-medium">
                  {t('marketing.useCasesPage.grid.problemLabel')}
                </dt>
                <dd className="text-muted-foreground mt-1">{t(useCase.problemKey)}</dd>
              </div>
              <div>
                <dt className="text-foreground font-medium">
                  {t('marketing.useCasesPage.grid.solutionLabel')}
                </dt>
                <dd className="text-muted-foreground mt-1">{t(useCase.solutionKey)}</dd>
              </div>
            </dl>
            <p className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">
                {t('marketing.useCasesPage.grid.capabilityLabel')}
              </span>
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 font-medium">
                {t(useCase.capabilityKey)}
              </span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
