import type { SidebarItem } from '@/constants';
import type { Permission } from '@/enums';

import { requiredPermissionForPath } from './route-permission.utility';

// Pure helper: true when the item's route is open (no permission required) or
// the user holds the required permission.
function canAccessItem(item: SidebarItem, can: (permission: Permission) => boolean): boolean {
  const required = requiredPermissionForPath(item.href);
  return required === null || can(required);
}

// Filters the sidebar tree down to the items the user may see.
//
// Leaf items: kept when their own route is accessible (open or user holds the
// required permission).
//
// Parent items with children: if the parent route itself is NOT accessible
// (gated + user lacks the permission), hide the whole group. If the parent IS
// accessible, show it with only its visible children — even when no child
// survives, because the parent's own base route is still reachable.
export function filterSidebarItems(
  items: SidebarItem[],
  can: (permission: Permission) => boolean,
): SidebarItem[] {
  const visible: SidebarItem[] = [];

  for (const item of items) {
    const hasChildren = item.children !== undefined && item.children.length > 0;

    if (!canAccessItem(item, can)) {
      continue;
    }

    if (!hasChildren) {
      visible.push(item);
      continue;
    }

    const visibleChildren = filterSidebarItems(item.children ?? [], can);
    visible.push({ ...item, children: visibleChildren });
  }

  return visible;
}
