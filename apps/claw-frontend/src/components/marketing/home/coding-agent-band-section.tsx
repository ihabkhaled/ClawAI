'use client';

import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';
import {
  CODING_AGENT_INSTALL_PATH,
  CODING_AGENT_MARKETPLACE_URL,
  CODING_AGENT_PATH,
} from '@/constants/coding-agent.constants';
import { MARKETING_CODING_AGENT_POINTS } from '@/constants/marketing-home.constants';
import { useTranslation } from '@/lib/i18n';

/**
 * The editor extension, on the homepage.
 *
 * It earns a band rather than a bullet in the features grid because it is the
 * one thing here a developer can act on immediately without an account
 * decision: they already have the editor open. Everything else on this page
 * asks them to sign up first.
 */
export function CodingAgentBandSection(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <section id="coding-agent" className="border-border border-y">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-primary text-xs font-semibold tracking-wide uppercase">
            {t('marketing.home.codingAgent.eyebrow')}
          </p>
          <h2 className="text-foreground mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {t('marketing.home.codingAgent.title')}
          </h2>
          <p className="text-muted-foreground mt-4">{t('marketing.home.codingAgent.body')}</p>
        </div>

        <dl className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-3">
          {MARKETING_CODING_AGENT_POINTS.map((point) => (
            <div key={point.titleKey}>
              <dt className="text-foreground font-medium">{t(point.titleKey)}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm">{t(point.bodyKey)}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {/* The Marketplace link is primary and opens in a new tab: somebody
              reading the homepage is not finished with it, and the install is a
              side errand. */}
          <Link
            href={CODING_AGENT_MARKETPLACE_URL}
            className={buttonVariants({ size: 'lg' })}
            rel="noopener noreferrer"
            target="_blank"
          >
            {t('marketing.home.codingAgent.ctaInstall')}
          </Link>
          <Link
            href={CODING_AGENT_PATH}
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            {t('marketing.home.codingAgent.ctaLearnMore')}
          </Link>
          <Link
            href={CODING_AGENT_INSTALL_PATH}
            className={buttonVariants({ size: 'lg', variant: 'ghost' })}
          >
            {t('marketing.home.codingAgent.ctaInstallGuide')}
          </Link>
        </div>
      </div>
    </section>
  );
}
