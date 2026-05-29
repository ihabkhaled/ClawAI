import { ROUTE_PERMISSIONS } from '@/constants/route-permissions.constants';
import type { Permission } from '@/enums';

// Returns the Permission required to view a given pathname, or null when the
// route is open to all authenticated users. ROUTE_PERMISSIONS is ordered
// longest-prefix-first, so the FIRST match is the most specific one. A prefix
// matches when the pathname equals it exactly OR begins with `${prefix}/`.
export function requiredPermissionForPath(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.permission ?? null;
}
