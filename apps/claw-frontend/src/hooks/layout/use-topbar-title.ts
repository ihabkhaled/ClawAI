import { usePathname } from 'next/navigation';

import { useSidebarVisibleItems } from '@/hooks/layout/use-sidebar-visible-items';
import { useTranslation } from '@/lib/i18n';
import { resolveActiveNavItem } from '@/utilities/topbar-title.utility';

// Derives the current page title from the RBAC-filtered nav model. Sub-routes
// that are not themselves nav entries (e.g. /chat/compare) resolve to their
// parent section title. Returns '' when nothing matches so the topbar hides it.
export function useTopbarTitle(): string {
  const pathname = usePathname();
  const { items } = useSidebarVisibleItems();
  const { t } = useTranslation();

  const active = resolveActiveNavItem(items, pathname);
  return active === null ? '' : t(active.labelKey);
}
