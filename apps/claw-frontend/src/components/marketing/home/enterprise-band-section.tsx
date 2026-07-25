'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  MARKETING_ENTERPRISE_POINTS,
  MARKETING_HOME_PATHS,
} from '@/constants/marketing-home.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseBandSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="organisations" className="border-border bg-surface-shell border-y">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            {t('marketing.home.enterprise.eyebrow')}
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.enterprise.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.enterprise.body')}</p>
        </div>

        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
          {MARKETING_ENTERPRISE_POINTS.map((point) => (
            <div key={point.titleKey}>
              <dt className="text-foreground font-medium">{t(point.titleKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(point.bodyKey)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={MARKETING_HOME_PATHS.CONTACT} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.home.enterprise.ctaContact')}
          </Link>
          <Link
            href={MARKETING_HOME_PATHS.LOCAL_FIRST_AI}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.home.enterprise.ctaLearnMore')}
          </Link>
        </div>
      </div>
    </section>
  );
}
