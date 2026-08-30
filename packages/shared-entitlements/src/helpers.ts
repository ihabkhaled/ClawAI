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

/**
 * The per-day/per-account ceiling for one product limit, in the shape callers
 * pass to a repository: a number to enforce, or `null` for unlimited.
 *
 * THIS EXISTS BECAUSE `?? 0` IS WRONG HERE, AND WAS WRONG IN SIX PLACES.
 *
 * `null` on a plan limit means UNLIMITED — it is the value every paid tier
 * carries for `chatsPerDay`, `messagesPerDay`, `contextPacks`, `memoryItems`
 * and `workspaceConnections`. `??` only falls back on `null`/`undefined`, so
 * `limits.chatsPerDay ?? 0` turns "unlimited" into `0`, and `0` means DISABLED.
 * Every Pro, Team, Scale and Unlimited customer was refused their first thread
 * with `PLAN_DAILY_CHAT_LIMIT_EXCEEDED` — the most expensive plans were the
 * only ones broken, because they are the only ones that use `null`.
 *
 * The three states are genuinely distinct and must stay that way:
 * - `isAdmin`            → `null`, unlimited, never metered
 * - plan limit is `null` → `null`, unlimited by plan
 * - NO plan at all       → `0`, disabled, because an account with no plan has
 *                          no allowance to spend. This is the ONLY case `0` is
 *                          the right answer, and it is why the coalesce looked
 *                          plausible.
 */
export function resolvePlanLimit(
  ent: Pick<UserEntitlements, 'isAdmin' | 'plan'>,
  select: (limits: NonNullable<UserEntitlements['plan']>['limits']) => number | null,
): number | null {
  if (ent.isAdmin) {
    return null;
  }
  if (!ent.plan) {
    return 0;
  }
  return select(ent.plan.limits);
}
