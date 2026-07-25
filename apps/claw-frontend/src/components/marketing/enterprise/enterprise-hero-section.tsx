'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  ENTERPRISE_CONTACT_PATH,
  ENTERPRISE_DEPLOYMENT_SECTION_ID,
} from '@/constants/marketing-enterprise.constants';
import { useTranslation } from '@/lib/i18n';
import type { EnterpriseHeroProps } from '@/types/marketing-enterprise.types';

export function EnterpriseHeroSection({ lastReviewed }: EnterpriseHeroProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          {t('marketing.enterprise.hero.eyebrow')}
        </p>
        <h1 className="text-foreground mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t('marketing.enterprise.hero.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg">
          {t('marketing.enterprise.hero.subtitle')}
        </p>
        {/* buttonVariants() (a plain className fn) is used instead of the Radix
         * <Button asChild> component so the CTA is real server-rendered markup
         * that still hydrates for locale switching. */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ENTERPRISE_CONTACT_PATH} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.enterprise.hero.ctaContact')}
          </Link>
          <Link
            href={`#${ENTERPRISE_DEPLOYMENT_SECTION_ID}`}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.enterprise.hero.ctaLearnMore')}
          </Link>
        </div>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-sm">
          {t('marketing.enterprise.hero.note')}
        </p>
        {lastReviewed === '' ? null : (
          <p className="text-muted-foreground mt-8 text-xs">
            {t('marketing.enterprise.hero.lastReviewed')} {lastReviewed}
          </p>
        )}
      </div>
    </section>
  );
}
