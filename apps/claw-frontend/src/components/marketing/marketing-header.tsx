'use client';

import { Menu } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { MarketingMobileMenu } from '@/components/marketing/marketing-mobile-menu';
import { MarketingThemeToggle } from '@/components/marketing/marketing-theme-toggle';
import { Button } from '@/components/ui/button';
import { MARKETING_GITHUB_URL, MARKETING_NAV_LINKS, ROUTES } from '@/constants';
import { useMarketingMobileMenu } from '@/hooks/marketing/use-marketing-mobile-menu';
import { useTranslation } from '@/lib/i18n';

export function MarketingHeader(): React.ReactElement {
  const { t } = useTranslation();
  const { isOpen, setIsOpen, close } = useMarketingMobileMenu();

  return (
    <header className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <Image src="/claw-logo.svg" alt="" width={32} height={32} aria-hidden="true" priority />
          <span className="text-base">ClawAI</span>
        </Link>

        <nav
          aria-label={t('marketing.header.navLabel')}
          className="hidden items-center gap-6 md:flex"
        >
          {MARKETING_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <a href={MARKETING_GITHUB_URL} target="_blank" rel="noopener noreferrer">
              {t('marketing.header.github')}
            </a>
          </Button>
          <MarketingLocaleSwitcher />
          <MarketingThemeToggle />
          <Button variant="ghost" size="sm" asChild>
            <Link href={ROUTES.LOGIN}>{t('marketing.header.login')}</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={ROUTES.CHAT}>{t('marketing.header.openClaw')}</Link>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-label={t('marketing.header.menuOpen')}
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <MarketingMobileMenu
        navLinks={MARKETING_NAV_LINKS}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onNavigate={close}
      />
    </header>
  );
}
