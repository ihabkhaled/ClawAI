'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { HomeHeroProps } from '@/types';

export function HeroSection({ lastReviewed }: HomeHeroProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      <h1 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
        {t('marketing.home.hero.title')}
      </h1>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
        {t('marketing.home.hero.subtitle')}
      </p>
      {/* Real Server-rendered content that also hydrates for locale switching:
       * buttonVariants() (a plain className fn) is used instead of the Radix
       * <Button asChild> component. */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={ROUTES.CHAT} className={buttonVariants({ size: 'lg' })}>
          {t('marketing.home.hero.ctaOpen')}
        </Link>
        <Link href={ROUTES.LOGIN} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          {t('marketing.home.hero.ctaLogin')}
        </Link>
        <a
          href={MARKETING_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: 'lg', variant: 'ghost' })}
        >
          {t('marketing.home.hero.ctaGithub')}
        </a>
      </div>
      <p className="text-muted-foreground mt-10 text-xs">
        {t('marketing.home.hero.lastReviewed')} {lastReviewed}
      </p>
    </section>
  );
}
