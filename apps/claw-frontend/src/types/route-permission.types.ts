import type { Permission, PlanFeature } from '@/enums';

// One entry in the route -> requirement map. `prefix` is the route prefix.
// Each entry MAY require a `permission`, a `feature` (plan-level gate), or
// both. An entry with neither field set is treated as open. ADMIN bypasses
// all checks. Sub-pages of a route inherit the entry via longest-prefix
// matching.
export type RoutePermission = {
  prefix: string;
  permission?: Permission;
  feature?: PlanFeature;
};

// Resolved requirement for a given pathname. Either field may be present;
// when both are present the user must satisfy BOTH (admin bypasses). A
// missing field means "no requirement on that dimension".
export type RouteRequirement = {
  permission?: Permission;
  feature?: PlanFeature;
};

// Return shape of useRoutePermissionGuard — whether the current pathname is
// allowed for the signed-in user and which requirements it carried (if any).
// `isLoading` reflects entitlements still in flight; callers should render a
// loader during this window rather than denying access.
export type UseRoutePermissionGuardReturn = {
  allowed: boolean;
  requiredPermission: Permission | null;
  requiredFeature: PlanFeature | null;
  isLoading: boolean;
};
