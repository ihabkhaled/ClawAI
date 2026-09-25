'use client';

import { Menu } from 'lucide-react';

import { MobileBottomNavItem } from '@/components/layout/mobile-bottom-nav-item';
import { Button } from '@/components/ui/button';
import { useMobileBottomNav } from '@/hooks/layout/use-mobile-bottom-nav';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function MobileBottomNav(): React.ReactElement {
  const { t } = useTranslation();
  const { items, openSidebar, isActive } = useMobileBottomNav();

  return (
    <nav
      aria-label={t('accessibility.navigation')}
      className={cn(
        // Shown whenever the sidenav is a drawer rather than a rail — see the
        // `nav-rail` variant in globals.css. `md:hidden` used to retire it at
        // 768px, which on a tablet was 768px before the rail actually arrived.
        // `short-viewport:hidden`: a phone in landscape has no height to give
        // it (globals.css), and the topbar's hamburger opens the same drawer.
        'surface-glass safe-bottom nav-rail:hidden short-viewport:hidden fixed inset-x-0 bottom-0 z-50',
        'rounded-none border-x-0 border-t border-b-0',
      )}
      style={{ height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[var(--mobile-bottom-nav-height)] items-stretch">
        {items.map((item) => (
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
              'touch:text-xs relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 px-1 text-center text-[10px] leading-tight font-medium sm:text-xs',
              'text-muted-foreground hover:text-foreground transition-colors',
              'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="max-w-full break-words whitespace-normal">{t('nav.more')}</span>
          </Button>
        </li>
      </ul>
    </nav>
  );
}
