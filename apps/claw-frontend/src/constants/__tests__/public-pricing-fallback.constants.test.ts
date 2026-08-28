import { describe, expect, it } from 'vitest';

import { PUBLIC_PRICING_FALLBACK_PLANS } from '@/constants/public-pricing-fallback.constants';

// This snapshot renders the public pricing page whenever the catalog API cannot
// be reached, so an impossible shape here is a misleading claim shown to
// visitors at exactly the moment nobody is watching the API.
//
// The Free entry shipped as 300,000 tokens a day against a 20,000 weekly
// ceiling. The weekly cap binds on the first afternoon, so the daily figure —
// the one the card leads with — advertised fifteen times the allowance the
// account grants. The backend now refuses that shape on write; this keeps the
// offline copy honest too.
describe('public pricing fallback', () => {
  it('never lets a shorter window allow more than a longer one', () => {
    const broken = PUBLIC_PRICING_FALLBACK_PLANS.flatMap((plan) => {
      const rungs = [
        { label: 'daily', value: plan.dailyTokenQuota },
        { label: 'weekly', value: plan.weeklyTokenQuota },
        { label: 'monthly', value: plan.monthlyTokenQuota },
      ];
      return rungs.slice(0, -1).flatMap((shorter, index) => {
        const longer = rungs.at(index + 1);
        // null is unlimited and 0 is disabled; neither is a smaller number.
        if (
          longer === undefined ||
          shorter.value === null ||
          longer.value === null ||
          shorter.value === 0 ||
          longer.value === 0
        ) {
          return [];
        }
        return shorter.value > longer.value
          ? [`${plan.slug}: ${shorter.label} ${shorter.value} > ${longer.label} ${longer.value}`]
          : [];
      });
    });

    expect(broken).toEqual([]);
  });

  it('checks every plan, so an empty list cannot pass as clean', () => {
    expect(PUBLIC_PRICING_FALLBACK_PLANS.length).toBeGreaterThan(3);
  });

  it('keeps exactly one signup plan and one popular plan', () => {
    // The split is the whole point of the two flags: the plan a signup lands on
    // and the plan the card badges are separate decisions, and each is single.
    expect(PUBLIC_PRICING_FALLBACK_PLANS.filter((plan) => plan.isDefault)).toHaveLength(1);
    expect(PUBLIC_PRICING_FALLBACK_PLANS.filter((plan) => plan.isPopular)).toHaveLength(1);
  });
});
