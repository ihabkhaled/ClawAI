'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_ARCHITECTURE_CONTACT_PATH } from '@/constants/marketing-architecture.constants';
import { useTranslation } from '@/lib/i18n';

export function ArchitectureEnterpriseSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="enterprise" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="border-border bg-card mx-auto max-w-3xl rounded-lg border p-6 sm:p-8">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.architecturePage.enterprise.title')}
        </h2>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.enterprise.body1')}
        </p>
        <p className="text-muted-foreground mt-4">
          {t('marketing.architecturePage.enterprise.body2')}
        </p>
        <div className="mt-6">
          <Link
            href={MARKETING_ARCHITECTURE_CONTACT_PATH}
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('marketing.architecturePage.enterprise.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
