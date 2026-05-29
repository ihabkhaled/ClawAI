import type { Permission } from '@/enums';

// One entry in the route -> permission map. `prefix` is the route prefix and
// `permission` is the Permission required to view any page under it.
export type RoutePermission = {
  prefix: string;
  permission: Permission;
};

// Return shape of useRoutePermissionGuard — whether the current pathname is
// allowed for the signed-in user and the permission it required (if any).
export type UseRoutePermissionGuardReturn = {
  allowed: boolean;
  requiredPermission: Permission | null;
};
