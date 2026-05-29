'use client';

import { useMemo } from 'react';

import type { SidebarItem } from '@/constants';
import { SIDEBAR_NAV_ITEMS } from '@/constants';
import { usePermissions } from '@/hooks/auth/use-permissions';
import type { UseSidebarVisibleItemsReturn } from '@/types';
import { filterSidebarItems } from '@/utilities/sidebar-visibility.utility';

// Controller hook that returns only the sidebar items the signed-in user is
// permitted to see. An item is visible when its route requires no permission
// OR the user holds it. Parents with children are kept only if the parent
// itself is allowed and at least one child remains visible.
export function useSidebarVisibleItems(): UseSidebarVisibleItemsReturn {
  const { can } = usePermissions();

  const items = useMemo<SidebarItem[]>(() => filterSidebarItems(SIDEBAR_NAV_ITEMS, can), [can]);

  return { items };
}
