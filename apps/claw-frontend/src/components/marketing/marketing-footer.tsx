'use client';

import Image from 'next/image';
import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { APP_VERSION, MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import { getConfiguredSocialLinks, getPublishedPagesForLocale } from '@/utilities';

// Server-renderable content is computed at module scope (registry + social
// config are both static per build), so only the two truly interactive
// leaves (locale switcher) need 'use client' — this component still needs
// it too because useTranslation is a context hook, but no data fetching
// happens here.
export function MarketingFooter(): React.ReactElement {
  const { t, locale } = useTranslation();
  const year = new Date().getFullYear();
  const socialLinks = getConfiguredSocialLinks();
  // Every published page besides the homepage itself — Phase A has none,
  // Phase B populates this as pages flip from PLANNED to PUBLISHED.
  const dedicatedGetStartedPaths = new Set(['/', '/contact', '/pricing']);
  const explorePages = getPublishedPagesForLocale(locale).filter(
    (page) => !dedicatedGetStartedPaths.has(page.canonicalPath),
  );

  return (
    <footer className="border-border bg-surface-shell border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
