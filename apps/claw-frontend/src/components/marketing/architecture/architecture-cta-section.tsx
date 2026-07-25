'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_ARCHITECTURE_CONTACT_PATH } from '@/constants/marketing-architecture.constants';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureCtaSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.cta.title')}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
          {t('marketing.architecturePage.cta.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.architecturePage.cta.primary')}
          </Link>
          <Link
            href={MARKETING_ARCHITECTURE_CONTACT_PATH}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.architecturePage.cta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
