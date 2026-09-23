import type { SidebarItem } from '@/constants';
import type { Permission, PlanFeature } from '@/enums';

import { requiredRequirementForPath } from './route-permission.utility';

// Pure helper: true when the item's route is open (no requirement) or the
// user satisfies EVERY declared requirement on it. ADMIN bypasses both
// dimensions via the caller's predicates (the hooks supply admin-bypassing
// implementations).
function canAccessItem(
  item: SidebarItem,
  canPermission: (permission: Permission) => boolean,
  canFeature: (feature: PlanFeature) => boolean,
  isSuperAdmin: boolean,
): boolean {
  if (item.superAdminOnly === true && !isSuperAdmin) {
    return false;
  }
  const required = requiredRequirementForPath(item.href);
  if (required === null) {
    return true;
  }
  if (required.permission !== undefined && !canPermission(required.permission)) {
    return false;
  }
  if (required.feature !== undefined && !canFeature(required.feature)) {
    return false;
  }
  return true;
}

// Filters the flat mobile bottom-nav tabs with the SAME route requirements the
// sidebar uses. The bottom nav used to render its four tabs unconditionally,
// so a Free user saw "Models" on a phone although the sidebar hid it and the
// page itself refused them.
export function filterMobileBottomNavItems<T extends { href: string }>(
  items: readonly T[],
  canPermission: (permission: Permission) => boolean,
  canFeature: (feature: PlanFeature) => boolean,
): T[] {
  return items.filter((item) => {
    const required = requiredRequirementForPath(item.href);
    if (required === null) {
      return true;
    }
    if (required.permission !== undefined && !canPermission(required.permission)) {
      return false;
    }
    return required.feature === undefined || canFeature(required.feature);
  });
}

// Filters the sidebar tree down to the items the user may see.
//
// Leaf items: kept when their own route is accessible (open or the user
// satisfies every declared requirement).
//
// Parent items with children: if the parent route itself is NOT accessible
// (gated + user lacks the requirement), hide the whole group. If the parent
// IS accessible, show it with only its visible children — even when no child
// survives, because the parent's own base route is still reachable.
export function filterSidebarItems(
  items: SidebarItem[],
  canPermission: (permission: Permission) => boolean,
  canFeature: (feature: PlanFeature) => boolean,
  isSuperAdmin = false,
): SidebarItem[] {
  const visible: SidebarItem[] = [];

  for (const item of items) {
    const hasChildren = item.children !== undefined && item.children.length > 0;

    if (!canAccessItem(item, canPermission, canFeature, isSuperAdmin)) {
      continue;
    }

    if (!hasChildren) {
      visible.push(item);
      continue;
    }

    const visibleChildren = filterSidebarItems(
      item.children ?? [],
      canPermission,
      canFeature,
      isSuperAdmin,
    );
    visible.push({ ...item, children: visibleChildren });
  }

  return visible;
}
