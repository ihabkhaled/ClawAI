'use client';

import { Menu } from 'lucide-react';

import { MobileBottomNavItem } from '@/components/layout/mobile-bottom-nav-item';
import { Button } from '@/components/ui/button';
import { MOBILE_BOTTOM_NAV_ITEMS } from '@/constants';
import { useMobileBottomNav } from '@/hooks/layout/use-mobile-bottom-nav';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function MobileBottomNav(): React.ReactElement {
  const { t } = useTranslation();
  const { openSidebar, isActive } = useMobileBottomNav();

  return (
    <nav
      aria-label={t('accessibility.navigation')}
      className={cn(
        'surface-glass safe-bottom fixed inset-x-0 bottom-0 z-50 md:hidden',
        'rounded-none border-x-0 border-t border-b-0',
      )}
      style={{ height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[var(--mobile-bottom-nav-height)] items-stretch">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
          <li key={item.id} className="flex min-w-0 flex-1">
            <MobileBottomNavItem item={item} isActive={isActive(item.href)} />
          </li>
        ))}
        <li className="flex min-w-0 flex-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={openSidebar}
            aria-label={t('nav.more')}
            className={cn(
              'relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 px-1 text-center text-[10px] font-medium leading-tight sm:text-xs',
              'text-muted-foreground hover:text-foreground transition-colors',
              'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="max-w-full whitespace-normal break-words">{t('nav.more')}</span>
          </Button>
        </li>
      </ul>
    </nav>
  );
}
