import { ROUTE_PERMISSIONS } from '@/constants/route-permissions.constants';
import type { Permission } from '@/enums';
import type { RouteRequirement } from '@/types';

// Returns the requirement (Permission and/or PlanFeature) needed to view a
// given pathname, or null when the route is open to all authenticated users.
// ROUTE_PERMISSIONS is ordered longest-prefix-first, so the FIRST match is
// the most specific one. A prefix matches when the pathname equals it exactly
// OR begins with `${prefix}/`. The returned object only contains the keys
// declared on the matched entry — `permission` and `feature` are independent
// and either, both, or neither may be present.
export function requiredRequirementForPath(pathname: string): RouteRequirement | null {
  const match = ROUTE_PERMISSIONS.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  if (!match) {
    return null;
  }
  if (match.permission === undefined && match.feature === undefined) {
    return null;
  }
  return {
    ...(match.permission === undefined ? {} : { permission: match.permission }),
    ...(match.feature === undefined ? {} : { feature: match.feature }),
  };
}

// Back-compat shim: returns only the Permission required by a path, ignoring
// any feature gate. Existing callers (and the existing test suite) rely on
// this thin facade. New code should prefer `requiredRequirementForPath`.
export function requiredPermissionForPath(pathname: string): Permission | null {
  return requiredRequirementForPath(pathname)?.permission ?? null;
}
