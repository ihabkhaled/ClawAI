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

// Built on the shadcn/ui Sheet (Radix Dialog) primitive, which already
// provides focus trapping, Escape-to-close, and focus restoration on close
// — the accessibility requirements for a mobile nav overlay are satisfied
// by the underlying primitive rather than hand-rolled here. `onNavigate`
// additionally closes the sheet on link activation.
export function MarketingMobileMenu({
  navLinks,
  isOpen,
  onOpenChange,
  onNavigate,
}: MarketingMobileMenuProps): React.ReactElement {
  const { t, dir } = useTranslation();
  // Sheet's `side` variant only understands physical left/right — flip it
  // here so the menu always slides in from the trailing (end) edge, which
  // is what "mirror correctly in RTL" means for a nav drawer.
  const side = dir === Direction.RTL ? 'left' : 'right';

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side={side} className="flex w-full flex-col gap-6 sm:max-w-xs">
        <SheetHeader>
          <SheetTitle>{t('marketing.header.menuTitle')}</SheetTitle>
        </SheetHeader>

        <nav aria-label={t('marketing.header.navLabel')} className="flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className="text-foreground text-base font-medium"
            >
              {t(link.labelKey)}
            </Link>
          ))}
          <a
            href={MARKETING_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="text-foreground text-base font-medium"
          >
            {t('marketing.header.github')}
          </a>
        </nav>

        <div className="border-border mt-auto flex flex-col gap-3 border-t pt-4">
          <div className="flex items-center gap-2">
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
