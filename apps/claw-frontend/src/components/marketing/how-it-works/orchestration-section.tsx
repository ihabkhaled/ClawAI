'use client';

import { HOW_IT_WORKS_ORCHESTRATION_MODES } from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function OrchestrationSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="orchestration" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.howItWorksPage.orchestration.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.howItWorksPage.orchestration.intro')}
        </p>
      </div>

      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {HOW_IT_WORKS_ORCHESTRATION_MODES.map((mode) => (
          <div key={mode.nameKey}>
            <dt className="text-foreground font-medium">{t(mode.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(mode.descKey)}</dd>
          </div>
        ))}
      </dl>

      <p className="text-muted-foreground mx-auto mt-10 max-w-3xl">
        {t('marketing.howItWorksPage.orchestration.outro')}
      </p>
    </section>
  );
}
