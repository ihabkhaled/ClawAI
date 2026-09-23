import { usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { MOBILE_BOTTOM_NAV_ITEMS } from '@/constants/mobile-bottom-nav.constants';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useSidebarStore } from '@/stores/sidebar.store';
import type { MobileBottomNavItem, UseMobileBottomNavReturn } from '@/types';
import { filterMobileBottomNavItems } from '@/utilities/sidebar-visibility.utility';

/**
 * Controller hook for the mobile bottom navigation bar.
 *
 * Wires three pieces of state together for the renderer:
 * - `pathname`         current route (used to compute active state),
 * - `openSidebar`      opens the full sidebar drawer (powers the "More" button),
 * - `isActive(href)`   exact or descendant match against the current route.
 *
 * Active matching mirrors the sidebar's `SidebarNavItem` logic: a tab whose
 * href is a prefix of the current path (e.g. `/chat` for `/chat/abc-123`) is
 * still rendered active. This means the Chat tab stays highlighted on any
 * `/chat/...` sub-route.
 */
export function useMobileBottomNav(): UseMobileBottomNavReturn {
  const pathname = usePathname();
  const openSidebar = useSidebarStore((state) => state.open);
  const { can } = usePermissions();
  const { has } = usePlanFeatures();

  const items = useMemo<MobileBottomNavItem[]>(
    () => filterMobileBottomNavItems(MOBILE_BOTTOM_NAV_ITEMS, can, has),
    [can, has],
  );

  const isActive = useCallback(
    (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  const handleOpenSidebar = useCallback((): void => {
    openSidebar();
  }, [openSidebar]);

  return { items, pathname, openSidebar: handleOpenSidebar, isActive };
}
