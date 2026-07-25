'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_USE_CASES_CONTACT_PATH } from '@/constants/marketing-use-cases.constants';
import { useTranslation } from '@/lib/i18n';

export function EnterpriseNoteSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-border bg-card mx-auto flex max-w-3xl flex-col gap-4 rounded-lg border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-foreground font-semibold">
            {t('marketing.useCasesPage.enterprise.title')}
          </h2>
          <p className="text-muted-foreground mt-1.5 text-sm">
            {t('marketing.useCasesPage.enterprise.body')}
          </p>
        </div>
        <Link
          href={MARKETING_USE_CASES_CONTACT_PATH}
          className={buttonVariants({ variant: 'outline' })}
        >
          {t('marketing.useCasesPage.enterprise.cta')}
        </Link>
      </div>
    </section>
  );
}
