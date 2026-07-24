'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';

export function CtaSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
        {t('marketing.home.cta.title')}
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl">
        {t('marketing.home.cta.subtitle')}
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href={ROUTES.CHAT} className={buttonVariants({ size: 'lg' })}>
          {t('marketing.home.cta.ctaOpen')}
        </Link>
        <a
          href={MARKETING_GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: 'lg', variant: 'outline' })}
        >
          {t('marketing.home.cta.ctaGithub')}
        </a>
      </div>
    </section>
  );
}
