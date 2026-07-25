'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants';
import { MARKETING_USE_CASES_PRICING_PATH } from '@/constants/marketing-use-cases.constants';
import { useTranslation } from '@/lib/i18n';

export function UseCasesCtaSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.useCasesPage.cta.title')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
          {t('marketing.useCasesPage.cta.subtitle')}
        </p>
        {/* buttonVariants() (a plain className fn) rather than <Button asChild>
         * keeps these links server-rendered while still hydrating for locale
         * switching — same pattern as the home hero. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.useCasesPage.cta.primary')}
          </Link>
          <Link
            href={MARKETING_USE_CASES_PRICING_PATH}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.useCasesPage.cta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
