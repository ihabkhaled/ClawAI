import { type Permission, PlanModelAccessMode } from '@claw/shared-types';
import { ModelUsageType, type PlanFeature, type UserEntitlements } from './types';

const DENY_ALL_ROUTING_KEY = '__CLAW_PLAN_DENY_ALL__';

// ADMIN implicitly holds every permission.
export function hasPermission(ent: UserEntitlements, permission: Permission): boolean {
  if (ent.isAdmin) {
    return true;
  }
  return ent.permissions.includes(permission);
}

export function hasPlanFeature(ent: UserEntitlements, feature: PlanFeature): boolean {
  if (ent.isAdmin) {
    return true;
  }
  return ent.plan?.featureGates[feature] ?? false;
}

// Is the given provider/model allowed for a usage type? ADMIN bypasses.
export function isModelAllowedForUsage(
  ent: UserEntitlements,
  provider: string,
  model: string,
  usage: ModelUsageType,
): boolean {
  if (ent.isAdmin) {
    return true;
  }
  if (
    ent.modelAccessMode === PlanModelAccessMode.ALLOW_ALL ||
    ent.modelAccessMode === PlanModelAccessMode.LEGACY_UNRESTRICTED
  ) {
    return true;
  }
  if (ent.modelAccessMode === PlanModelAccessMode.DENY_ALL) {
    return false;
  }
  if (ent.modelAccessMode === undefined && ent.allowedModels.length === 0) {
    return true;
  }
  const entry = ent.allowedModels.find(
    (m) => m.provider === provider && m.model === model && m.isAllowed,
  );
  if (!entry) {
    return false;
  }
  switch (usage) {
    case ModelUsageType.PRIMARY:
      return entry.allowAsPrimary;
    case ModelUsageType.FALLBACK:
      return entry.allowAsFallback;
    case ModelUsageType.JUDGE:
      return entry.allowAsJudge;
    case ModelUsageType.COMPARE:
      return entry.allowInCompare;
  }
}

// Flatten allowed models to "provider/model" keys the router can filter on.
// Empty is reserved for explicit/legacy unrestricted access.
export function allowedModelKeys(ent: UserEntitlements): string[] {
  if (
    ent.modelAccessMode === PlanModelAccessMode.ALLOW_ALL ||
    ent.modelAccessMode === PlanModelAccessMode.LEGACY_UNRESTRICTED ||
    (ent.modelAccessMode === undefined && ent.allowedModels.length === 0)
  ) {
    return [];
  }
  const keys = ent.allowedModels
    .filter((model) => model.isAllowed)
    .map((model) => `${model.provider}/${model.model}`);
  return keys.length === 0 ? [DENY_ALL_ROUTING_KEY] : keys;
}
