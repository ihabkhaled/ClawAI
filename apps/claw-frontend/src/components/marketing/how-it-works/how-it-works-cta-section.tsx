'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';

export function HowItWorksCtaSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.howItWorksPage.cta.title')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
          {t('marketing.howItWorksPage.cta.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.howItWorksPage.cta.ctaRegister')}
          </Link>
          <Link href={ROUTES.LOGIN} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            {t('marketing.howItWorksPage.cta.ctaLogin')}
          </Link>
          <Link href={ROUTES.CONTACT} className={buttonVariants({ size: 'lg', variant: 'ghost' })}>
            {t('marketing.howItWorksPage.cta.ctaContact')}
          </Link>
        </div>
      </div>
    </section>
  );
}
