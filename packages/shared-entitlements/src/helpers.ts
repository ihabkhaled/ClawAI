import type { Permission } from '@claw/shared-types';
import { ModelUsageType, type PlanFeature, type UserEntitlements } from './types';

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

// Is the given provider/model allowed for a usage type? ADMIN bypasses. An
// empty allowedModels list means "no restriction configured" → allow all.
export function isModelAllowedForUsage(
  ent: UserEntitlements,
  provider: string,
  model: string,
  usage: ModelUsageType,
): boolean {
  if (ent.isAdmin) {
    return true;
  }
  if (ent.allowedModels.length === 0) {
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
// Empty result means "no restriction" — callers must treat [] as allow-all.
export function allowedModelKeys(ent: UserEntitlements): string[] {
  return ent.allowedModels.filter((m) => m.isAllowed).map((m) => `${m.provider}/${m.model}`);
}
