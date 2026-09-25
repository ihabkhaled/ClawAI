import { PLAN_FEATURE_REFUSAL_METADATA_TYPE } from '@/constants/upgrade-cta.constants';
import { PlanFeature } from '@/enums/plan-feature.enum';

const KNOWN_PLAN_FEATURES: ReadonlySet<string> = new Set(Object.values(PlanFeature));

function isPlanFeature(value: unknown): value is PlanFeature {
  return typeof value === 'string' && KNOWN_PLAN_FEATURES.has(value);
}

/**
 * The plan feature an assistant message was refused for, or null (ADR-122).
 * chat-service stores `{ type: 'plan_feature_disabled', planFeature }` instead
 * of starting a generation the user's plan does not include. An unknown
 * feature name reads as null, so a newer backend never renders a blank notice.
 */
export function readPlanFeatureRefusal(
  metadata: Record<string, unknown> | null,
): PlanFeature | null {
  if (metadata?.['type'] !== PLAN_FEATURE_REFUSAL_METADATA_TYPE) {
    return null;
  }
  const feature = metadata['planFeature'];
  return isPlanFeature(feature) ? feature : null;
}
