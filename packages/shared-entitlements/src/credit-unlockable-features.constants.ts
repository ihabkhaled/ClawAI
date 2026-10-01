import { type PlanFeature } from './types';

/**
 * Plan features a user with spendable PAYG credit may use even when the plan
 * gate is closed (ADR-139). The spend itself is still refused by the PAYG
 * reservation when the balance cannot cover the hold. Add a feature here only
 * on an explicit product decision.
 */
export const CREDIT_UNLOCKABLE_FEATURES: ReadonlySet<PlanFeature> = new Set<PlanFeature>([
  'allowImageGeneration',
]);
