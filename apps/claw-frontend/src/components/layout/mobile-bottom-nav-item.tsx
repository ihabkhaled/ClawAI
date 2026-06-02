'use client';

import Link from 'next/link';

import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { MobileBottomNavLinkProps } from '@/types/mobile-bottom-nav.types';

/**
 * Single tab inside the mobile bottom navigation bar.
 *
 * Active state rendering (per spec section 2.1):
 * - text + icon use `text-primary`
 * - icon scales to 110%
 * - a thin primary bar slides across the top edge of the tab
 *
 * The tab itself is always at least 44px tall to satisfy WCAG 2.5.5 touch
 * target sizing; the bar uses `top-0` so it visually anchors the active state
 * to the nav bar's edge.
 */
export function MobileBottomNavItem({
  item,
  isActive,
}: MobileBottomNavLinkProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <Link
      href={item.href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex h-full min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {/* Top active-indicator: centered glowing pill (rendered only when active
          so it never paints over inactive tabs). */}
      {isActive ? (
        <span
          aria-hidden
          className="absolute left-1/2 top-0 h-1 w-6 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
        />
      ) : null}
      <item.icon
        className={cn(
          'h-5 w-5 shrink-0 transition-transform duration-150 motion-reduce:transition-none',
          isActive ? 'scale-110 motion-reduce:scale-100' : 'scale-100',
        )}
      />
      <span className="truncate">{t(item.labelKey)}</span>
    </Link>
  );
}
