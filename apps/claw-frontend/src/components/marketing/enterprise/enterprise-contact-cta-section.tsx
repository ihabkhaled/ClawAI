'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  ENTERPRISE_CONTACT_PATH,
  ENTERPRISE_START_STEPS,
} from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseContactCtaSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="how-to-start" className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.enterprise.start.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.enterprise.start.intro')}</p>
        </div>

        <ol className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {ENTERPRISE_START_STEPS.map((step, index) => (
            <li key={step.titleKey} className="border-border bg-card rounded-lg border p-5">
              <span className="bg-primary text-primary-foreground flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold">
                {index + 1}
              </span>
              <h3 className="text-foreground mt-3 font-medium">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t(step.descKey)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link href={ENTERPRISE_CONTACT_PATH} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.enterprise.start.cta')}
          </Link>
          <p className="text-muted-foreground max-w-xl text-center text-sm">
            {t('marketing.enterprise.start.ctaNote')}
          </p>
        </div>
      </div>
    </section>
  );
}
