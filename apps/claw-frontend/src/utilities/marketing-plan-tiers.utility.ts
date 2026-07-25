import { MARKETING_COMPACT_PLAN_SLUGS } from '@/constants/marketing-home.constants';
import { MARKETING_PLAN_TIERS } from '@/constants/subscription-marketing.constants';
import type { MarketingPlanTier } from '@/types/subscription-marketing.types';

// Selects which subscription tiers a pricing block renders. Lives here rather
// than in the section component because .tsx files are pure render
// composition — no filtering, no branching over domain data.
export function resolveMarketingPlanTiers(compact: boolean): ReadonlyArray<MarketingPlanTier> {
  if (!compact) {
    return MARKETING_PLAN_TIERS;
  }

  return MARKETING_PLAN_TIERS.filter((tier) => MARKETING_COMPACT_PLAN_SLUGS.includes(tier.slug));
}
