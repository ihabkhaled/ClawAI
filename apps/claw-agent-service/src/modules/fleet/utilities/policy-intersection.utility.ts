import { UNCONSTRAINED_POLICY } from '../constants/organization-policy.constants';
import { POLICY_PERMISSION_MODES, POLICY_RISK_CLASSES } from '../dto/organization-policy.dto';

import type { EffectivePolicy } from '../types/organization-policy.types';

/**
 * An empty allowlist means "everything", so intersecting two of them cannot be
 * a plain set intersection: `[] ∩ ['a']` must be `['a']`, not `[]`.
 */
function intersectAllowList(left: readonly string[], right: readonly string[]): string[] {
  if (left.length === 0) return [...right];
  if (right.length === 0) return [...left];
  const rightSet = new Set(right);
  return left.filter((entry) => rightSet.has(entry));
}

function union(left: readonly string[], right: readonly string[]): string[] {
  return [...new Set([...left, ...right])];
}

function strictestRisk(left: string, right: string): string {
  const rank = (value: string): number => {
    const index = POLICY_RISK_CLASSES.indexOf(value as (typeof POLICY_RISK_CLASSES)[number]);
    return index === -1 ? POLICY_RISK_CLASSES.length - 1 : index;
  };
  return rank(left) <= rank(right) ? left : right;
}

/**
 * The strictest floor wins, and an unset floor constrains nothing.
 *
 * `PLAN` is the most constraining mode and sits first in the list, so a lower
 * index is stricter — the same direction as risk, deliberately, so a reader
 * does not have to remember two orderings.
 */
function strictestMode(left: string | null, right: string | null): string | null {
  if (left === null) return right;
  if (right === null) return left;
  const rank = (value: string): number => {
    const index = POLICY_PERMISSION_MODES.indexOf(
      value as (typeof POLICY_PERMISSION_MODES)[number],
    );
    return index === -1 ? POLICY_PERMISSION_MODES.length - 1 : index;
  };
  return rank(left) <= rank(right) ? left : right;
}

/**
 * Combines every organization the user belongs to into one policy.
 *
 * Always the stricter of each pair. A user in a permissive organization and a
 * strict one must not be able to escape the strict one by holding both
 * memberships, which is exactly what a union or a "most recent wins" rule would
 * allow. The result is therefore never weaker than any single input, and a user
 * in no organization gets `UNCONSTRAINED_POLICY`.
 */
export function intersectPolicies(policies: readonly EffectivePolicy[]): EffectivePolicy {
  return policies.reduce<EffectivePolicy>(
    (accumulated, policy) => ({
      allowedTools: intersectAllowList(accumulated.allowedTools, policy.allowedTools),
      allowedModels: intersectAllowList(accumulated.allowedModels, policy.allowedModels),
      maximumRisk: strictestRisk(accumulated.maximumRisk, policy.maximumRisk),
      // Denials and required approvals are unions: anything either organization
      // refuses stays refused.
      deniedEffects: union(accumulated.deniedEffects, policy.deniedEffects),
      requireApproval: union(accumulated.requireApproval, policy.requireApproval),
      maximumRetentionDays: Math.min(accumulated.maximumRetentionDays, policy.maximumRetentionDays),
      minimumPermissionMode: strictestMode(
        accumulated.minimumPermissionMode,
        policy.minimumPermissionMode,
      ),
    }),
    UNCONSTRAINED_POLICY,
  );
}

/**
 * Narrows a stored row to the shape a client is given.
 *
 * The row's `id`, `organizationId` and timestamps are dropped on purpose: a
 * member of two organizations must not learn one's identity from the other's
 * policy.
 */
export function toEffectivePolicy(policy: {
  allowedTools: string[];
  allowedModels: string[];
  maximumRisk: string;
  deniedEffects: string[];
  requireApproval: string[];
  maximumRetentionDays: number;
  minimumPermissionMode: string | null;
}): EffectivePolicy {
  return {
    allowedTools: policy.allowedTools,
    allowedModels: policy.allowedModels,
    maximumRisk: policy.maximumRisk,
    deniedEffects: policy.deniedEffects,
    requireApproval: policy.requireApproval,
    maximumRetentionDays: policy.maximumRetentionDays,
    minimumPermissionMode: policy.minimumPermissionMode,
  };
}
