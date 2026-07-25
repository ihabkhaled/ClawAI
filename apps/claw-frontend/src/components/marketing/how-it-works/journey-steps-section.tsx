'use client';

import { HOW_IT_WORKS_JOURNEY_STEPS } from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function JourneyStepsSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="journey" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.howItWorksPage.journey.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.howItWorksPage.journey.intro')}</p>
        <ol className="mt-8 space-y-5">
          {HOW_IT_WORKS_JOURNEY_STEPS.map((step, index) => (
            <li key={step.titleKey} className="flex gap-4">
              <span
                className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{t(step.titleKey)}.</span>{' '}
                {t(step.descKey)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
