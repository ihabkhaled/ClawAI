import { usePathname } from 'next/navigation';

import { useSidebarVisibleItems } from '@/hooks/layout/use-sidebar-visible-items';
import { useTranslation } from '@/lib/i18n';
import type { ResolvedCrumb, TranslateFunction } from '@/types';
import { resolveBreadcrumbTrail } from '@/utilities/topbar-title.utility';

// Builds the translated breadcrumb trail for the current route from the
// RBAC-filtered nav model. Returns [] for top-level / unmatched routes so the
// Breadcrumb component can render nothing (a single crumb is just the page
// title, already shown in the topbar, so we suppress trails of length < 2).
export function useBreadcrumb(): ResolvedCrumb[] {
  const pathname = usePathname();
  const { items } = useSidebarVisibleItems();
  const { t }: { t: TranslateFunction } = useTranslation();

  const trail = resolveBreadcrumbTrail(items, pathname);
  if (trail.length < 2) {
    return [];
  }

  return trail.map((crumb, index) => ({
    label: t(crumb.labelKey),
    href: crumb.href,
    isCurrent: index === trail.length - 1,
  }));
}
