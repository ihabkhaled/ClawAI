'use client';

import { useMemo } from 'react';

import type { SidebarItem } from '@/constants';
import { SIDEBAR_NAV_ITEMS } from '@/constants';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { usePlanFeatures } from '@/hooks/auth/use-plan-features';
import { useServiceAvailability } from '@/hooks/health/use-service-availability';
import type { UseSidebarVisibleItemsReturn } from '@/types';
import { applyServiceAvailability } from '@/utilities/service-availability.utility';
import { filterSidebarItems } from '@/utilities/sidebar-visibility.utility';

// Controller hook that returns only the sidebar items the signed-in user is
// permitted to see. An item is visible when its route requires no permission
// and no plan feature, OR the user holds both required dimensions. Parents
// with children are kept only if the parent itself is allowed; admin
// implicitly satisfies every permission and every plan feature gate.
export function useSidebarVisibleItems(): UseSidebarVisibleItemsReturn {
  const { can, isSuperAdmin } = usePermissions();
  const { has } = usePlanFeatures();
  const { health, isLoading } = useServiceAvailability();

  const items = useMemo<SidebarItem[]>(() => {
    const visible = filterSidebarItems(SIDEBAR_NAV_ITEMS, can, has, isSuperAdmin);
    return isLoading ? visible : applyServiceAvailability(visible, health);
  }, [can, has, health, isLoading, isSuperAdmin]);

  return { items };
}
