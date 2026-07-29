'use client';

import { Menu } from 'lucide-react';

import { MobileBottomNavItem } from '@/components/layout/mobile-bottom-nav-item';
import { Button } from '@/components/ui/button';
import { MOBILE_BOTTOM_NAV_ITEMS } from '@/constants';
import { useMobileBottomNav } from '@/hooks/layout/use-mobile-bottom-nav';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Mobile bottom navigation bar.
 *
 * Spec compliance (section 2.1):
 * - sticky bottom, `z-50`, `md:hidden` (hidden on tablet/desktop),
 * - height bound to `--mobile-bottom-nav-height` (CSS var, defaults 4rem),
 * - frosted glass surface via `.surface-glass`,
 * - safe-area inset baked in via `.safe-bottom`,
 * - 4 primary tabs (Chat / Models / Files / Context) followed by a "More"
 *   button that opens the full sidebar drawer.
 *
 * Accessibility:
 * - rendered as a `<nav>` with an aria-label,
 * - each active tab carries `aria-current="page"` (set by the child),
 * - hit targets are at least 44×44px (min-h-11 + flex-1 width).
 *
 * Visibility is controlled at the layout level by `md:hidden` — desktop users
 * never see this bar, and the portal main wrapper compensates with
 * `padding-bottom` of the same CSS var so the chat composer + FAB are not
 * obscured.
 */
export function MobileBottomNav(): React.ReactElement {
  const { t } = useTranslation();
  const { openSidebar, isActive } = useMobileBottomNav();

  return (
    <nav
      aria-label={t('accessibility.navigation')}
      className={cn(
        'surface-glass safe-bottom fixed inset-x-0 bottom-0 z-50 md:hidden',
        // override .surface-glass radius so the bar hugs the screen edges
        'rounded-none border-x-0 border-t border-b-0',
      )}
      style={{ height: 'calc(var(--mobile-bottom-nav-height) + env(safe-area-inset-bottom))' }}
    >
      <ul className="flex h-[var(--mobile-bottom-nav-height)] items-stretch">
        {MOBILE_BOTTOM_NAV_ITEMS.map((item) => (
          <li key={item.id} className="flex flex-1">
            <MobileBottomNavItem item={item} isActive={isActive(item.href)} />
          </li>
        ))}
        <li className="flex flex-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={openSidebar}
            aria-label={t('nav.more')}
            className={cn(
              'relative flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 px-1 text-xs font-medium',
              'text-muted-foreground hover:text-foreground transition-colors',
              'focus-visible:ring-primary/40 focus-visible:ring-2 focus-visible:outline-none',
            )}
          >
            <Menu className="h-5 w-5 shrink-0" />
            <span className="truncate">{t('nav.more')}</span>
          </Button>
        </li>
      </ul>
    </nav>
  );
}
