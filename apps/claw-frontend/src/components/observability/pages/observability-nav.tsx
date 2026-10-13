import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

import { OBSERVABILITY_NAV_ITEMS } from '@/constants/observability-pages.constants';
import { ROUTES } from '@/constants/routes.constants';
import { cn } from '@/lib/utils';
import type { ObservabilityNavProps } from '@/types/observability-pages.types';
import { withQuery } from '@/utilities/observability-url.utility';

/**
 * Sub-navigation between the Observability pages. Links carry the shared period
 * and filters, so moving from Users to Models keeps the view. It scrolls
 * sideways on a phone with a fade at the end edge, and the current page is
 * announced with `aria-current`, not colour alone.
 */
export function ObservabilityNav({
  canViewSystem,
  sharedQuery,
  t,
}: ObservabilityNavProps): ReactElement {
  const pathname = usePathname();
  const items = OBSERVABILITY_NAV_ITEMS.filter(
    (item) => item.requiresSystemView !== true || canViewSystem,
  );
  return (
    <nav aria-label={t('observabilityPages.navLabel')} className="min-w-0">
      <ul className="scroll-fade-inline-end flex min-w-0 scrollbar-none gap-1 overflow-x-auto border-b pb-px">
        {items.map((item) => {
          const active =
            item.href === ROUTES.OBSERVABILITY
              ? pathname === ROUTES.OBSERVABILITY
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.page} className="shrink-0">
              <Link
                href={withQuery(item.href, sharedQuery)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'focus-visible:ring-ring inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap focus-visible:ring-2 focus-visible:outline-none',
                  active
                    ? 'border-primary text-foreground'
                    : 'text-muted-foreground hover:text-foreground border-transparent',
                )}
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
