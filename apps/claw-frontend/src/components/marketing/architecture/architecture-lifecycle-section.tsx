'use client';

import { ARCHITECTURE_LIFECYCLE_STEPS } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureLifecycleSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="lifecycle" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.architecturePage.lifecycle.title')}
          </h2>
          <p className="text-muted-foreground mt-4">
            {t('marketing.architecturePage.lifecycle.intro')}
          </p>
          <ol className="mt-8 space-y-5">
            {ARCHITECTURE_LIFECYCLE_STEPS.map((step, index) => (
              <li key={step.titleKey} className="flex gap-4">
                <span
                  className="bg-primary/10 text-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div>
                  <p className="text-foreground font-medium">{t(step.titleKey)}</p>
                  <p className="text-muted-foreground mt-1 text-sm">{t(step.descKey)}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground mt-8">
            {t('marketing.architecturePage.lifecycle.outro')}
          </p>
        </div>
      </div>
    </section>
  );
}
