import { usePathname } from 'next/navigation';
import { useCallback } from 'react';

import { useSidebarStore } from '@/stores/sidebar.store';
import type { UseMobileBottomNavReturn } from '@/types';

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

  const isActive = useCallback(
    (href: string): boolean => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  const handleOpenSidebar = useCallback((): void => {
    openSidebar();
  }, [openSidebar]);

  return { pathname, openSidebar: handleOpenSidebar, isActive };
}
