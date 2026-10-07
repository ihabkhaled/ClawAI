'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import { MARKETING_THREADS_STEPS } from '@/constants/marketing-home.constants';
import {
  THREADS_DISCOVER_PATH,
  THREADS_MARKETING_PATH,
  THREADS_PORTAL_PATH,
} from '@/constants/threads-marketing.constants';
import { useTranslation } from '@/lib/i18n';

/**
 * ClawAI Threads, on the homepage, with its four steps.
 *
 * It sits between the feature grid and the editor band: it is the newest flagship, and a visitor
 * who has just read what ClawAI does is ready to see something they can make with it.
 */
export function ThreadsBandSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="threads" className="border-border bg-muted/30 border-y">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            {t('marketing.home.threads.eyebrow')}
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.threads.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.threads.body')}</p>
        </div>

        <ol className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MARKETING_THREADS_STEPS.map((step, index) => (
            <li key={step.titleKey} className="border-border bg-card rounded-xl border p-5">
              <span
                aria-hidden="true"
                className="bg-primary text-primary-foreground mb-3 inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold"
              >
                {index + 1}
              </span>
              <h3 className="text-foreground font-medium">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href={THREADS_PORTAL_PATH} className={buttonVariants({ size: 'lg' })}>
            {t('marketing.home.threads.ctaCreate')}
          </Link>
          <Link
            href={THREADS_MARKETING_PATH}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.home.threads.ctaLearnMore')}
          </Link>
          <Link
            href={THREADS_DISCOVER_PATH}
            className={buttonVariants({ size: 'lg', variant: 'ghost' })}
          >
            {t('marketing.home.threads.ctaDiscover')}
          </Link>
        </div>
      </div>
    </section>
  );
}
