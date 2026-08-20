'use client';

import Link from 'next/link';

import { MarketingLocaleSwitcher } from '@/components/marketing/marketing-locale-switcher';
import { MarketingThemeToggle } from '@/components/marketing/marketing-theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MARKETING_GITHUB_URL, ROUTES } from '@/constants';
import { Direction } from '@/enums/direction.enum';
import { useTranslation } from '@/lib/i18n';
import type { MarketingMobileMenuProps } from '@/types';

export function MarketingMobileMenu({
  navLinks,
  isOpen,
  onOpenChange,
  onNavigate,
}: MarketingMobileMenuProps): React.ReactElement {
  const { t, dir } = useTranslation();
  const side = dir === Direction.RTL ? 'left' : 'right';
  const navItemClass =
    'text-foreground flex min-h-11 w-full items-center rounded-lg px-3 py-2 text-base font-medium transition-colors hover:bg-accent active:bg-accent';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="flex w-full flex-col gap-4 sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>{t('marketing.header.menuTitle')}</SheetTitle>
        </SheetHeader>

        <nav aria-label={t('marketing.header.navLabel')} className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={onNavigate} className={navItemClass}>
              {t(link.labelKey)}
            </Link>
          ))}
          <a href={MARKETING_GITHUB_URL} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={navItemClass}>
            {t('marketing.header.github')}
          </a>
        </nav>

        <div className="border-border mt-auto flex flex-col gap-3 border-t pt-4">
          <div className="flex min-h-11 items-center gap-2">
            <MarketingLocaleSwitcher />
            <MarketingThemeToggle />
          </div>
          <Button variant="outline" asChild onClick={onNavigate}>
            <Link href={ROUTES.LOGIN}>{t('marketing.header.login')}</Link>
          </Button>
          <Button asChild onClick={onNavigate}>
            <Link href={ROUTES.REGISTER}>{t('marketing.header.createAccount')}</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
