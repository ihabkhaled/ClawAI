import { type PlanFeatureRule } from '../../../generated/prisma';

/** The editable part of a plan feature rule: how it is enforced, how much, and per which window. */
export type FeatureRuleValues = Pick<PlanFeatureRule, 'accessMode' | 'limit' | 'window'>;
