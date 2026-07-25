'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';

// On-premise / self-hosted deployment is an ENTERPRISE arrangement only. It is
// deliberately a short pointer to /contact rather than a marketed feature of
// the individual subscription product described everywhere else on this page.
export function EnterpriseNoteSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="enterprise" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="border-border bg-card mx-auto max-w-3xl rounded-lg border p-6 sm:p-8">
        <h2 className="text-foreground text-xl font-semibold tracking-tight">
          {t('marketing.howItWorksPage.enterprise.title')}
        </h2>
        <p className="text-muted-foreground mt-3 text-sm">
          {t('marketing.howItWorksPage.enterprise.body')}
        </p>
        <div className="mt-6">
          <Link href={ROUTES.CONTACT} className={buttonVariants({ variant: 'outline' })}>
            {t('marketing.howItWorksPage.enterprise.cta')}
          </Link>
        </div>
      </div>
    </section>
  );
}
