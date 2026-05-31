import type { SidebarItem } from '@/constants';

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
