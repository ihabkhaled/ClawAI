'use client';

import { MESSAGE_FLOW_STEPS } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function HowItWorksSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.home.howItWorks.title')}
        </h2>
        <ol className="mt-6 space-y-4">
          {MESSAGE_FLOW_STEPS.map((step, index) => (
            <li key={step.titleKey} className="flex gap-4">
              <span
                className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-medium">{t(step.titleKey)}</span>{' '}
                {t(step.descKey)}
              </p>
            </li>
          ))}
        </ol>
        <p className="text-muted-foreground mt-6">{t('marketing.home.howItWorks.outro')}</p>
      </div>
    </section>
  );
}
