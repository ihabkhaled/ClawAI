'use client';

import {
  HOW_IT_WORKS_ALLOWANCE_EXAMPLES,
  HOW_IT_WORKS_ALLOWANCE_WINDOWS,
} from '@/constants/marketing-how-it-works.constants';
import { useTranslation } from '@/lib/i18n';

export function AllowanceSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="allowance" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.howItWorksPage.allowance.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.howItWorksPage.allowance.intro')}
          </p>

          <h3 className="text-foreground mt-10 text-lg font-medium">
            {t('marketing.howItWorksPage.allowance.explainerHeading')}
          </h3>
          <p className="text-muted-foreground mt-3">
            {t('marketing.howItWorksPage.allowance.explainerBody')}
          </p>

          <dl className="mt-8 space-y-5">
            {HOW_IT_WORKS_ALLOWANCE_EXAMPLES.map((example) => (
              <div key={example.nameKey}>
                <dt className="text-foreground font-medium">{t(example.nameKey)}</dt>
                <dd className="text-muted-foreground mt-1.5 text-sm">{t(example.descKey)}</dd>
              </div>
            ))}
          </dl>

          <h3 className="text-foreground mt-10 text-lg font-medium">
            {t('marketing.howItWorksPage.allowance.windowsHeading')}
          </h3>
          <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-3">
            {HOW_IT_WORKS_ALLOWANCE_WINDOWS.map((window) => (
              <div key={window.nameKey}>
                <dt className="text-foreground font-medium">{t(window.nameKey)}</dt>
                <dd className="text-muted-foreground mt-1.5 text-sm">{t(window.descKey)}</dd>
              </div>
            ))}
          </dl>

          <p className="text-muted-foreground mt-8">
            {t('marketing.howItWorksPage.allowance.outro')}
          </p>
          <p className="text-muted-foreground mt-4 text-sm">
            {t('marketing.howItWorksPage.allowance.fairUseNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
