'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  FEATURES_SECURITY_ITEMS,
  MARKETING_FEATURES_CONTACT_PATH,
} from '@/constants/marketing-features.constants';
import { useTranslation } from '@/lib/i18n';

// Account, credential and transport security, plus the one place the page
// mentions self-managed deployment: an enterprise conversation, via /contact.
export function FeaturesSecuritySection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="security" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
          {t('marketing.features.security.title')}
        </h2>
        <p className="text-muted-foreground mt-4">{t('marketing.features.security.intro')}</p>
      </div>

      <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES_SECURITY_ITEMS.map((item) => (
          <div key={item.nameKey}>
            <dt className="text-foreground font-medium">{t(item.nameKey)}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm">{t(item.descKey)}</dd>
          </div>
        ))}
      </dl>

      <div className="border-border bg-card mx-auto mt-12 max-w-3xl rounded-lg border p-6">
        <h3 className="text-foreground font-semibold">
          {t('marketing.features.security.enterpriseTitle')}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('marketing.features.security.enterpriseBody')}
        </p>
        <Link
          href={MARKETING_FEATURES_CONTACT_PATH}
          className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-4' })}
        >
          {t('marketing.features.security.enterpriseCta')}
        </Link>
      </div>
    </section>
  );
}
