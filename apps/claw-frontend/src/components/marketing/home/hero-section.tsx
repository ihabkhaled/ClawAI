'use client';

import Image from 'next/image';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_HOME_PATHS } from '@/constants/marketing-home.constants';
import { ROUTES } from '@/constants/routes.constants';
import { useTranslation } from '@/lib/i18n';
import type { HomeHeroProps } from '@/types';

export function HeroSection({ lastReviewed }: HomeHeroProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8">
      {/* Decorative: the headline immediately below says the same thing in
          words, so an empty alt keeps a screen reader from reading the brand
          twice. `priority` because this is the LCP element above the fold. */}
      <Image
        src="/claw-hero.png"
        alt=""
        width={250}
        height={250}
        priority
        aria-hidden="true"
        className="mx-auto mb-8 h-[250px] w-[250px]"
      />
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
        <Link href={ROUTES.REGISTER} className={buttonVariants({ size: 'lg' })}>
          {t('marketing.home.hero.ctaRegister')}
        </Link>
        <Link href={ROUTES.LOGIN} className={buttonVariants({ size: 'lg', variant: 'outline' })}>
          {t('marketing.home.hero.ctaLogin')}
        </Link>
        <Link
          href={MARKETING_HOME_PATHS.HOW_IT_WORKS}
          className={buttonVariants({ size: 'lg', variant: 'ghost' })}
        >
          {t('marketing.home.hero.ctaHowItWorks')}
        </Link>
      </div>
      <p className="text-muted-foreground mt-5 text-sm">{t('marketing.home.hero.trustNote')}</p>
      <p className="text-muted-foreground mt-10 text-xs">
        {t('marketing.home.hero.lastReviewed')} {lastReviewed}
      </p>
    </section>
  );
}
