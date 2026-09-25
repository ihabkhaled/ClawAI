'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { APP_VERSION, MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import { COMPARISON_HUB_PATH } from '@/constants/public-comparison.constants';
import { useTranslation } from '@/lib/i18n';
import type { MarketingFooterProps } from '@/types';
import { getConfiguredSocialLinks } from '@/utilities/social-links.utility';

// Registry-derived links arrive as PROPS, resolved by the server layout.
//
// This component needs 'use client' for useTranslation, and calling
// getPublishedPagesForLocale/getComparisonContent from here dragged the whole
// content registry into the client bundle — and with it every marketing
// cluster's long-form prose in all 13 languages. The markup below is
// unchanged; only the origin of the data moved.
export function MarketingFooter({
  explorePages,
  featurePages,
  comparisons,
  comparisonsHeading,
}: MarketingFooterProps): React.ReactElement {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const socialLinks = getConfiguredSocialLinks();

  return (
    <footer className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-6">
          <div className="sm:col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Image src="/claw-logo.png" alt="" width={28} height={28} aria-hidden="true" />
              <span>ClawAI</span>
            </Link>
            <p className="text-muted-foreground mt-3 max-w-sm text-sm">
              {t('marketing.footer.tagline')}
            </p>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">
              {t('marketing.footer.resourcesHeading')}
            </h2>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                <a
                  href={MARKETING_GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {t('marketing.footer.github')}
                </a>
              </li>
              <li>
                <a
                  href={`${MARKETING_GITHUB_URL}/tree/main/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  {t('marketing.footer.documentation')}
                </a>
              </li>
              {explorePages.map((page) => (
                <li key={page.slug}>
                  <Link href={page.canonicalPath} className="hover:text-foreground">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">
              {t('marketing.footer.featuresHeading')}
            </h2>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              {featurePages.map((page) => (
                <li key={page.slug}>
                  <Link href={page.canonicalPath} className="hover:text-foreground">
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">{comparisonsHeading}</h2>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                <Link href={COMPARISON_HUB_PATH} className="hover:text-foreground">
                  {t('marketing.header.navCompare')}
                </Link>
              </li>
              {comparisons.map((item) => (
                <li key={item.rival}>
                  <Link href={item.path} className="hover:text-foreground">
                    {item.summary}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-foreground text-sm font-semibold">
              {t('marketing.footer.getStartedHeading')}
            </h2>
            <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
              <li>
                <Link href={ROUTES.REGISTER} className="hover:text-foreground">
                  {t('marketing.header.createAccount')}
                </Link>
              </li>
              <li>
                <Link href={ROUTES.LOGIN} className="hover:text-foreground">
                  {t('marketing.header.login')}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-foreground">
                  {t('marketing.header.navPricing')}
                </Link>
              </li>
              <li>
                <Link href={ROUTES.CONTACT} className="hover:text-foreground">
                  {t('marketing.footer.enterpriseContact')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border mt-10 flex flex-col items-start gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-xs">
            {t('marketing.footer.copyright', { year, version: APP_VERSION })}
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.platform}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-xs"
              >
                {t(social.labelKey)}
              </a>
            ))}
            <MarketingLocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}
