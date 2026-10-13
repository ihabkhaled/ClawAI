import { type PlanWithAccess } from '../../plans/types/plans.types';

// Plan-derived projections used by EntitlementsService.getForUser. ALLOW_ALL
// plans use an empty model list as the unrestricted routing hot path, so only
// enabled rows are returned; the access mode keeps an empty allow-list or
// DENY_ALL policy restrictive downstream.
export function pickAllowedModelAccess(plan: PlanWithAccess | null): PlanWithAccess['modelAccess'] {
  return (plan?.modelAccess ?? []).filter((m) => m.isAllowed);
}

// The dearest model the plan's free credit-connector requests cover (ADR-162).
// null = no limit, and always null for an administrator.
export function resolveFreeCreditCeiling(
  isAdmin: boolean,
  plan: PlanWithAccess | null,
): number | null {
  const ceiling = plan?.creditConnectorFreeMaxModelOutputMicroUsd;
  return isAdmin || ceiling === null || ceiling === undefined ? null : Number(ceiling);
}
