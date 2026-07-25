'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';
import type { MarketingFeaturesHeroProps } from '@/types/marketing-features.types';

// Page header for /features. Server-rendered copy that still hydrates so the
// locale switcher can re-render it; buttonVariants() (a plain className fn) is
// used instead of <Button asChild> to keep the links real anchors.
export function FeaturesHeroSection({
  lastReviewed,
}: MarketingFeaturesHeroProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
          {t('marketing.features.hero.title')}
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg">
          {t('marketing.features.hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.features.hero.ctaPrimary')}
          </Link>
          <Link href={ROUTES.LOGIN} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            {t('marketing.features.hero.ctaSecondary')}
          </Link>
        </div>
        {lastReviewed === '' ? null : (
          <p className="text-muted-foreground mt-10 text-xs">
            {t('marketing.features.hero.lastReviewed')} {lastReviewed}
          </p>
        )}
      </div>
    </section>
  );
}
