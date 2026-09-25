'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { HomeValueBandSectionProps } from '@/types/marketing.types';

/**
 * One homepage positioning band — the pay-as-you-go and teams bands share it.
 * Same layout as the coding-agent and organisations bands, so the page reads
 * as one rhythm. Copy and links arrive as a config object from
 * `marketing-home.constants.ts`.
 */
export function HomeValueBandSection({ band }: HomeValueBandSectionProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id={band.id} className="border-border border-y">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            {t(band.eyebrowKey)}
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t(band.titleKey)}
          </h2>
          <p className="text-muted-foreground mt-4">{t(band.bodyKey)}</p>
        </div>

        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
          {band.points.map((point) => (
            <div key={point.titleKey}>
              <dt className="text-foreground font-medium">{t(point.titleKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(point.bodyKey)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={band.primaryLink.href} className={buttonVariants({ size: 'lg' })}>
            {t(band.primaryLink.labelKey)}
          </Link>
          <Link
            href={band.secondaryLink.href}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t(band.secondaryLink.labelKey)}
          </Link>
        </div>
      </div>
    </section>
  );
}
