import type { EffectivePolicy } from '../types/organization-policy.types';

/**
 * The widest possible policy: what a client sees when no organization
 * constrains it.
 *
 * Stated explicitly rather than returned as `null`, because a client that has
 * to distinguish "no policy" from "an unconstrained policy" will eventually get
 * that distinction wrong in the permissive direction.
 */
export const UNCONSTRAINED_POLICY: EffectivePolicy = {
  allowedTools: [],
  allowedModels: [],
  maximumRisk: 'R4',
  deniedEffects: [],
  requireApproval: [],
  maximumRetentionDays: 3_650,
  minimumPermissionMode: null,
};
