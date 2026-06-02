import type { SidebarItem } from '@/constants';
import type { BreadcrumbCrumb } from '@/types';

// Resolves which nav entry the given pathname belongs to: exact href match wins,
// otherwise the longest href that is a prefix of the pathname (so /chat/compare
// resolves to the /chat section). Returns null when nothing matches.
export function resolveActiveNavItem(
  items: SidebarItem[],
  pathname: string,
): SidebarItem | null {
  const flat: SidebarItem[] = items.flatMap((item) => [item, ...(item.children ?? [])]);

  let best: SidebarItem | null = null;
  for (const item of flat) {
    const matches = pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (matches && (best === null || item.href.length > best.href.length)) {
      best = item;
    }
  }

  return best;
}

// Builds the ancestor → current trail for the breadcrumb from the 2-level nav
// tree. A matched child yields [parent, child]; a matched top-level item yields
// [item]. Each crumb except the last is a clickable href. Returns [] when the
// pathname maps to nothing (breadcrumb then renders nothing).
export function resolveBreadcrumbTrail(
  items: SidebarItem[],
  pathname: string,
): BreadcrumbCrumb[] {
  const active = resolveActiveNavItem(items, pathname);
  if (active === null) {
    return [];
  }

  for (const parent of items) {
    const child = parent.children?.find((c) => c.href === active.href);
    if (child !== undefined) {
      return [
        { labelKey: parent.labelKey, href: parent.href },
        { labelKey: child.labelKey, href: child.href },
      ];
    }
  }

  return [{ labelKey: active.labelKey, href: active.href }];
}
